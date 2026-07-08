import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs"; 
import { randomBytes, scryptSync, timingSafeEqual, randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;
const DATA_DIR = path.join(__dirname, "../data");
mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "familyhub.db"));
db.pragma("journal_mode = WAL");

// 1. COMPLETE DATABASE SCHEMA
db.exec(`
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE, password_hash TEXT, pin_hash TEXT, is_admin INTEGER DEFAULT 0, created_at TEXT);
  CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT, expires_at TEXT);
  CREATE TABLE IF NOT EXISTS family_members (id TEXT PRIMARY KEY, name TEXT, avatar_color TEXT, is_kid INTEGER DEFAULT 1, is_parent INTEGER DEFAULT 0, created_at TEXT);
  CREATE TABLE IF NOT EXISTS chores (id TEXT PRIMARY KEY, title TEXT, points INTEGER, active INTEGER DEFAULT 1, created_at TEXT);
  CREATE TABLE IF NOT EXISTS chore_completions (id TEXT PRIMARY KEY, chore_id TEXT, member_id TEXT, points_awarded INTEGER, status TEXT DEFAULT 'pending', approved_by TEXT, approved_at TEXT, completed_at TEXT);
  CREATE TABLE IF NOT EXISTS shopping_items (id TEXT PRIMARY KEY, name TEXT, quantity TEXT, checked INTEGER DEFAULT 0, created_at TEXT);
  CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, title TEXT, starts_at TEXT, ends_at TEXT, location TEXT, color TEXT, member_id TEXT, created_at TEXT);
  CREATE TABLE IF NOT EXISTS recipes (id TEXT PRIMARY KEY, name TEXT, category TEXT, prep_time INTEGER, instructions TEXT, ingredients TEXT, image_url TEXT, created_at TEXT);
  CREATE TABLE IF NOT EXISTS meal_plan (id TEXT PRIMARY KEY, plan_date TEXT, meal TEXT, recipe_id TEXT, custom_name TEXT, created_at TEXT, UNIQUE(plan_date, meal));
  CREATE TABLE IF NOT EXISTS rewards (id TEXT PRIMARY KEY, title TEXT, cost INTEGER, active INTEGER DEFAULT 1);
  CREATE TABLE IF NOT EXISTS redemptions (id TEXT PRIMARY KEY, reward_id TEXT, member_id TEXT, points_spent INTEGER, redeemed_at TEXT);
  CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, member_id TEXT, content TEXT, created_at TEXT);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_plan_date_meal ON meal_plan(plan_date, meal);
`);

const app = Fastify({ logger: false });
await app.register(fastifyWebsocket);

// 2. REALTIME BROADCAST (Real-time Auto-Refresh)
const connections = new Set<any>();
function broadcast(topic: string) {
  const msg = JSON.stringify({ topic, at: Date.now() });
  for (const conn of connections) { try { conn.send(msg); } catch { connections.delete(conn); } }
}
app.get("/ws", { websocket: true }, (connection) => {
  connections.add(connection);
  connection.on("close", () => connections.delete(connection));
});

// Auth Helper
const getSession = (req: any) => {
  const token = req.headers.cookie?.match(/fh_sid=([^;]+)/)?.[1];
  if (!token) return null;
  return db.prepare(`SELECT u.* FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime('now')`).get(token) as any;
};

// 3. GATEKEEPER (Blocks Phone Bypass & Admin Only actions)
app.addHook("preHandler", async (req, reply) => {
  const url = req.url;
  const publicPaths = ["/api/auth/login", "/api/auth/register", "/api/auth/me"];
  if (!url.startsWith("/api") || publicPaths.some(p => url.startsWith(p))) return;

  const user = getSession(req);
  if (!user) return reply.code(401).send({ error: "Unauthorized" });

  const adminOnlyPaths = ["/api/members", "/api/users", "/api/auth/set-pin", "/api/chores", "/api/rewards"];
  const isWriteAction = ["POST", "DELETE", "PATCH"].includes(req.method);
  const isActionSubPath = url.endsWith("/complete") || url.endsWith("/redeem") || url.endsWith("/approve");

  if (adminOnlyPaths.some(p => url.startsWith(p)) && isWriteAction && !isActionSubPath && !user.is_admin) {
    return reply.code(403).send({ error: "Admin only" });
  }
});

app.register(fastifyStatic, { root: path.join(__dirname, "../dist"), prefix: "/" });

// --- 4. AUTH API ---
app.get("/api/auth/me", async (req) => {
  const user = getSession(req);
  const row = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
  return { id: user?.id || null, username: user?.username || null, is_admin: !!user?.is_admin, first_run: (row?.count || 0) === 0 };
});

