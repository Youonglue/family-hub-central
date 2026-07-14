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
  };

  // 1. GET ALL ACTIVE REWARDS
  // Final Path: GET /api/rewards
  app.get("/", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      return db.prepare("SELECT * FROM rewards WHERE active = 1 ORDER BY points ASC").all();
    } catch (error) {
      console.error("❌ GET REWARDS ERROR:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // 2. CREATE NEW REWARD (Admin Only)
  // Final Path: POST /api/rewards
  app.post("/", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      // Authorization Check
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

  // 3. DELETE/INACTIVATE REWARD (Admin Only)
  // Final Path: DELETE /api/rewards/:id
  app.delete("/:id", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      // Authorization Check
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

  // 4. CLAIM/REDEEM REWARD (With automated balance verification check)
  // Final Path: POST /api/rewards/:id/claim
  app.post("/:id/claim", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      const rewardId = req.params.id;
      const { memberId } = req.body;

      // Fetch the selected reward
      const reward = db.prepare("SELECT * FROM rewards WHERE id = ? AND active = 1").get(rewardId) as any;
      if (!reward) {
        return reply.code(404).send({ error: "Reward not found or no longer active" });
      }

      // Fetch the member's current points balance
      const member = db.prepare(`
        SELECT 
          m.id as member_id, m.name,
          (COALESCE((SELECT SUM(points_awarded) FROM chore_completions WHERE member_id = m.id AND status = 'approved'), 0) - 
           COALESCE((SELECT SUM(points_spent) FROM redemptions WHERE member_id = m.id), 0)) as balance
        FROM family_members m WHERE m.id = ?
      `).get(memberId) as any;

      if (!member) {
        return reply.code(404).send({ error: "Family member not found" });
      }

      // Secure overdraft check
      if (member.balance < reward.points) {
        return reply.code(400).send({ 
          error: `Insufficent points! "${member.name}" has ${member.balance} pts, but "${reward.title}" costs ${reward.points} pts.` 
        });
      }

      // Perform points deduction by logging the redemption
      db.prepare(`
        INSERT INTO redemptions (id, reward_id, member_id, points_spent, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run(randomUUID(), rewardId, memberId, reward.points);

      // Broadcast changes across connections
      broadcast("points");
      broadcast("members");
      broadcast("rewards");
      
      return { success: true, balanceRemaining: member.balance - reward.points };
    } catch (error) {
      console.error("❌ CLAIM REWARD ERROR:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });
}
