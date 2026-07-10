import { randomUUID } from "node:crypto";
import { db } from "../db.js";

export default async function choreRoutes(app: any, opts: any) {
  const { broadcast } = opts;

  // 1. GET ALL ACTIVE CHORES
  app.get("/chores", async () => {
    return db.prepare("SELECT * FROM chores WHERE active = 1 ORDER BY points DESC").all();
  });

  // 2. ADD NEW CHORE (Admin Muscle)
  app.post("/chores", async (req: any) => {
    const { title, points } = req.body;
    db.prepare("INSERT INTO chores (id, title, points, created_at) VALUES (?,?,?,datetime('now'))")
      .run(randomUUID(), title, points);
    broadcast("chores"); 
    return { success: true };
  });

  // 3. DELETE CHORE
  app.delete("/chores/:id", async (req: any) => {
    db.prepare("DELETE FROM chores WHERE id = ?").run(req.params.id);
    broadcast("chores"); 
    return { success: true };
  });

  // 4. COMPLETE CHORE (Moves to Pending)
  app.post("/chores/:id/complete", async (req: any) => {
    const chore = db.prepare("SELECT points FROM chores WHERE id = ?").get(req.params.id) as any;
    db.prepare(`
      INSERT INTO chore_completions (id, chore_id, member_id, points_awarded, status, completed_at) 
      VALUES (?, ?, ?, ?, 'pending', datetime('now'))
    `).run(randomUUID(), req.params.id, req.body.member_id, chore.points);
    
    broadcast("completions"); 
    return { success: true };
  });

  // 5. GET PENDING APPROVALS
  app.get("/completions/pending", async () => {
    return db.prepare(`
      SELECT cc.*, c.title as chore_title, m.name as member_name 
      FROM chore_completions cc 
      JOIN chores c ON cc.chore_id = c.id 
      JOIN family_members m ON cc.member_id = m.id 
      WHERE cc.status = 'pending'
    `).all();
  });

  // 6. APPROVE CHORE (The XP/Leveling Muscle)
  app.post("/completions/:id/approve", async (req: any, reply: any) => {
    const completionId = req.params.id;
    const comp = db.prepare("SELECT * FROM chore_completions WHERE id = ?").get(completionId) as any;
    
    if (!comp) return reply.code(404).send({ error: "Completion not found" });

    // MUSCLE: Atomic Transaction to ensure XP and Status stay in sync
    db.transaction(() => {
      // Mark as approved
      db.prepare("UPDATE chore_completions SET status = 'approved', approved_at = datetime('now') WHERE id = ?")
        .run(completionId);
      
      // Update Hero XP and Level (100 XP = 1 Level)
      db.prepare(`
        UPDATE family_members 
        SET xp = xp + ?, 
            level = 1 + ((xp + ?) / 100) 
        WHERE id = ?
      `).run(comp.points_awarded, comp.points_awarded, comp.member_id);
    })();

    broadcast("points"); 
    broadcast("completions"); 
    broadcast("members"); // Updates the level badges across the house
    return { success: true };
  });

  // 7. POINTS LEADERBOARD (High-Performance Calculation)
  app.get("/points", async (req: any, reply: any) => {
    try {
      return db.prepare(`
        SELECT 
          m.id as member_id, 
          m.name, 
          m.avatar_color, 
          m.avatar_icon,
          m.xp,
          m.level,
          m.is_kid, 
          m.is_parent,
          (COALESCE((SELECT SUM(points_awarded) FROM chore_completions WHERE member_id = m.id AND status = 'approved'), 0) - 
           COALESCE((SELECT SUM(points_spent) FROM redemptions WHERE member_id = m.id), 0)) as balance
        FROM family_members m 
        ORDER BY m.xp DESC
      `).all();
    } catch (e) {
      console.error("Leaderboard calculation failed:", e);
      return reply.code(500).send([]);
    }
  });
}
