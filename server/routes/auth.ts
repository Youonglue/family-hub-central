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
    return { ...user, role: user.role || 'user', has_pin: !!user.pin_hash };
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

  // Secure sign-out endpoint to delete session and clear browser cookie (Problem 1)
  app.post("/logout", async (req: any, reply: any) => {
    const token = req.headers.cookie?.match(/fh_sid=([^;]+)/)?.[1];
    if (token) {
      // Invalidate the session on the database side
      db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    }
    // Instruct client to clear the cookie
    reply.header("Set-Cookie", "fh_sid=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
    return { success: true };
  });

  app.post("/verify-pin", async (req: any, reply: any) => {
    const user = req.user; // Attached via index.ts gatekeeper
    if (!user?.pin_hash) return reply.code(400).send({ error: "No PIN set" });
    const [schema, salt, hash] = user.pin_hash.split("$");
    const attempt = scryptSync(req.body.pin, salt, 64).toString("hex");
    if (timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(attempt, "hex"))) return { success: true };
    return reply.code(401).send({ error: "Wrong PIN" });
  });

  app.post("/set-pin", async (req: any) => {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(req.body.pin, salt, 64).toString("hex");
    db.prepare(`UPDATE users SET pin_hash = ?, needs_pin_setup = 0 WHERE id = ?`).run(`scrypt$${salt}$${hash}`, req.user.id);
    return { success: true };
  });

  app.get("/users", async () => {
    return db.prepare("SELECT id, username, role FROM users").all();
  });

  // Added: pin-status endpoint to support secure lock/unlock states
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

// Replace the "/link-member" route in your /server/routes/auth.ts with this version:

  app.post("/link-member", async (req: any, reply: any) => {
    try {
      // 1. Authorization check
      if (!req.user || req.user.role !== 'admin') {
        return reply.code(403).send({ error: "Only administrators can link accounts" });
      }

      const { memberId, userId } = req.body;

      // 2. Self-Heal: Ensure the 'user_id' column exists in the family_members table
      try {
        db.prepare("ALTER TABLE family_members ADD COLUMN user_id TEXT").run();
        console.log("🛠️ Injected missing 'user_id' column into family_members table!");
      } catch (e) {
        // Ignore error if the column already exists
      }

      // 3. Ensure 1-to-1 association: unlink any previous link for this user first
      db.prepare("UPDATE family_members SET user_id = NULL WHERE user_id = ?").run(userId);

      if (memberId) {
        // Link the target family member to reference the user account
        db.prepare("UPDATE family_members SET user_id = ? WHERE id = ?").run(userId, memberId);

        // Copy user role to family_members for front-end query stability
        const user = db.prepare("SELECT role FROM users WHERE id = ?").get(userId) as any;
        if (user) {
          db.prepare("UPDATE family_members SET role = ? WHERE id = ?").run(user.role, memberId);
        }
      }

      return { success: true };
    } catch (error) {
      // Print the exact error directly to your server console so we can see it
      console.error("❌ LINK-MEMBER ERROR:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });
  // Updated promote route with correct table mapping
  app.post("/promote", async (req: any) => {
    const { userId } = req.body;
    let targetUserId = userId;
    
    // Resolve member ID to user ID if necessary
    try {
      const member = db.prepare("SELECT * FROM family_members WHERE id = ?").get(userId) as any;
      if (member && member.user_id) {
        targetUserId = member.user_id;
      }
    } catch (e) {
      // Ignore if database schema varies
    }

    // Sync both tables
    db.prepare("UPDATE users SET role = 'admin', is_admin = 1, needs_pin_setup = 1 WHERE id = ?").run(targetUserId);
    try {
      db.prepare("UPDATE family_members SET role = 'admin' WHERE id = ? OR user_id = ?").run(targetUserId, targetUserId);
    } catch (e) {
      // Ignore if database schema varies
    }

    return { success: true };
  });

  // Updated demote route with correct table mapping and single-admin fail-safe
  app.post("/demote", async (req: any, reply: any) => {
    // Authorization check
    if (!req.user || req.user.role !== 'admin') {
      return reply.code(403).send({ error: "Only administrators can demote users" });
    }

    const { userId } = req.body;
    let targetUserId = userId;

    // Resolve member ID to user ID if necessary
    try {
      const member = db.prepare("SELECT * FROM family_members WHERE id = ?").get(userId) as any;
      if (member && member.user_id) {
        targetUserId = member.user_id;
      }
    } catch (e) {
      // Ignore if database schema varies
    }

    // Prevent self-demotion
    if (req.user.id === targetUserId) {
      return reply.code(400).send({ error: "You cannot demote yourself" });
    }

    // Fail-safe: Check if this user is the last remaining administrator
    const adminCountResult = db.prepare(
      "SELECT COUNT(*) as count FROM users WHERE role = 'admin' OR is_admin = 1"
    ).get() as { count: number };

    if (adminCountResult.count <= 1) {
      return reply.code(400).send({ error: "Cannot demote the last remaining administrator." });
    }

    // Sync both tables on demotion
    db.prepare("UPDATE users SET role = 'user', is_admin = 0, pin_hash = NULL WHERE id = ?").run(targetUserId);
    try {
      db.prepare("UPDATE family_members SET role = 'user' WHERE id = ? OR user_id = ?").run(targetUserId, targetUserId);
    } catch (e) {
      // Ignore if database schema varies
    }
    
    return { success: true };
  });
}
