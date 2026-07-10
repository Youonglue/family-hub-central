import { randomUUID } from "node:crypto";
import { db } from "../db.js";

export default async function choreRoutes(app: any, opts: any) {
  const { broadcast } = opts;

  app.get("/chores", async () => db.prepare("SELECT * FROM chores WHERE active = 1 ORDER BY points DESC").all());
  app.post("/chores", async (req: any) => {
    db.prepare("INSERT INTO chores (id, title, points, created_at) VALUES (?,?,?,datetime('now'))").run(randomUUID(), req.body.title, req.body.points);
    broadcast("chores"); return { success: true };
  });
  app.delete("/chores/:id", async (req: any) => {
    db.prepare("DELETE FROM chores WHERE id = ?").run(req.params.id);
    broadcast("chores"); return { success: true };
  });

  // APPROVALS
  app.post("/chores/:id/complete", async (req: any) => {
    const chore = db.prepare("SELECT points FROM chores WHERE id = ?").get(req.params.id) as any;
    db.prepare("INSERT INTO chore_completions (id, chore_id, member_id, points_awarded, status, completed_at) VALUES (?,?,?,?,'pending',datetime('now'))").run(randomUUID(), req.params.id, req.body.member_id, chore.points);
    broadcast("completions"); return { success: true };
  });

  app.get("/completions/pending", async () => {
    return db.prepare(`SELECT cc.*, c.title as chore_title, m.name as member_name FROM chore_completions cc JOIN chores c ON cc.chore_id = c.id JOIN family_members m ON cc.member_id = m.id WHERE cc.status = 'pending'`).all();
  });

  app.post("/completions/:id/approve", async (req: any) => {
    db.prepare("UPDATE chore_completions SET status = 'approved', approved_at = datetime('now') WHERE id = ?").run(req.params.id);
    broadcast("points"); broadcast("completions"); return { success: true };
  });

  // POINTS LEADERBOARD (Try/Catch to prevent 500 errors)
  app.get("/points", async (req: any, reply: any) => {
    try {
      return db.prepare(`
        SELECT m.id as member_id, m.name, m.avatar_color, m.avatar_url, m.is_kid, m.is_parent,
        (COALESCE((SELECT SUM(points_awarded) FROM chore_completions WHERE member_id = m.id AND status = 'approved'), 0) - 
         COALESCE((SELECT SUM(points_spent) FROM redemptions WHERE member_id = m.id), 0)) as balance,
        (COALESCE((SELECT SUM(points_awarded) FROM chore_completions WHERE member_id = m.id AND status = 'approved'), 0) / 100) + 1 as level
        FROM family_members m ORDER BY balance DESC
      `).all();
    } catch (e) {
      console.error("Points calculation error:", e);
      return reply.code(500).send([]);
    }
  });
}
