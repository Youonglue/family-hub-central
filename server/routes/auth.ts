import { randomBytes, scryptSync, timingSafeEqual, randomUUID } from "node:crypto";
import { db } from "../db.js";

export default async function authRoutes(app: any) {
  
  // Helper to get user from session cookie
  const getSessionUser = (req: any) => {
    const token = req.headers.cookie?.match(/fh_sid=([^;]+)/)?.[1];
    if (!token) return null;
    return db.prepare(`
      SELECT u.* FROM sessions s 
      JOIN users u ON s.user_id = u.id 
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `).get(token) as any;
  };

  // --- CORE AUTH ---
  app.get("/me", async (req: any) => {
    const user = getSessionUser(req);
    const userCount = (db.prepare("SELECT COUNT(*) as n FROM users").get() as any).n;
    if (!user) return { id: null, first_run: userCount === 0 };
    return { ...user, first_run: false, has_pin: !!user.pin_hash };
  });

  app.post("/register", async (req: any, reply: any) => {
    const { username, password } = req.body;
    const isFirst = (db.prepare("SELECT COUNT(*) as n FROM users").get() as any).n === 0;
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, 64).toString("hex");
    const id = randomUUID();
    
    // First user is Admin, others are 'User'
    db.prepare(`
      INSERT INTO users (id, username, password_hash, is_admin, role, created_at) 
      VALUES (?,?,?,?,?,datetime('now'))
    `).run(id, username, `scrypt$${salt}$${hash}`, isFirst ? 1 : 0, isFirst ? 'admin' : 'user');
    
    const token = randomBytes(32).toString("hex");
    db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))").run(token, id);
    reply.header("Set-Cookie", `fh_sid=${token}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax`);
    return { success: true };
  });

  app.post("/login", async (req: any, reply: any) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
    if (user) {
      const [schema, salt, hash] = user.password_hash.split("$");
      const attempt = scryptSync(password, salt, 64).toString("hex");
      if (timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(attempt, "hex"))) {
        const token = randomBytes(32).toString("hex");
        db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))").run(token, user.id);
        reply.header("Set-Cookie", `fh_sid=${token}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax`);
        return { success: true, id: user.id };
      }
    }
    return reply.code(401).send({ error: "Invalid credentials" });
  });

  app.post("/logout", async (req: any, reply: any) => {
    const token = req.headers.cookie?.match(/fh_sid=([^;]+)/)?.[1];
    if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    reply.header("Set-Cookie", "fh_sid=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax");
    return { success: true };
  });

  // --- ADMIN & PIN LOGIC ---
  
  // Fulfills "Known Users" requirement
  app.get("/users", async (req: any, reply: any) => {
    const user = getSessionUser(req);
    if (!user || user.role !== 'admin') return reply.code(403).send({ error: "Admin only" });
    return db.prepare('SELECT id, username, role, needs_pin_setup FROM users').all();
  });

  // Fulfills Admin Promotion requirement
  app.post("/promote", async (req: any, reply: any) => {
    const admin = getSessionUser(req);
    if (!admin || admin.role !== 'admin') return reply.code(403).send({ error: "Unauthorized" });

    const { userId } = req.body;
    db.prepare("UPDATE users SET role = 'admin', is_admin = 1, needs_pin_setup = 1 WHERE id = ?").run(userId);
    return { success: true };
  });

  // Fulfills 6-Digit PIN requirement
  app.post("/set-pin", async (req: any, reply: any) => {
    const user = getSessionUser(req);
    if (!user) return reply.code(401).send({ error: "Unauthorized" });
    
    const { pin } = req.body;
    // Enforce 6 digits exactly
    if (!/^\d{6}$/.test(pin)) return reply.code(400).send({ error: "PIN must be 6 digits" });

    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(pin, salt, 64).toString("hex");
    
    db.prepare(`
      UPDATE users 
      SET pin_hash = ?, needs_pin_setup = 0 
      WHERE id = ?
    `).run(`scrypt$${salt}$${hash}`, user.id);
    
    return { success: true };
  });

  app.get("/pin-status", async (req: any) => {
    const user = getSessionUser(req);
    return { has_pin: !!user?.pin_hash };
  });

  app.post("/verify-pin", async (req: any, reply: any) => {
    const user = getSessionUser(req);
    const { pin } = req.body;
    if (!user?.pin_hash) return reply.code(400).send({ error: "No PIN set" });
    const [schema, salt, hash] = user.pin_hash.split("$");
    const attempt = scryptSync(pin, salt, 64).toString("hex");
    if (timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(attempt, "hex"))) return { success: true };
    return reply.code(401).send({ error: "Wrong PIN" });
  });

  app.post("/clear-pin", async (req: any) => {
    const user = getSessionUser(req);
    db.prepare("UPDATE users SET pin_hash = NULL WHERE id = ?").run(user.id);
    return { success: true };
  });
}
