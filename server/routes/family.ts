import { randomUUID } from "node:crypto";
import { db } from "../db.js";

export default async function familyRoutes(app: any, opts: any) {
  app.get("/", async () => db.prepare("SELECT * FROM family_members ORDER BY name").all());
  app.post("/", async (req: any) => {
    db.prepare("INSERT INTO family_members (id, name, avatar_color, is_kid, created_at) VALUES (?,?,?,?,datetime('now'))")
      .run(randomUUID(), req.body.name, req.body.avatar_color, req.body.is_kid ? 1 : 0);
    opts.broadcast("members"); return { success: true };
  });
  app.patch("/:id", async (req: any) => {
    const { is_parent, avatar_url } = req.body;
    if (avatar_url !== undefined) db.prepare("UPDATE family_members SET avatar_url = ? WHERE id = ?").run(avatar_url, req.params.id);
    else db.prepare("UPDATE family_members SET is_parent = ? WHERE id = ?").run(is_parent ? 1 : 0, req.params.id);
    opts.broadcast("members"); return { success: true };
  });
  app.delete("/:id", async (req: any) => {
    db.prepare("DELETE FROM family_members WHERE id = ?").run(req.params.id);
    opts.broadcast("members"); return { success: true };
  });
}
