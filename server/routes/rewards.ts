import { randomUUID } from "node:crypto";
import { db } from "../db.js";

export default async function rewardRoutes(app: any, opts: any) {
  const { broadcast } = opts;

  // Self-heal utility to ensure rewards and redemptions tables exist
  const ensureTablesExist = () => {
    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS rewards (
          id TEXT PRIMARY KEY,
          title TEXT,
          points INTEGER,
          active INTEGER DEFAULT 1,
          created_at TEXT
        )
      `).run();
    } catch (e) {}

    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS redemptions (
          id TEXT PRIMARY KEY,
          reward_id TEXT,
          member_id TEXT,
          points_spent INTEGER,
          created_at TEXT
        )
      `).run();
    } catch (e) {}

    try {
      db.prepare("ALTER TABLE redemptions ADD COLUMN status TEXT DEFAULT 'approved'").run();
    } catch (e) {}
    try {
      db.prepare("ALTER TABLE redemptions ADD COLUMN group_id TEXT").run();
    } catch (e) {}
    try {
      db.prepare("ALTER TABLE redemptions ADD COLUMN approved_at TEXT").run();
    } catch (e) {}

    // Self-heal: ensure notifications table exists
    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          member_id TEXT,
          title TEXT,
          message TEXT,
          type TEXT,
          created_at TEXT
        )
      `).run();
    } catch (e) {}
  };

  // Helper to write live notifications directly to the Adventure database log
  const logNotification = (memberId: string | null, title: string, message: string, type: string) => {
    try {
      db.prepare(`
        INSERT INTO notifications (id, member_id, title, message, type, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(randomUUID(), memberId, title, message, type);
    } catch (e) {
      console.error("❌ LOG NOTIFICATION ERROR:", e);
    }
  };

  const getApprovedBalance = (memberId: string): number => {
    const member = db.prepare(`
      SELECT 
        (COALESCE((SELECT SUM(points_awarded) FROM chore_completions WHERE member_id = m.id AND status = 'approved'), 0) - 
         COALESCE((SELECT SUM(points_spent) FROM redemptions WHERE member_id = m.id AND status = 'approved'), 0)) as balance
      FROM family_members m WHERE m.id = ?
    `).get(memberId) as any;
    return member ? member.balance : 0;
  };

  // 1. GET ALL ACTIVE REWARDS
  app.get("/", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      return db.prepare("SELECT * FROM rewards WHERE active = 1 ORDER BY points ASC").all();
    } catch (error) {
      console.error("❌ GET REWARDS ERROR:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // 2. CREATE NEW REWARD
  app.post("/", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      if (!req.user || req.user.role !== 'admin') {
        return reply.code(403).send({ error: "Only administrators can create shop rewards" });
      }

      const { title, points } = req.body;
      const pointsCost = parseInt(points);

      if (isNaN(pointsCost) || pointsCost <= 0) {
        return reply.code(400).send({ error: "Invalid points cost value" });
      }

      db.prepare("INSERT INTO rewards (id, title, points, active, created_at) VALUES (?, ?, ?, 1, datetime('now'))")
        .run(randomUUID(), title.trim(), pointsCost);

      broadcast("rewards");
      return { success: true };
    } catch (error) {
      console.error("❌ CREATE REWARD ERROR:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // 3. DELETE REWARD
  app.delete("/:id", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      if (!req.user || req.user.role !== 'admin') {
        return reply.code(403).send({ error: "Only administrators can remove shop rewards" });
      }

      db.prepare("UPDATE rewards SET active = 0 WHERE id = ?").run(req.params.id);
      
      broadcast("rewards");
      return { success: true };
    } catch (error) {
      console.error("❌ DELETE REWARD ERROR:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // 4. CLAIM/REDEEM REWARD
  app.post("/:id/claim", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      const rewardId = req.params.id;
      const { memberIds } = req.body;

      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        return reply.code(400).send({ error: "At least one family member must claim the reward" });
      }

      const reward = db.prepare("SELECT * FROM rewards WHERE id = ? AND active = 1").get(rewardId) as any;
      if (!reward) {
        return reply.code(404).send({ error: "Reward not found or no longer active" });
      }

      const splitCost = Math.ceil(reward.points / memberIds.length);
      const isCoOp = memberIds.length > 1;

      // Verify that every single contributor has enough points
      for (const memberId of memberIds) {
        const balance = getApprovedBalance(memberId);
        const memberName = (db.prepare("SELECT name FROM family_members WHERE id = ?").get(memberId) as any)?.name || "Hero";
        if (balance < splitCost) {
          return reply.code(400).send({
            error: `Insufficient points! "${memberName}" needs ${splitCost} pts, but only has ${balance} pts.`
          });
        }
      }

      const groupId = isCoOp ? randomUUID() : null;

      db.transaction(() => {
        for (const memberId of memberIds) {
          db.prepare(`
            INSERT INTO redemptions (id, reward_id, member_id, points_spent, status, group_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
          `).run(randomUUID(), rewardId, memberId, splitCost, isCoOp ? 'pending' : 'approved', groupId);
        }
      })();

      // Log the purchase milestones to the Adventure log
      if (isCoOp) {
        const contributorsNames = memberIds.map(mId => (db.prepare("SELECT name FROM family_members WHERE id = ?").get(mId) as any)?.name || "Hero").join(" & ");
        logNotification(
          null, 
          "Co-Op Purchase Requested! 👥", 
          `Joint claim requested for "${reward.title}" by ${contributorsNames} (${splitCost} pts each).`, 
          "reward"
        );
      } else {
        const memberName = (db.prepare("SELECT name FROM family_members WHERE id = ?").get(memberIds[0]) as any)?.name || "Hero";
        logNotification(
          memberIds[0], 
          "Reward Unlocked! 🎁", 
          `"${memberName}" redeemed points for "${reward.title}" (${splitCost} pts spent).`, 
          "reward"
        );
      }

      broadcast("points");
      broadcast("members");
      broadcast("rewards");
      broadcast("notifications");
      
      return { success: true, pending: isCoOp, splitCost };
    } catch (error) {
      console.error("❌ CLAIM REWARD ERROR:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // 5. GET ALL PENDING CO-OP REDEMPTIONS
  app.get("/redemptions/pending", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      if (!req.user || req.user.role !== 'admin') {
        return reply.code(403).send({ error: "Only administrators can view pending redemptions" });
      }

      return db.prepare(`
        SELECT 
          r.id as redemption_id, r.group_id, r.points_spent, r.created_at,
          m.id as member_id, m.name as member_name, m.avatar_color, m.avatar_icon,
          w.id as reward_id, w.title as reward_title, w.points as total_points
        FROM redemptions r
        JOIN family_members m ON r.member_id = m.id
        JOIN rewards w ON r.reward_id = w.id
        WHERE r.status = 'pending'
        ORDER BY r.created_at DESC
      `).all();
    } catch (error) {
      console.error("❌ GET PENDING REDEMPTIONS ERROR:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // 6. APPROVE PENDING CO-OP GROUP
  app.post("/redemptions/:groupId/approve", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      if (!req.user || req.user.role !== 'admin') {
        return reply.code(403).send({ error: "Only administrators can approve redemptions" });
      }

      const { groupId } = req.params;

      // Fetch details before approving to write log
      const pendingClaims = db.prepare("SELECT r.*, w.title as reward_title, m.name as member_name FROM redemptions r JOIN rewards w ON r.reward_id = w.id JOIN family_members m ON r.member_id = m.id WHERE r.group_id = ?").all(groupId) as any[];

      if (pendingClaims.length > 0) {
        db.prepare("UPDATE redemptions SET status = 'approved', approved_at = datetime('now') WHERE group_id = ?").run(groupId);
        
        const rewardTitle = pendingClaims[0].reward_title;
        const contributorsNames = pendingClaims.map(c => c.member_name).join(" & ");
        logNotification(
          null,
          "Co-Op Purchase Approved! 🎁",
          `Joint purchase of "${rewardTitle}" by ${contributorsNames} was approved by parent!`,
          "reward"
        );
      }

      broadcast("points");
      broadcast("members");
      broadcast("rewards");
      broadcast("notifications");
      return { success: true };
    } catch (error) {
      console.error("❌ APPROVE REDEMPTION ERROR:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // 7. REJECT PENDING CO-OP GROUP
  app.post("/redemptions/:groupId/reject", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      if (!req.user || req.user.role !== 'admin') {
        return reply.code(403).send({ error: "Only administrators can reject redemptions" });
      }

      const { groupId } = req.params;

      const pendingClaims = db.prepare("SELECT r.*, w.title as reward_title, m.name as member_name FROM redemptions r JOIN rewards w ON r.reward_id = w.id JOIN family_members m ON r.member_id = m.id WHERE r.group_id = ?").all(groupId) as any[];

      if (pendingClaims.length > 0) {
        db.prepare("DELETE FROM redemptions WHERE group_id = ? AND status = 'pending'").run(groupId);

        const rewardTitle = pendingClaims[0].reward_title;
        const contributorsNames = pendingClaims.map(c => c.member_name).join(" & ");
        logNotification(
          null,
          "Co-Op Purchase Canceled! ❌",
          `Joint purchase request for "${rewardTitle}" by ${contributorsNames} was canceled.`,
          "reward"
        );
      }

      broadcast("points");
      broadcast("members");
      broadcast("rewards");
      broadcast("notifications");
      return { success: true };
    } catch (error) {
      console.error("❌ REJECT REDEMPTION ERROR:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });
}
