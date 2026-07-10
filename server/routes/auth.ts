import { randomBytes, scryptSync, timingSafeEqual, randomUUID } from "node:crypto";
import { db } from "../db.js";

export default async function authRoutes(app: any) {
  
  const getSessionUser = (req: any) => {
    const token = req.headers.cookie?.match(/fh_sid=([^;]+)/)?.[1];
    if (!token) return null;
    return db.prepare(`SELECT u.* FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ?`).get(token) as any;
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
    db.prepare("INSERT INTO users (id, username, password_hash, is_admin, created_at) VALUES (?,?,?,?,datetime('now'))").run(id, username, `scrypt$${salt}$${hash}`, isFirst ? 1 : 0);
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

  // --- PIN LOGIC (Fixed) ---
  app.get("/pin-status", async (req: any) => {
    const user = getSessionUser(req);
    return { has_pin: !!user?.pin_hash };
  });

  app.post("/set-pin", async (req: any) => {
    const user = getSessionUser(req);
    const { pin } = req.body;
    if (!/^\d{4}$/.test(pin)) throw new Error("PIN must be 4 digits");
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(pin, salt, 64).toString("hex");
    db.prepare(`UPDATE users SET pin_hash = ? WHERE id = ?`).run(`scrypt$${salt}$${hash}`, user.id);
    return { success: true };
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
  // Add these endpoints to your auth.ts
fastify.get('/users', async (request, reply) => {
  const user = (request as any).user;
  if (user.role !== 'admin') return reply.code(403).send({ error: "Admin only" });
  return db.prepare('SELECT id, name, role, needs_pin_setup FROM users').all();
});

fastify.post('/promote', async (request, reply) => {
  const admin = (request as any).user;
  if (admin.role !== 'admin') return reply.code(403).send({ error: "Unauthorized" });

  const { userId } = request.body as { userId: string };
  db.prepare("UPDATE users SET role = 'admin', needs_pin_setup = 1 WHERE id = ?").run(userId);
  return { success: true };
});

fastify.post('/set-pin', async (request, reply) => {
  const { pin } = request.body as { pin: string };
  const user = (request as any).user;
  
  if (pin.length !== 6) return reply.code(400).send({ error: "PIN must be 6 digits" });

  db.prepare("UPDATE users SET pin = ?, needs_pin_setup = 0 WHERE id = ?").run(pin, user.id);
  return { success: true };
});
}