app.post("/api/auth/register", async (req: any, reply) => {
  const { username, password } = req.body;
  const row = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
  const id = randomUUID();
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  db.prepare("INSERT INTO users (id, username, password_hash, is_admin, created_at) VALUES (?, ?, ?, ?, datetime('now'))").run(id, username, `scrypt$${salt}$${hash}`, row.count === 0 ? 1 : 0);
  
  const token = randomBytes(32).toString("hex");
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))").run(token, id);
  reply.header("Set-Cookie", `fh_sid=${token}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax`);
  return { success: true, id };
});

app.post("/api/auth/login", async (req: any, reply) => {
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

app.post("/api/auth/logout", async (req, reply) => {
  const token = req.headers.cookie?.match(/fh_sid=([^;]+)/)?.[1];
  if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  reply.header("Set-Cookie", "fh_sid=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax");
  return { success: true };
});

// --- 5. CHORES & POINTS (Approval System) ---
app.get("/api/chores", async () => db.prepare("SELECT * FROM chores WHERE active = 1 ORDER BY points DESC").all());
app.post("/api/chores", async (req: any) => {
  db.prepare("INSERT INTO chores (id, title, points, created_at) VALUES (?, ?, ?, datetime('now'))").run(randomUUID(), req.body.title, req.body.points);
  broadcast("chores"); return { success: true };
});
app.delete("/api/chores/:id", async (req: any) => {
  db.prepare("DELETE FROM chores WHERE id = ?").run(req.params.id);
  broadcast("chores"); return { success: true };
});

app.post("/api/chores/:id/complete", async (req: any) => {
  const chore = db.prepare("SELECT points FROM chores WHERE id = ?").get(req.params.id) as any;
  db.prepare("INSERT INTO chore_completions (id, chore_id, member_id, points_awarded, status, completed_at) VALUES (?, ?, ?, ?, 'pending', datetime('now'))").run(randomUUID(), req.params.id, req.body.member_id, chore.points);
  broadcast("points"); return { success: true };
});

app.get("/api/completions/pending", async () => {
  return db.prepare(`SELECT cc.*, c.title as chore_title, m.name as member_name FROM chore_completions cc JOIN chores c ON cc.chore_id = c.id JOIN family_members m ON cc.member_id = m.id WHERE cc.status = 'pending'`).all();
});

app.post("/api/completions/:id/approve", async (req: any) => {
  db.prepare("UPDATE chore_completions SET status = 'approved', approved_at = datetime('now') WHERE id = ?").run(req.params.id);
  broadcast("points"); return { success: true };
});

app.get("/api/points", async () => {
  return db.prepare(`
    SELECT m.id as member_id, m.name, m.avatar_color, m.is_kid,
    (COALESCE((SELECT SUM(points_awarded) FROM chore_completions WHERE member_id = m.id AND status = 'approved'), 0) - 
     COALESCE((SELECT SUM(points_spent) FROM redemptions WHERE member_id = m.id), 0)) as balance,
    (COALESCE((SELECT SUM(points_awarded) FROM chore_completions WHERE member_id = m.id AND status = 'approved'), 0) / 100) + 1 as level
    FROM family_members m ORDER BY balance DESC
  `).all();
});

// --- 6. REWARDS SHOP ---
app.get("/api/rewards", async () => db.prepare("SELECT * FROM rewards WHERE active = 1 ORDER BY cost ASC").all());
app.post("/api/rewards", async (req: any) => {
  db.prepare("INSERT INTO rewards (id, title, cost) VALUES (?, ?, ?)").run(randomUUID(), req.body.title, req.body.cost);
  broadcast("rewards"); return { success: true };
});
app.delete("/api/rewards/:id", async (req: any) => {
  db.prepare("DELETE FROM rewards WHERE id = ?").run(req.params.id);
  broadcast("rewards"); return { success: true };
});
app.post("/api/rewards/:id/redeem", async (req: any) => {
  const reward = db.prepare("SELECT cost FROM rewards WHERE id = ?").get(req.params.id) as any;
  db.prepare("INSERT INTO redemptions (id, reward_id, member_id, points_spent, redeemed_at) VALUES (?, ?, ?, ?, datetime('now'))").run(randomUUID(), req.params.id, req.body.member_id, reward.cost);
  broadcast("points"); return { success: true };
});

// --- 7. MEAL PLAN & RECIPES (Fixed Categorization) ---
app.get("/api/recipes", async (req: any) => {
  const cat = req.query.category;
  if (cat) return db.prepare("SELECT * FROM recipes WHERE category = ? COLLATE NOCASE ORDER BY name").all(cat);
  return db.prepare("SELECT * FROM recipes ORDER BY name").all();
});

app.get("/api/meal-plan", async () => {
  return db.prepare(`SELECT mp.*, r.name as recipe_name, r.category as recipe_category, r.ingredients as recipe_ingredients FROM meal_plan mp LEFT JOIN recipes r ON mp.recipe_id = r.id`).all();
});

app.post("/api/meal-plan", async (req: any) => {
  const date = req.body.plan_date.split('T')[0];
  db.prepare(`INSERT INTO meal_plan (id, plan_date, meal, recipe_id, created_at) VALUES (?, ?, ?, ?, datetime('now')) ON CONFLICT(plan_date, meal) DO UPDATE SET recipe_id = excluded.recipe_id`).run(randomUUID(), date, req.body.meal, req.body.recipe_id);
  broadcast("meal-plan"); return { success: true };
});

app.delete("/api/meal-plan/:id", async (req: any) => {
  db.prepare("DELETE FROM meal_plan WHERE id = ?").run(req.params.id);
  broadcast("meal-plan"); return { success: true };
});

app.post("/api/meal-plan/build-shopping", async (req: any) => {
  const f = req.body.from.split('T')[0], t = req.body.to.split('T')[0];
  const rows = db.prepare(`SELECT r.ingredients FROM meal_plan mp JOIN recipes r ON mp.recipe_id = r.id WHERE mp.plan_date BETWEEN ? AND ?`).all(f, t) as any[];
  for (const row of rows) {
    if (row.ingredients) row.ingredients.split(/[,\n]+/).forEach((ing: string) => { if (ing.trim()) db.prepare("INSERT INTO shopping_items (id, name, created_at) VALUES (?, ?, datetime('now'))").run(randomUUID(), ing.trim()); });
  }
  broadcast("shopping"); return { success: true, added: rows.length };
});

// --- 8. SHOPPING, MEMBERS, EVENTS & MESSAGES ---
app.get("/api/members", async () => db.prepare("SELECT * FROM family_members ORDER BY name").all());
app.post("/api/members", async (req: any) => {
  db.prepare("INSERT INTO family_members (id, name, avatar_color, is_kid, created_at) VALUES (?, ?, ?, ?, datetime('now'))").run(randomUUID(), req.body.name, req.body.avatar_color, req.body.is_kid ? 1 : 0);
  broadcast("members"); return { success: true };
});
app.delete("/api/members/:id", async (req: any) => {
  db.prepare("DELETE FROM family_members WHERE id = ?").run(req.params.id);
  broadcast("members"); return { success: true };
});

app.get("/api/shopping", async () => db.prepare("SELECT * FROM shopping_items ORDER BY checked ASC, created_at DESC").all());
app.post("/api/shopping", async (req: any) => {
  db.prepare("INSERT INTO shopping_items (id, name, created_at) VALUES (?, ?, datetime('now'))").run(randomUUID(), req.body.name);
  broadcast("shopping"); return { success: true };
});
app.patch("/api/shopping/:id", async (req: any) => {
  db.prepare("UPDATE shopping_items SET checked = ? WHERE id = ?").run(req.body.checked ? 1 : 0, req.params.id);
  broadcast("shopping"); return { success: true };
});
app.delete("/api/shopping/:id", async (req: any) => {
  db.prepare("DELETE FROM shopping_items WHERE id = ?").run(req.params.id);
  broadcast("shopping"); return { success: true };
});

app.get("/api/events/upcoming", async () => db.prepare("SELECT * FROM events WHERE starts_at >= datetime('now') ORDER BY starts_at ASC LIMIT 5").all());
app.post("/api/events", async (req: any) => {
  db.prepare("INSERT INTO events (id, title, starts_at, ends_at, location, color, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))").run(randomUUID(), req.body.title, req.body.starts_at, req.body.ends_at, req.body.location, req.body.color);
  broadcast("events"); return { success: true };
});

app.get("/api/messages", async () => db.prepare("SELECT m.*, f.name, f.avatar_color FROM messages m JOIN family_members f ON m.member_id = f.id ORDER BY m.created_at DESC LIMIT 10").all());
app.post("/api/messages", async (req: any) => {
  db.prepare("INSERT INTO messages (id, member_id, content, created_at) VALUES (?, ?, ?, datetime('now'))").run(randomUUID(), req.body.member_id, req.body.content);
  broadcast("messages"); return { success: true };
});

app.setNotFoundHandler((req, reply) => reply.sendFile("index.html"));
app.listen({ port: PORT, host: "0.0.0.0" }, () => console.log(`🚀 FORTRESS HUB ACTIVE ON PORT ${PORT}`));
