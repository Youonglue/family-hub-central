import { randomBytes, scryptSync, timingSafeEqual, randomUUID } from "node:crypto";
import { db } from "../db.js";

export default async function authRoutes(app: any) {
  const getSessionUser = (req: any) => {
    const token = req.headers.cookie?.match(/fh_sid=([^;]+)/)?.[1];
    if (!token) return null;
    return db.prepare(`SELECT u.* FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime('now')`).get(token) as any;
  };

  app.get("/me", async (req: any) => {
    const user = getSessionUser(req);
    const userCount = (db.prepare("SELECT COUNT(*) as n FROM users").get() as any).n;
    if (!user) return { id: null, role: 'guest', first_run: userCount === 0 };
    return { 
      ...user, 
      role: user.role || 'user', 
      has_pin: !!user.pin_hash,
      ntfy_topic: user.ntfy_topic || ""
    };
  });

  app.post("/register", async (req: any, reply: any) => {
    const { username, password } = req.body;
    const isFirst = (db.prepare("SELECT COUNT(*) as n FROM users").get() as any).n === 0;
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, 64).toString("hex");
    const id = randomUUID();
    
    db.prepare(`INSERT INTO users (id, username, password_hash, is_admin, role, created_at) VALUES (?,?,?,?,?,datetime('now'))`)
      .run(id, username, `scrypt$${salt}$${hash}`, isFirst ? 1 : 0, isFirst ? 'admin' : 'user');
    
    const token = randomBytes(32).toString("hex");
    db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))").run(token, id);
    reply.header("Set-Cookie", `fh_sid=${token}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax`);
    return { success: true };
  });

  app.post("/login", async (req: any, reply: any) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
    if (user && user.password_hash) {
      const [schema, salt, hash] = user.password_hash.split("$");
      const attempt = scryptSync(password, salt, 64).toString("hex");
      if (timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(attempt, "hex"))) {
        const token = randomBytes(32).toString("hex");
        db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))").run(token, user.id);
        reply.header("Set-Cookie", `fh_sid=${token}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax`);
        return { success: true };
      }
    }
    return reply.code(401).send({ error: "Invalid credentials" });
  });

  // Secure sign-out endpoint to delete session and clear browser cookie
  app.post("/logout", async (req: any, reply: any) => {
    const token = req.headers.cookie?.match(/fh_sid=([^;]+)/)?.[1];
    if (token) {
      db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    }
    reply.header("Set-Cookie", "fh_sid=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
    return { success: true };
  });

  // Updated verify-pin route to support multi-user Admin PIN validations and temporary 30s sessions
  app.post("/verify-pin", async (req: any, reply: any) => {
    const { userId, pin } = req.body;
    
    // Find the specific Admin account being unlocked
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
    if (!user || !user.pin_hash) {
      return reply.code(400).send({ error: "Selected account has no Admin PIN set" });
    }

    const [schema, salt, hash] = user.pin_hash.split("$");
    const attempt = scryptSync(pin, salt, 64).toString("hex");
    
    if (timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(attempt, "hex"))) {
      // SUCCESS! Create a temporary 30-second Admin session token
      const token = randomBytes(32).toString("hex");
      db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 seconds'))").run(token, user.id);
      
      // Set high-security cookie (Max-Age=30 seconds)
      reply.header("Set-Cookie", `fh_sid=${token}; Path=/; Max-Age=30; HttpOnly; SameSite=Lax`);
      return { success: true };
    }
    
    return reply.code(401).send({ error: "Wrong PIN" });
  });

  app.post("/set-pin", async (req: any) => {
    // Self-Heal: Ensure 'needs_pin_setup' column exists in the users table
    try {
      db.prepare("ALTER TABLE users ADD COLUMN needs_pin_setup INTEGER DEFAULT 0").run();
    } catch (e) {}

    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(req.body.pin, salt, 64).toString("hex");
    db.prepare(`UPDATE users SET pin_hash = ?, needs_pin_setup = 0 WHERE id = ?`).run(`scrypt$${salt}$${hash}`, req.user.id);
    return { success: true };
  });

  app.get("/users", async () => {
    return db.prepare("SELECT id, username, role FROM users").all();
  });

  // pin-status endpoint to support secure lock/unlock states
  app.get("/pin-status", async (req: any) => {
    try {
      const user = getSessionUser(req);
      if (!user) return { has_pin: false, needs_pin_setup: false };
      return { 
        has_pin: !!user.pin_hash, 
        needs_pin_setup: user.needs_pin_setup === 1 
      };
    } catch (e) {
      return { has_pin: false, needs_pin_setup: false };
    }
  });

  // --- SAVE MOBILE PUSH TOPIC (Admin Only) ---
  app.post("/set-ntfy-topic", async (req: any, reply: any) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return reply.code(403).send({ error: "Only administrators can configure push settings" });
      }

      // Self-Heal: Ensure 'ntfy_topic' column exists in users
      try {
        db.prepare("ALTER TABLE users ADD COLUMN ntfy_topic TEXT").run();
      } catch (e) {}

      const { topic } = req.body;
      db.prepare("UPDATE users SET ntfy_topic = ? WHERE id = ?").run(topic ? topic.trim() : null, req.user.id);

      return { success: true };
    } catch (error) {
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // link-member route with dual self-healing checks for both 'user_id' and 'role' columns
  app.post("/link-member", async (req: any, reply: any) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return reply.code(403).send({ error: "Only administrators can link accounts" });
      }

      const { memberId, userId } = req.body;

      try {
        db.prepare("ALTER TABLE family_members ADD COLUMN user_id TEXT").run();
      } catch (e) {}

      try {
        db.prepare("ALTER TABLE family_members ADD COLUMN role TEXT").run();
      } catch (e) {}

      db.prepare("UPDATE family_members SET user_id = NULL WHERE user_id = ?").run(userId);

      if (memberId) {
        db.prepare("UPDATE family_members SET user_id = ? WHERE id = ?").run(userId, memberId);

        const user = db.prepare("SELECT role FROM users WHERE id = ?").get(userId) as any;
        if (user) {
          db.prepare("UPDATE family_members SET role = ? WHERE id = ?").run(user.role, memberId);
        }
      }

      return { success: true };
    } catch (error) {
      console.error("❌ LINK-MEMBER ERROR:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  app.delete("/users/:id", async (req: any, reply: any) => {
    if (!req.user || req.user.role !== 'admin') {
      return reply.code(403).send({ error: "Only administrators can delete user accounts" });
    }

    const { id } = req.params;

    if (req.user.id === id) {
      return reply.code(400).send({ error: "You cannot delete your own account" });
    }

    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
    db.prepare("UPDATE family_members SET user_id = NULL, role = 'user' WHERE user_id = ?").run(id);

    return { success: true };
  });

  // Updated promote route with correct table mapping AND Admin authorization check
  app.post("/promote", async (req: any, reply: any) => {
    if (!req.user || req.user.role !== 'admin') {
      return reply.code(403).send({ error: "Only administrators can promote users" });
    }

    const { userId } = req.body;
    let targetUserId = userId;
    
    try {
      const member = db.prepare("SELECT * FROM family_members WHERE id = ?").get(userId) as any;
      if (member && member.user_id) {
        targetUserId = member.user_id;
      }
    } catch (e) {}

    db.prepare("UPDATE users SET role = 'admin', is_admin = 1, needs_pin_setup = 1 WHERE id = ?").run(targetUserId);
    try {
      db.prepare("UPDATE family_members SET role = 'admin' WHERE id = ? OR user_id = ?").run(targetUserId, targetUserId);
    } catch (e) {}

    return { success: true };
  });

  // Updated demote route with correct table mapping and single-admin fail-safe
  app.post("/demote", async (req: any, reply: any) => {
    if (!req.user || req.user.role !== 'admin') {
      return reply.code(403).send({ error: "Only administrators can demote users" });
    }

    const { userId } = req.body;
    let targetUserId = userId;

    try {
      const member = db.prepare("SELECT * FROM family_members WHERE id = ?").get(userId) as any;
      if (member && member.user_id) {
        targetUserId = member.user_id;
      }
    } catch (e) {}

    if (req.user.id === targetUserId) {
      return reply.code(400).send({ error: "You cannot demote yourself" });
    }

    const adminCountResult = db.prepare(
      "SELECT COUNT(*) as count FROM users WHERE role = 'admin' OR is_admin = 1"
    ).get() as { count: number };

    if (adminCountResult.count <= 1) {
      return reply.code(400).send({ error: "Cannot demote the last remaining administrator." });
    }

    db.prepare("UPDATE users SET role = 'user', is_admin = 0, pin_hash = NULL WHERE id = ?").run(targetUserId);
    try {
      db.prepare("UPDATE family_members SET role = 'user' WHERE id = ? OR user_id = ?").run(targetUserId, targetUserId);
    } catch (e) {}
    
    return { success: true };
  });

  // --- RETAINED: Your Custom Leaderboard Toggle Endpoint ---
  app.post("/toggle-leaderboard", async (req: any, reply: any) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return reply.code(403).send({ error: "Only administrators can modify leaderboard visibility" });
      }

      const { memberId, show } = req.body;

      try {
        db.prepare("ALTER TABLE family_members ADD COLUMN show_on_leaderboard INTEGER DEFAULT 1").run();
      } catch (e) {}

      db.prepare("UPDATE family_members SET show_on_leaderboard = ? WHERE id = ?").run(show ? 1 : 0, memberId);

      return { success: true };
    } catch (error) {
      return reply.code(500).send({ error: (error as Error).message });
    }
  });
}
