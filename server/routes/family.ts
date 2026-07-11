import { randomUUID } from "node:crypto";
import { db } from "../db.js";

export default async function familyRoutes(app: any, opts: any) {
  const { broadcast } = opts;

  // 1. GET ALL HEROES
  app.get("/", async () => {
    return db.prepare("SELECT * FROM family_members ORDER BY name ASC").all();
  });

  // 2. ADD NEW HERO (The missing recruitment logic)
  app.post("/", async (req: any, reply: any) => {
    const { name, is_kid } = req.body;
    
    // Check if user is Admin (The Muscle)
    if (!req.user || req.user.role !== 'admin') {
      return reply.code(403).send({ error: "Only an Admin can recruit heroes" });
    }

    if (!name) return reply.code(400).send({ error: "Name is required" });

    const id = randomUUID();
    db.prepare(`
      INSERT INTO family_members (id, name, is_kid, avatar_color, avatar_icon, level, xp, created_at) 
      VALUES (?, ?, ?, '#6366f1', 'Ghost', 1, 0, datetime('now'))
    `).run(id, name, is_kid ? 1 : 0);
    
    broadcast("members");
    return { success: true, id };
  });

  // 3. Update Hero (Avatar, Color, and NAME)
  app.patch("/:id", async (req: any, reply: any) => {
    const { id } = req.params;
    const { avatar_icon, avatar_color, name } = req.body;
    const user = req.user; // User object from the Gatekeeper muscle

    const currentMember = db.prepare("SELECT * FROM family_members WHERE id = ?").get(id) as any;
    if (!currentMember) return reply.code(404).send({ error: "Hero not found" });

    // FIX: Allow name change ONLY if the requester is an admin
    if (name && name !== currentMember.name) {
      if (user.role?.toLowerCase() !== 'admin') {
        return reply.code(403).send({ error: "Only an Admin can rename heroes!" });
      }
    }

    db.prepare(`
      UPDATE family_members 
      SET avatar_icon = ?, avatar_color = ?, name = ? 
      WHERE id = ?
    `).run(
      avatar_icon || currentMember.avatar_icon, 
      avatar_color || currentMember.avatar_color, 
      name || currentMember.name, 
      id
    );

    broadcast("members");
    return { success: true };
  });

  // 4. DELETE HERO
  app.delete("/:id", async (req: any) => {
    db.prepare("DELETE FROM family_members WHERE id = ?").run(req.params.id);
    broadcast("members");
    return { success: true };
  });
}
