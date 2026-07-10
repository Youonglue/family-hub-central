import { randomBytes, scryptSync, timingSafeEqual, randomUUID } from "node:crypto";
import { db } from "../db.js";

export default async function authRoutes(app: any) {
  
  const getSessionUser = (req: any) => {
    const token = req.headers.cookie?.match(/fh_sid=([^;]+)/)?.[1];
    if (!token) return null;
    return db.prepare(`SELECT u.* FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ?`).get(token) as any;
  };

  app.get("/me", async (req: any) => {
    const user = getSessionUser(req);
    const userCount = (db.prepare("SELECT COUNT(*) as n FROM users").get() as any).n;
    if (!user) return { id: null, role: 'guest', first_run: userCount === 0 };
    return user;
  });

  app.post("/register", async (req: any, reply: any) => {
    try {
      const { username, password } = req.body;
      const userCount = (db.prepare("SELECT COUNT(*) as n FROM users").get() as any).n;
      const isFirst = userCount === 0;

      const salt = randomBytes(16).toString("hex");
      const hash = scryptSync(password, salt, 64).toString("hex");
      const id = randomUUID();

      db.prepare(`
        INSERT INTO users (id, username, password_hash, is_admin, role, needs_pin_setup, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(id, username, `scrypt$${salt}$${hash}`, isFirst ? 1 : 0, isFirst ? 'admin' : 'user', 0);

      const token = randomBytes(32).toString("hex");
      db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))").run(token, id);
      reply.header("Set-Cookie", `fh_sid=${token}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax`);
      return { success: true };
    } catch (e) {
      console.error(e);
      return reply.code(500).send({ error: "Registration Failed" });
    }
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
    return reply.code(401).send({ error: "Invalid Credentials" });
  });

  app.get("/users", async (req: any, reply: any) => {
    if (req.user.role !== 'admin') return reply.code(403).send({ error: "Forbidden" });
    return db.prepare("SELECT id, username, role, needs_pin_setup FROM users").all();
  });

  app.post("/promote", async (req: any, reply: any) => {
    if (req.user.role !== 'admin') return reply.code(403).send({ error: "Forbidden" });
    const { userId } = req.body;
    db.prepare("UPDATE users SET role = 'admin', is_admin = 1, needs_pin_setup = 1 WHERE id = ?").run(userId);
    return { success: true };
  });

  app.post("/set-pin", async (req: any, reply: any) => {
    const { pin } = req.body;
    if (!/^\d{6}$/.test(pin)) return reply.code(400).send({ error: "PIN must be 6 digits" });
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(pin, salt, 64).toString("hex");
    db.prepare(`UPDATE users SET pin_hash = ?, needs_pin_setup = 0 WHERE id = ?`).run(`scrypt$${salt}$${hash}`, req.user.id);
    return { success: true };
  });

  app.post("/logout", async (req: any, reply: any) => {
    const token = req.headers.cookie?.match(/fh_sid=([^;]+)/)?.[1];
    if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    reply.header("Set-Cookie", "fh_sid=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
    return { success: true };
  });
}
