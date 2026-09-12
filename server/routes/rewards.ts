// server/routes/rewards.ts
import crypto from "node:crypto";
import { db } from "../db.js";

export default async function rewardRoutes(app: any, opts: any) {
  const { broadcast } = opts;

  const ensureTablesExist = () => {
    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS rewards (
          id TEXT PRIMARY KEY,
          title TEXT,
          points INTEGER,
          active INTEGER DEFAULT 1,
          member_id TEXT,
          member_ids TEXT,
          is_shared INTEGER DEFAULT 0,
          category TEXT DEFAULT 'General',
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

    const injectReward = (col: string, type: string) => {
      try {
        db.prepare(`ALTER TABLE rewards ADD COLUMN ${col} ${type}`).run();
      } catch (e) {}
    };

    injectReward("member_id", "TEXT");
    injectReward("member_ids", "TEXT");
    injectReward("is_shared", "INTEGER DEFAULT 0");
    injectReward("category", "TEXT DEFAULT 'General'");

    try {
      db.prepare("ALTER TABLE redemptions ADD COLUMN status TEXT DEFAULT 'approved'").run();
    } catch (e) {}
    try {
      db.prepare("ALTER TABLE redemptions ADD COLUMN group_id TEXT").run();
    } catch (e) {}
    try {
      db.prepare("ALTER TABLE redemptions ADD COLUMN approved_at TEXT").run();
    } catch (e) {}

    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          member_id TEXT,
          entity_id TEXT,
          title TEXT,
          message TEXT,
          type TEXT,
          status TEXT DEFAULT 'approved',
          requested_at TEXT,
          approved_at TEXT,
          created_at TEXT
        )
      `).run();
    } catch (e) {}

    const injectNotif = (col: string, type: string) => {
      try { db.prepare(`ALTER TABLE notifications ADD COLUMN ${col} ${type}`).run(); } catch (e) {}
    };
    injectNotif("entity_id", "TEXT");
    injectNotif("status", "TEXT DEFAULT 'approved'");
    injectNotif("requested_at", "TEXT");
    injectNotif("approved_at", "TEXT");
  };

  // Helper to log or update notifications with lifecycle merging
  const logNotification = (
    memberId: string | null,
    title: string,
    message: string,
    type: string,
    entityId: string | null = null,
    status = "approved"
  ) => {
    try {
      if (entityId) {
        const existing = db.prepare("SELECT id FROM notifications WHERE entity_id = ?").get(entityId) as any;
        if (existing) {
          db.prepare(`
            UPDATE notifications 
            SET title = ?, message = ?, status = ?, approved_at = datetime('now')
            WHERE id = ?
          `).run(title, message, status, existing.id);
          return;
        }
      }

      db.prepare(`
        INSERT INTO notifications (id, member_id, entity_id, title, message, type, status, requested_at, approved_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, datetime('now'))
      `).run(
        crypto.randomUUID(), 
        memberId, 
        entityId, 
        title, 
        message, 
        type, 
        status, 
        status === 'approved' ? new Date().toISOString() : null
      );
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

  // 1. GET REWARDS
  app.get("/", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      const { memberId } = req.query || {};

      if (memberId) {
        return db.prepare(`
          SELECT r.*, m.name as assigned_member_name
          FROM rewards r
          LEFT JOIN family_members m ON r.member_id = m.id
          WHERE r.active = 1 
            AND (
              r.member_id = ? 
              OR r.member_ids LIKE '%' || ? || '%' 
              OR r.is_shared = 1
            )
          ORDER BY r.points ASC
        `).all(memberId, memberId);
      }

      return db.prepare(`
        SELECT r.*, m.name as assigned_member_name
        FROM rewards r
        LEFT JOIN family_members m ON r.member_id = m.id
        WHERE r.active = 1 
        ORDER BY r.points ASC
      `).all();
    } catch (error) {
      console.error("❌ GET REWARDS ERROR:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // 2. CREATE REWARD
  app.post("/", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      if (!req.user || req.user.role !== 'admin') {
        return reply.code(403).send({ error: "Only administrators can create shop rewards" });
      }

      const { title, points, member_id, member_ids, is_shared, category } = req.body;
      const pointsCost = parseInt(points);

      if (isNaN(pointsCost) || pointsCost <= 0) {
        return reply.code(400).send({ error: "Invalid points cost value" });
      }

      let singleMember: string | null = null;
      let jsonMemberIds: string | null = null;

      if (Array.isArray(member_ids) && member_ids.length > 0) {
        jsonMemberIds = JSON.stringify(member_ids);
        singleMember = member_ids.length === 1 ? member_ids[0] : null;
      } else if (member_id) {
        singleMember = String(member_id).trim();
        jsonMemberIds = JSON.stringify([singleMember]);
      }

      const rewardCategory = category ? String(category).trim() : "General";

      db.prepare(`
        INSERT INTO rewards (id, title, points, active, member_id, member_ids, is_shared, category, created_at) 
        VALUES (?, ?, ?, 1, ?, ?, ?, ?, datetime('now'))
      `).run(
        crypto.randomUUID(), 
        title.trim(), 
        pointsCost, 
        singleMember, 
        jsonMemberIds, 
        is_shared ? 1 : 0, 
        rewardCategory
      );

      broadcast("rewards");
      return { success: true };
    } catch (error) {
      console.error("❌ CREATE REWARD ERROR:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // 3. EDIT REWARD
  app.patch("/:id", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      if (!req.user || req.user.role !== 'admin') {
        return reply.code(403).send({ error: "Only administrators can edit rewards" });
      }

      const { title, points, member_id, member_ids, is_shared, category } = req.body;
      const rewardId = req.params.id;

      let singleMember: string | null = null;
      let jsonMemberIds: string | null = null;

      if (Array.isArray(member_ids)) {
        if (member_ids.length > 0) {
          jsonMemberIds = JSON.stringify(member_ids);
          singleMember = member_ids.length === 1 ? member_ids[0] : null;
        } else {
          jsonMemberIds = null;
          singleMember = null;
        }
      } else if (member_id !== undefined) {
        singleMember = member_id ? String(member_id).trim() : null;
        jsonMemberIds = singleMember ? JSON.stringify([singleMember]) : null;
      }

      db.prepare(`
        UPDATE rewards 
        SET title = COALESCE(?, title),
            points = COALESCE(?, points),
            member_id = ?,
            member_ids = ?,
            is_shared = COALESCE(?, is_shared),
            category = COALESCE(?, category)
        WHERE id = ?
      `).run(
        title ? title.trim() : null,
        points !== undefined ? Number(points) : null,
        singleMember,
        jsonMemberIds,
        is_shared !== undefined ? (is_shared ? 1 : 0) : null,
        category ? category.trim() : null,
        rewardId
      );

      broadcast("rewards");
      return { success: true };
    } catch (error) {
      console.error("❌ EDIT REWARD ERROR:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // 4. DELETE REWARD
  app.delete("/:id", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      db.prepare("UPDATE rewards SET active = 0 WHERE id = ?").run(req.params.id);
      broadcast("rewards");
      return { success: true };
    } catch (error) {
      console.error("❌ DELETE REWARD ERROR:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // 5. CLAIM REWARD (Creates notification stamped with requested_at)
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

      for (const memberId of memberIds) {
        const balance = getApprovedBalance(memberId);
        const memberName = (db.prepare("SELECT name FROM family_members WHERE id = ?").get(memberId) as any)?.name || "Hero";
        if (balance < splitCost) {
          return reply.code(400).send({
            error: `Insufficient points! "${memberName}" needs ${splitCost} pts, but only has ${balance} pts.`
          });
        }
      }

      const groupId = crypto.randomUUID();

      db.transaction(() => {
        for (const memberId of memberIds) {
          db.prepare(`
            INSERT INTO redemptions (id, reward_id, member_id, points_spent, status, group_id, created_at)
            VALUES (?, ?, ?, ?, 'pending', ?, datetime('now'))
          `).run(crypto.randomUUID(), rewardId, memberId, splitCost, groupId);
        }

        const contributorsNames = memberIds.map(mId => (db.prepare("SELECT name FROM family_members WHERE id = ?").get(mId) as any)?.name || "Hero").join(" & ");
        
        // Initial request notification stamped with requested_at and entity_id
        logNotification(
          isCoOp ? null : memberIds[0],
          isCoOp ? "Co-Op Purchase Requested ⏳" : "Reward Purchase Requested ⏳",
          isCoOp 
            ? `Joint claim requested for "${reward.title}" by ${contributorsNames} (${splitCost} pts each). Awaiting approval.` 
            : `"${contributorsNames}" requested redemption for "${reward.title}" (${splitCost} pts). Awaiting approval.`,
          "reward",
          groupId,
          "requested"
        );
      })();

      broadcast("points");
      broadcast("members");
      broadcast("rewards");
      broadcast("notifications");
      
      return { success: true, pending: true, splitCost };
    } catch (error) {
      console.error("❌ CLAIM REWARD ERROR:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // 6. GET PENDING REDEMPTIONS
  app.get("/redemptions/pending", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
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

  // 7. APPROVE REDEMPTION (MERGES WITH REQUESTED ENTRY IN ADVENTURE LOG)
  app.post("/redemptions/:groupId/approve", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      const { groupId } = req.params;

      const pendingClaims = db.prepare(`
        SELECT r.*, w.title as reward_title, m.name as member_name 
        FROM redemptions r 
        JOIN rewards w ON r.reward_id = w.id 
        JOIN family_members m ON r.member_id = m.id 
        WHERE r.group_id = ?
      `).all(groupId) as any[];

      if (pendingClaims.length > 0) {
        db.prepare("UPDATE redemptions SET status = 'approved', approved_at = datetime('now') WHERE group_id = ?").run(groupId);
        
        const rewardTitle = pendingClaims[0].reward_title;
        const contributorsNames = pendingClaims.map(c => c.member_name).join(" & ");
        const isCoOp = pendingClaims.length > 1;

        // MERGE: Updates the existing requested notification card with approval timestamp!
        logNotification(
          isCoOp ? null : pendingClaims[0].member_id,
          isCoOp ? "Co-Op Purchase Approved! 👥" : "Reward Purchase Approved! 🎁",
          isCoOp 
            ? `Joint purchase of "${rewardTitle}" by ${contributorsNames} was approved by parent!`
            : `"${contributorsNames}"'s purchase of "${rewardTitle}" was approved by parent!`,
          "reward",
          groupId,
          "approved"
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

  // 8. REJECT REDEMPTION
  app.post("/redemptions/:groupId/reject", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      const { groupId } = req.params;

      const pendingClaims = db.prepare(`
        SELECT r.*, w.title as reward_title, m.name as member_name 
        FROM redemptions r 
        JOIN rewards w ON r.reward_id = w.id 
        JOIN family_members m ON r.member_id = m.id 
        WHERE r.group_id = ?
      `).all(groupId) as any[];

      if (pendingClaims.length > 0) {
        db.prepare("DELETE FROM redemptions WHERE group_id = ? AND status = 'pending'").run(groupId);

        const rewardTitle = pendingClaims[0].reward_title;
        const contributorsNames = pendingClaims.map(c => c.member_name).join(" & ");
        const isCoOp = pendingClaims.length > 1;

        // Updates existing requested notification to canceled status
        logNotification(
          isCoOp ? null : pendingClaims[0].member_id,
          isCoOp ? "Co-Op Purchase Canceled! ❌" : "Reward Purchase Canceled! ❌",
          isCoOp
            ? `Joint purchase request for "${rewardTitle}" by ${contributorsNames} was canceled.`
            : `Purchase request for "${rewardTitle}" by ${contributorsNames} was canceled.`,
          "reward",
          groupId,
          "declined"
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
