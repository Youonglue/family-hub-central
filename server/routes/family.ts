import { randomUUID } from "node:crypto";
import { db } from "../db.js";

export default async function familyRoutes(app: any, opts: any) {
  const { broadcast } = opts;

  // Self-heal utility to ensure family_members and columns exist
  const ensureTablesExist = () => {
    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS family_members (
          id TEXT PRIMARY KEY,
          name TEXT,
          is_kid INTEGER DEFAULT 1,
          avatar_color TEXT,
          avatar_icon TEXT,
          level INTEGER DEFAULT 1,
          xp INTEGER DEFAULT 0,
          created_at TEXT
        )
      `).run();
    } catch (e) {}

    // Self-Heal: Ensure 'is_parent' column exists in SQLite
    try {
      db.prepare("ALTER TABLE family_members ADD COLUMN is_parent INTEGER DEFAULT 0").run();
    } catch (e) {}

    // Self-Heal: Ensure 'user_id' and 'role' exist
    try {
      db.prepare("ALTER TABLE family_members ADD COLUMN user_id TEXT").run();
    } catch (e) {}
    try {
      db.prepare("ALTER TABLE family_members ADD COLUMN role TEXT").run();
    } catch (e) {}
  };

  // 1. GET ALL HEROES
  app.get("/", async () => {
    ensureTablesExist();
    return db.prepare("SELECT * FROM family_members ORDER BY name ASC").all();
  });

  // 2. ADD NEW HERO (With is_parent column support)
  app.post("/", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      const { name, is_kid } = req.body;
      
      // Check if user is Admin
      if (!req.user || req.user.role !== 'admin') {
        return reply.code(403).send({ error: "Only an Admin can recruit family heroes" });
      }

      if (!name) return reply.code(400).send({ error: "Name is required" });

      const id = randomUUID();
      const isKidVal = is_kid ? 1 : 0;
      const isParentVal = is_kid ? 0 : 1; // If they are not a kid, they are a parent/adult

      db.prepare(`
        INSERT INTO family_members (id, name, is_kid, is_parent, avatar_color, avatar_icon, level, xp, created_at) 
        VALUES (?, ?, ?, ?, '#6366f1', 'Ghost', 1, 0, datetime('now'))
      `).run(id, name, isKidVal, isParentVal);
      
      broadcast("members");
      return { success: true, id };
    } catch (error) {
      console.error("❌ RECRUIT HERO ERROR:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // 3. Update Hero (Avatar, Color, and NAME)
  app.patch("/:id", async (req: any, reply: any) => {
    ensureTablesExist();
    const { id } = req.params;
    const { avatar_icon, avatar_color, name } = req.body;
    const user = req.user;

    const currentMember = db.prepare("SELECT * FROM family_members WHERE id = ?").get(id) as any;
    if (!currentMember) return reply.code(404).send({ error: "Hero not found" });

    // Allow name change ONLY if the requester is an admin
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

  // 3.5. Update Avatar Vector Configuration
  app.post("/:id/avatar", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      const { id } = req.params;
      const { avatar_config } = req.body;

      if (!avatar_config) {
        return reply.code(400).send({ error: "Avatar configuration is required" });
      }

      try {
        db.prepare("ALTER TABLE family_members ADD COLUMN avatar_config TEXT").run();
      } catch (e) {}

      const currentMember = db.prepare("SELECT * FROM family_members WHERE id = ?").get(id) as any;
      if (!currentMember) {
        return reply.code(404).send({ error: "Hero not found" });
      }

      const result = db.prepare("UPDATE family_members SET avatar_config = ? WHERE id = ?").run(avatar_config, id);
      
      if (broadcast) {
        broadcast("members");
      }
      
      return { success: true, changes: result.changes };
    } catch (err) {
      console.error("❌ SAVE AVATAR 500 ERROR:", err);
      return reply.code(500).send({ error: (err as Error).message });
    }
  });

  // 4. DELETE HERO
  app.delete("/:id", async (req: any) => {
    ensureTablesExist();
    db.prepare("DELETE FROM family_members WHERE id = ?").run(req.params.id);
    broadcast("members");
    return { success: true };
  });
}
