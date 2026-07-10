import { randomUUID } from "node:crypto";
import { db } from "../db.js";

export default async function familyRoutes(app: any, opts: any) {
  const { broadcast } = opts;

  app.get("/", async () => {
    return db.prepare("SELECT * FROM family_members ORDER BY name ASC").all();
  });

  app.patch("/:id", async (req: any, reply: any) => {
    const { id } = req.params;
    const { avatar_icon, avatar_color, name } = req.body;
    const user = req.user;

    const current = db.prepare("SELECT * FROM family_members WHERE id = ?").get(id) as any;
    if (!current) return reply.code(404).send({ error: "Member not found" });

    // Locked Name Logic
    if (name !== current.name && user.role !== 'admin') {
      return reply.code(403).send({ error: "Only admins can change hero names" });
    }

    db.prepare(`
      UPDATE family_members SET avatar_icon = ?, avatar_color = ?, name = ? WHERE id = ?
    `).run(avatar_icon || current.avatar_icon, avatar_color || current.avatar_color, name || current.name, id);

    broadcast("members");
    return { success: true };
  });
}
