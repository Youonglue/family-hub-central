// server/routes/family.ts
import { randomUUID } from "node:crypto";
import { db } from "../db.js";

export default async function familyRoutes(app: any, opts: any) {
  const { broadcast } = opts;

  const ensureTablesExist = () => {
    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS family_members (
          id TEXT PRIMARY KEY,
          name TEXT,
          is_kid INTEGER DEFAULT 1,
          is_parent INTEGER DEFAULT 0,
          avatar_color TEXT,
          avatar_icon TEXT,
          level INTEGER DEFAULT 1,
          xp INTEGER DEFAULT 0,
          created_at TEXT
        )
      `).run();
    } catch (e) {}

    const inject = (col: string, type: string) => {
      try {
        db.prepare(`ALTER TABLE family_members ADD COLUMN ${col} ${type}`).run();
      } catch (e) {}
    };

    inject("user_id", "TEXT");
    inject("role", "TEXT DEFAULT 'user'");
    inject("avatar_config", "TEXT");
    inject("show_on_leaderboard", "INTEGER DEFAULT 1");
    inject("show_on_dashboard", "INTEGER DEFAULT 1");
    inject("show_on_chores", "INTEGER DEFAULT 1");
    inject("show_on_rewards", "INTEGER DEFAULT 1");
    inject("show_on_kiosk", "INTEGER DEFAULT 1");
  };

  // 1. GET ALL HEROES
  app.get("/", async () => {
    ensureTablesExist();
    return db.prepare("SELECT * FROM family_members ORDER BY name ASC").all();
  });

  // 2. ADD NEW HERO
  app.post("/", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      const { name, is_kid } = req.body;
      
      if (!req.user || req.user.role !== 'admin') {
        return reply.code(403).send({ error: "Only an Admin can recruit family heroes" });
      }

      if (!name) return reply.code(400).send({ error: "Name is required" });

      const id = randomUUID();
      const isKidVal = is_kid ? 1 : 0;
      const isParentVal = is_kid ? 0 : 1;

      db.prepare(`
        INSERT INTO family_members (
          id, name, is_kid, is_parent, avatar_color, avatar_icon, level, xp, 
          show_on_dashboard, show_on_leaderboard, show_on_chores, show_on_rewards, show_on_kiosk, created_at
        ) 
        VALUES (?, ?, ?, ?, '#6366f1', 'Ghost', 1, 0, 1, 1, 1, 1, 1, datetime('now'))
      `).run(id, name, isKidVal, isParentVal);
      
      broadcast("members");
      return { success: true, id };
    } catch (error) {
      console.error("❌ RECRUIT HERO ERROR:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // 3. UPDATE HERO VISIBILITY TOGGLES (Admin Only - Synchronizes Leaderboard & Dashboard flags)
  app.post("/visibility", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      if (!req.user || req.user.role !== 'admin') {
        return reply.code(403).send({ error: "Only administrators can modify visibility settings" });
      }

      const { memberId, section, visible } = req.body;
      const allowedSections = ["show_on_dashboard", "show_on_chores", "show_on_rewards", "show_on_kiosk", "show_on_leaderboard"];
      
      if (!allowedSections.includes(section)) {
        return reply.code(400).send({ error: "Invalid section specified" });
      }

      const val = visible ? 1 : 0;

      // If updating dashboard, update both show_on_dashboard and show_on_leaderboard
      if (section === "show_on_dashboard" || section === "show_on_leaderboard") {
        db.prepare(`
          UPDATE family_members 
          SET show_on_dashboard = ?, show_on_leaderboard = ? 
          WHERE id = ?
        `).run(val, val, memberId);
      } else {
        db.prepare(`UPDATE family_members SET ${section} = ? WHERE id = ?`).run(val, memberId);
      }
      
      broadcast("members");
      broadcast("points");
      return { success: true };
    } catch (error) {
      console.error("❌ VISIBILITY UPDATE ERROR:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // 4. Update Hero (Avatar, Color, and Name)
  app.patch("/:id", async (req: any, reply: any) => {
    ensureTablesExist();
    const { id } = req.params;
    const { avatar_icon, avatar_color, name } = req.body;
    const user = req.user;

    const currentMember = db.prepare("SELECT * FROM family_members WHERE id = ?").get(id) as any;
    if (!currentMember) return reply.code(404).send({ error: "Hero not found" });

    if (name && name !== currentMember.name) {
      if (user?.role?.toLowerCase() !== 'admin') {
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

  // 5. Update Avatar Vector Configuration
  app.post("/:id/avatar", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      const { id } = req.params;
      const { avatar_config } = req.body;

      if (!avatar_config) {
        return reply.code(400).send({ error: "Avatar configuration is required" });
      }

      const currentMember = db.prepare("SELECT * FROM family_members WHERE id = ?").get(id) as any;
      if (!currentMember) {
        return reply.code(404).send({ error: "Hero not found" });
      }

      const result = db.prepare("UPDATE family_members SET avatar_config = ? WHERE id = ?").run(avatar_config, id);
      broadcast("members");
      
      return { success: true, changes: result.changes };
    } catch (err) {
      console.error("❌ SAVE AVATAR ERROR:", err);
      return reply.code(500).send({ error: (err as Error).message });
    }
  });

  // 6. DELETE HERO
  app.delete("/:id", async (req: any) => {
    ensureTablesExist();
    if (!req.user || req.user.role !== 'admin') {
      return reply.code(403).send({ error: "Only administrators can delete heroes" });
    }

    db.prepare("DELETE FROM family_members WHERE id = ?").run(req.params.id);
    broadcast("members");
    return { success: true };
  });
}
