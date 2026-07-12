import { randomUUID } from "node:crypto";
import { db } from "../db.js";

export default async function choreRoutes(app: any, opts: any) {
  const { broadcast } = opts;

  // Self-heal utility to ensure all tables exist before querying
  const ensureTablesExist = () => {
    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS chores (
          id TEXT PRIMARY KEY,
          title TEXT,
          points INTEGER,
          active INTEGER,
          created_at TEXT
        )
      `).run();
    } catch (e) {}

    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS chore_completions (
          id TEXT PRIMARY KEY,
          chore_id TEXT,
          member_id TEXT,
          points_awarded INTEGER,
          status TEXT,
          completed_at TEXT,
          approved_at TEXT
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

  // 1. GET ALL ACTIVE CHORES
  // Final Path: GET /api/chores
  app.get("/", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      return db.prepare("SELECT * FROM chores WHERE active = 1 ORDER BY points DESC").all();
    } catch (e) {
      console.error("❌ GET CHORES ERROR:", e);
      return [];
    }
  });

  // 2. ADD NEW CHORE
  // Final Path: POST /api/chores
  app.post("/", async (req: any) => {
    ensureTablesExist();
    const { title, points } = req.body;
    db.prepare("INSERT INTO chores (id, title, points, active, created_at) VALUES (?, ?, ?, 1, datetime('now'))")
      .run(randomUUID(), title, points);
    
    broadcast("chores"); 
    return { success: true };
  });

  // 3. DELETE CHORE
  // Final Path: DELETE /api/chores/:id
  app.delete("/:id", async (req: any) => {
    ensureTablesExist();
    db.prepare("UPDATE chores SET active = 0 WHERE id = ?").run(req.params.id);
    broadcast("chores"); 
    return { success: true };
  });

  // 4. COMPLETE CHORE (Kid side)
  // Final Path: POST /api/chores/:id/complete
  app.post("/:id/complete", async (req: any) => {
    ensureTablesExist();
    const chore = db.prepare("SELECT points FROM chores WHERE id = ?").get(req.params.id) as any;
    db.prepare(`
      INSERT INTO chore_completions (id, chore_id, member_id, points_awarded, status, completed_at) 
      VALUES (?, ?, ?, ?, 'pending', datetime('now'))
    `).run(randomUUID(), req.params.id, req.body.member_id, chore.points);
    
    broadcast("completions"); 
    return { success: true };
  });

  // 5. GET PENDING APPROVALS
  // Final Path: GET /api/chores/completions/pending
  app.get("/completions/pending", async () => {
    ensureTablesExist();
    return db.prepare(`
      SELECT cc.*, c.title as chore_title, m.name as member_name 
      FROM chore_completions cc 
      JOIN chores c ON cc.chore_id = c.id 
      JOIN family_members m ON cc.member_id = m.id 
      WHERE cc.status = 'pending'
    `).all();
  });

  // 6. APPROVE CHORE (Award XP)
  // Final Path: POST /api/chores/completions/:id/approve
  app.post("/completions/:id/approve", async (req: any, reply: any) => {
    ensureTablesExist();
    const completionId = req.params.id;
    const comp = db.prepare("SELECT * FROM chore_completions WHERE id = ?").get(completionId) as any;
    
    if (!comp) return reply.code(404).send({ error: "Completion not found" });

    db.transaction(() => {
      db.prepare("UPDATE chore_completions SET status = 'approved', approved_at = datetime('now') WHERE id = ?")
        .run(completionId);
      
      db.prepare(`
        UPDATE family_members 
        SET xp = xp + ?, 
            level = 1 + ((xp + ?) / 100) 
        WHERE id = ?
      `).run(comp.points_awarded, comp.points_awarded, comp.member_id);
    })();

    broadcast("points"); 
    broadcast("completions"); 
    broadcast("members"); 
    return { success: true };
  });

  // 7. POINTS LEADERBOARD (Safe and Try-Capped to prevent 500 crashes)
  // Final Path: GET /api/chores/points
  app.get("/points", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      return db.prepare(`
          SELECT 
            m.id as member_id, m.name, m.avatar_color, m.avatar_icon, m.xp, m.level, m.is_kid, m.is_parent,
            (COALESCE((SELECT SUM(points_awarded) FROM chore_completions WHERE member_id = m.id AND status = 'approved'), 0) - 
             COALESCE((SELECT SUM(points_spent) FROM redemptions WHERE member_id = m.id), 0)) as balance
          FROM family_members m 
          ORDER BY m.xp DESC
      `).all();
    } catch (error) {
      console.error("❌ CHORES LEADERBOARD ERROR:", error);
      
      // Safe Fallback: if there's any lingering query issue, return standard values without balance math to prevent 500 crash
      try {
        return db.prepare(`
          SELECT id as member_id, name, avatar_color, avatar_icon, xp, level, is_kid, is_parent, 0 as balance
          FROM family_members
          ORDER BY xp DESC
        `).all();
      } catch (err) {
        return [];
      }
    }
  });
}
