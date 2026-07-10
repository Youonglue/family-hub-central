import { randomUUID } from "node:crypto";
import { db } from "../db.js";

export default async function rewardRoutes(app: any, opts: any) {
  app.get("/", async () => db.prepare("SELECT * FROM rewards WHERE active = 1 ORDER BY cost ASC").all());
  app.post("/", async (req: any) => {
    db.prepare("INSERT INTO rewards (id, title, cost) VALUES (?,?,?)").run(randomUUID(), req.body.title, req.body.cost);
    opts.broadcast("rewards"); return { success: true };
  });
  app.post("/:id/redeem", async (req: any) => {
    const reward = db.prepare("SELECT cost FROM rewards WHERE id = ?").get(req.params.id) as any;
    db.prepare("INSERT INTO redemptions (id, reward_id, member_id, points_spent, redeemed_at) VALUES (?,?,?,?,datetime('now'))").run(randomUUID(), req.params.id, req.body.member_id, reward.cost);
    opts.broadcast("points"); return { success: true };
  });
  app.get("/points", async () => db.prepare(`SELECT m.id as member_id, m.name, m.avatar_color, m.avatar_url, m.is_kid, m.is_parent, (COALESCE((SELECT SUM(points_awarded) FROM chore_completions WHERE member_id = m.id AND status = 'approved'), 0) - COALESCE((SELECT SUM(points_spent) FROM redemptions WHERE member_id = m.id), 0)) as balance FROM family_members m ORDER BY balance DESC`).all());
}
