// Family Hub — self-hosted Node server (Fastify + better-sqlite3 + WebSocket).
// One process serves the SPA, the /api, and the /ws live-sync feed.
// Everything stays on your LAN — no cloud, no Supabase.
//
// Storage:  <project>/data/familyhub.db  (override with DATA_DIR)
// Static:   <project>/dist               (override with STATIC_DIR)

import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";
import Database from "better-sqlite3";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const DATA_DIR = process.env.DATA_DIR || resolve(__dirname, "..", "data");
const DB_PATH = process.env.DB_PATH || join(DATA_DIR, "familyhub.db");
// Vite/TanStack Start emits the client bundle to dist/client/. Fall back to
// .output/public (Nitro preset) then dist/ so this works regardless of preset.
const STATIC_DIR = process.env.STATIC_DIR || [
  resolve(__dirname, "..", "dist", "client"),
  resolve(__dirname, "..", ".output", "public"),
  resolve(__dirname, "..", "dist"),
].find((p) => existsSync(join(p, "assets"))) || resolve(__dirname, "..", "dist", "client");
const SESSION_TTL_DAYS = 30;

// -----------------------------------------------------------------------------
// Database
// -----------------------------------------------------------------------------
mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(readFileSync(join(__dirname, "schema.sql"), "utf8"));

// Idempotent column upgrades for older databases.
function ensureColumn(table, col, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.find((c) => c.name === col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}
ensureColumn("family_members", "is_parent", "is_parent INTEGER NOT NULL DEFAULT 0");
ensureColumn("chore_completions", "status", "status TEXT NOT NULL DEFAULT 'approved'");
ensureColumn("chore_completions", "approved_by", "approved_by TEXT");
ensureColumn("chore_completions", "approved_at", "approved_at TEXT");
ensureColumn("users", "pin_hash", "pin_hash TEXT");

const now = () => new Date().toISOString();
const uid = () => randomUUID();

// -----------------------------------------------------------------------------
// Password hashing (scrypt from node:crypto — no native deps)
// -----------------------------------------------------------------------------
function hashPassword(password) {
  const salt = randomBytes(16);
  const key = scryptSync(String(password), salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}
function verifyPassword(password, stored) {
  const [scheme, saltHex, keyHex] = String(stored || "").split("$");
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(keyHex, "hex");
  const derived = scryptSync(String(password), salt, expected.length);
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

// -----------------------------------------------------------------------------
// Session helpers
// -----------------------------------------------------------------------------
function newSession(userId) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 86400_000).toISOString();
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(token, userId, expires);
  return { token, expires };
}
function readSession(cookieHeader) {
  const m = /(?:^|;\s*)fh_sid=([^;]+)/.exec(cookieHeader || "");
  if (!m) return null;
  const token = decodeURIComponent(m[1]);
  const row = db.prepare(
    `SELECT u.id, u.username, u.is_admin, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = ?`,
  ).get(token);
  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  return { token, id: row.id, username: row.username, is_admin: !!row.is_admin };
}
function setSessionCookie(reply, token) {
  const maxAge = SESSION_TTL_DAYS * 86400;
  reply.header("set-cookie", `fh_sid=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`);
}
function clearSessionCookie(reply) {
  reply.header("set-cookie", `fh_sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}
function userCount() {
  return db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
}

// -----------------------------------------------------------------------------
// Fastify + WS
// -----------------------------------------------------------------------------
const app = Fastify({ logger: { level: "info" }, bodyLimit: 25 * 1024 * 1024 });
await app.register(fastifyWebsocket);

const sockets = new Set();
function broadcast(topic) {
  const msg = JSON.stringify({ topic, at: Date.now() });
  for (const ws of sockets) { try { ws.send(msg); } catch { /* client gone */ } }
}
function broadcastAll() {
  for (const t of ["members", "points", "chores", "completions", "rewards", "shopping", "recipes", "meal-plan", "events"]) broadcast(t);
}

// -----------------------------------------------------------------------------
// Auth gate: every /api/* request (except /api/auth/*) requires a session.
// -----------------------------------------------------------------------------
const PUBLIC_PATHS = new Set(["/api/health", "/api/auth/me", "/api/auth/login", "/api/auth/register", "/api/auth/logout"]);

app.addHook("onRequest", async (req, reply) => {
  const url = req.url.split("?")[0];
  if (!url.startsWith("/api/")) return;
  if (PUBLIC_PATHS.has(url)) return;
  const session = readSession(req.headers.cookie);
  if (!session) return reply.code(401).send({ error: "Not signed in" });
  req.session = session;
});

// -----------------------------------------------------------------------------
// Auth endpoints
// -----------------------------------------------------------------------------
app.get("/api/health", async () => ({ ok: true, version: "2.0.0" }));

app.get("/api/auth/me", async (req, reply) => {
  const session = readSession(req.headers.cookie);
  if (!session) return reply.code(401).send({ error: "Not signed in", first_run: userCount() === 0 });
  return { id: session.id, username: session.username, is_admin: session.is_admin, first_run: false };
});

app.post("/api/auth/register", async (req, reply) => {
  const { username, password } = req.body || {};
  const u = String(username || "").trim();
  const p = String(password || "");
  if (u.length < 2 || u.length > 40) return reply.code(400).send({ error: "Username must be 2–40 characters." });
  if (p.length < 6) return reply.code(400).send({ error: "Password must be at least 6 characters." });

  const totalUsers = userCount();
  // First user creates the admin. After that, only an admin can add new users.
  if (totalUsers > 0) {
    const session = readSession(req.headers.cookie);
    if (!session || !session.is_admin) {
      return reply.code(403).send({ error: "Only the admin can create new accounts. Ask them to sign you up." });
    }
  }
  const existing = db.prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE").get(u);
  if (existing) return reply.code(409).send({ error: "That username is taken." });

  const id = uid();
  const isAdmin = totalUsers === 0 ? 1 : 0;
  db.prepare("INSERT INTO users (id, username, password_hash, is_admin, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(id, u, hashPassword(p), isAdmin, now());

  // Auto-sign-in the first user; otherwise the admin stays signed in.
  if (totalUsers === 0) {
    const { token } = newSession(id);
    setSessionCookie(reply, token);
    return { id, username: u, is_admin: true, first_run: false };
  }
  return { id, username: u, is_admin: false, first_run: false };
});

app.post("/api/auth/login", async (req, reply) => {
  const { username, password } = req.body || {};
  const u = String(username || "").trim();
  const p = String(password || "");
  const row = db.prepare("SELECT id, username, password_hash, is_admin FROM users WHERE username = ? COLLATE NOCASE").get(u);
  if (!row || !verifyPassword(p, row.password_hash)) {
    return reply.code(401).send({ error: "Wrong username or password." });
  }
  const { token } = newSession(row.id);
  setSessionCookie(reply, token);
  return { id: row.id, username: row.username, is_admin: !!row.is_admin, first_run: false };
});

app.post("/api/auth/logout", async (req, reply) => {
  const m = /(?:^|;\s*)fh_sid=([^;]+)/.exec(req.headers.cookie || "");
  if (m) db.prepare("DELETE FROM sessions WHERE token = ?").run(decodeURIComponent(m[1]));
  clearSessionCookie(reply);
  return { ok: true };
});

// -----------------------------------------------------------------------------
// Family members
// -----------------------------------------------------------------------------
app.get("/api/members", async () =>
  db.prepare("SELECT * FROM family_members ORDER BY sort_order, created_at").all(),
);

app.post("/api/members", async (req, reply) => {
  const { name, avatar_color, is_kid, is_parent } = req.body || {};
  if (!name || !avatar_color) return reply.code(400).send({ error: "name and avatar_color required" });
  const existing = db.prepare("SELECT COUNT(*) AS n FROM family_members").get().n;
  const row = {
    id: uid(),
    name: String(name).slice(0, 60),
    avatar_color: String(avatar_color).slice(0, 20),
    is_kid: is_kid ? 1 : 0,
    is_parent: is_parent ? 1 : (existing === 0 ? 1 : (is_kid ? 0 : 1)),
    sort_order: 0,
    created_at: now(),
  };
  db.prepare(
    "INSERT INTO family_members (id,name,avatar_color,is_kid,is_parent,sort_order,created_at) VALUES (@id,@name,@avatar_color,@is_kid,@is_parent,@sort_order,@created_at)",
  ).run(row);
  broadcast("members");
  return row;
});

app.patch("/api/members/:id", async (req, reply) => {
  const { is_parent } = req.body || {};
  if (is_parent === undefined) return reply.code(400).send({ error: "is_parent required" });
  db.prepare("UPDATE family_members SET is_parent = ? WHERE id = ?").run(is_parent ? 1 : 0, req.params.id);
  broadcast("members");
  return { ok: true };
});

app.delete("/api/members/:id", async (req) => {
  db.prepare("DELETE FROM family_members WHERE id = ?").run(req.params.id);
  broadcast("members"); broadcast("points");
  return { ok: true };
});

// -----------------------------------------------------------------------------
// Points / leaderboard (only APPROVED completions count)
// -----------------------------------------------------------------------------
app.get("/api/points", async () =>
  db.prepare(
    `SELECT m.id AS member_id, m.name, m.avatar_color, m.is_kid, m.is_parent,
            COALESCE(earned.pts, 0) - COALESCE(spent.pts, 0)  AS balance,
            COALESCE(earned.week_pts, 0)                     AS week_points
     FROM family_members m
     LEFT JOIN (
       SELECT member_id,
              SUM(points_awarded) AS pts,
              SUM(CASE WHEN completed_at >= datetime('now','-7 days') THEN points_awarded ELSE 0 END) AS week_pts
       FROM chore_completions WHERE status = 'approved' GROUP BY member_id
     ) earned ON earned.member_id = m.id
     LEFT JOIN (
       SELECT member_id, SUM(points_spent) AS pts FROM redemptions GROUP BY member_id
     ) spent ON spent.member_id = m.id
     ORDER BY balance DESC`,
  ).all(),
);

// -----------------------------------------------------------------------------
// Chores
// -----------------------------------------------------------------------------
app.get("/api/chores", async () =>
  db.prepare("SELECT * FROM chores WHERE active = 1 ORDER BY created_at DESC").all(),
);

app.post("/api/chores", async (req, reply) => {
  const { title, points, member_id, recurrence } = req.body || {};
  if (!title || !points) return reply.code(400).send({ error: "title and points required" });
  const row = {
    id: uid(),
    title: String(title).slice(0, 120),
    points: Number(points),
    member_id: member_id || null,
    recurrence: ["daily", "weekly", "once"].includes(recurrence) ? recurrence : "daily",
    active: 1,
    created_at: now(),
  };
  db.prepare(
    "INSERT INTO chores (id,title,points,member_id,recurrence,active,created_at) VALUES (@id,@title,@points,@member_id,@recurrence,@active,@created_at)",
  ).run(row);
  broadcast("chores");
  return row;
});

app.delete("/api/chores/:id", async (req) => {
  db.prepare("UPDATE chores SET active = 0 WHERE id = ?").run(req.params.id);
  broadcast("chores");
  return { ok: true };
});

// Kid marks a chore done → PENDING, no points until a parent approves.
app.post("/api/chores/:id/complete", async (req, reply) => {
  const { member_id } = req.body || {};
  if (!member_id) return reply.code(400).send({ error: "member_id required" });
  const chore = db.prepare("SELECT points FROM chores WHERE id = ?").get(req.params.id);
  if (!chore) return reply.code(404).send({ error: "chore not found" });
  db.prepare(
    "INSERT INTO chore_completions (id,chore_id,member_id,points_awarded,status,completed_at) VALUES (?,?,?,?,?,?)",
  ).run(uid(), req.params.id, member_id, chore.points, "pending", now());
  broadcast("chores"); broadcast("completions"); broadcast("points");
  return { ok: true, points: chore.points, status: "pending" };
});

app.get("/api/completions/pending", async () =>
  db.prepare(
    `SELECT cc.id, cc.points_awarded, cc.completed_at, cc.status,
            c.title AS chore_title,
            m.name  AS member_name, m.avatar_color AS member_color
     FROM chore_completions cc
     JOIN chores c         ON c.id = cc.chore_id
     JOIN family_members m ON m.id = cc.member_id
     WHERE cc.status = 'pending'
     ORDER BY cc.completed_at ASC`,
  ).all(),
);

app.post("/api/completions/:id/approve", async (req, reply) => {
  const { approver_id } = req.body || {};
  if (!approver_id) return reply.code(400).send({ error: "approver_id required" });
  const parent = db.prepare("SELECT is_parent FROM family_members WHERE id = ?").get(approver_id);
  if (!parent || !parent.is_parent) return reply.code(403).send({ error: "Only approvers can approve." });
  const r = db.prepare(
    "UPDATE chore_completions SET status = 'approved', approved_by = ?, approved_at = ? WHERE id = ? AND status = 'pending'",
  ).run(approver_id, now(), req.params.id);
  if (r.changes === 0) return reply.code(404).send({ error: "Not pending" });
  broadcast("completions"); broadcast("points"); broadcast("chores");
  return { ok: true };
});

app.post("/api/completions/:id/reject", async (req, reply) => {
  const { approver_id } = req.body || {};
  if (!approver_id) return reply.code(400).send({ error: "approver_id required" });
  const parent = db.prepare("SELECT is_parent FROM family_members WHERE id = ?").get(approver_id);
  if (!parent || !parent.is_parent) return reply.code(403).send({ error: "Only approvers can reject." });
  db.prepare(
    "UPDATE chore_completions SET status = 'rejected', approved_by = ?, approved_at = ?, points_awarded = 0 WHERE id = ? AND status = 'pending'",
  ).run(approver_id, now(), req.params.id);
  broadcast("completions"); broadcast("points");
  return { ok: true };
});

app.get("/api/completions/recent", async () =>
  db.prepare(
    `SELECT cc.id, cc.points_awarded, cc.completed_at, cc.status,
            c.title AS chore_title,
            m.name  AS member_name, m.avatar_color AS member_color
     FROM chore_completions cc
     JOIN chores c         ON c.id = cc.chore_id
     JOIN family_members m ON m.id = cc.member_id
     WHERE cc.status = 'approved'
     ORDER BY cc.completed_at DESC LIMIT 20`,
  ).all(),
);

// -----------------------------------------------------------------------------
// Rewards
// -----------------------------------------------------------------------------
app.get("/api/rewards", async () =>
  db.prepare("SELECT * FROM rewards WHERE active = 1 ORDER BY cost_points").all(),
);
app.post("/api/rewards", async (req, reply) => {
  const { title, cost_points } = req.body || {};
  if (!title || !cost_points) return reply.code(400).send({ error: "title and cost_points required" });
  const row = { id: uid(), title: String(title).slice(0, 120), cost_points: Number(cost_points), icon: null, active: 1, created_at: now() };
  db.prepare(
    "INSERT INTO rewards (id,title,cost_points,icon,active,created_at) VALUES (@id,@title,@cost_points,@icon,@active,@created_at)",
  ).run(row);
  broadcast("rewards");
  return row;
});
app.delete("/api/rewards/:id", async (req) => {
  db.prepare("UPDATE rewards SET active = 0 WHERE id = ?").run(req.params.id);
  broadcast("rewards");
  return { ok: true };
});
app.post("/api/rewards/:id/redeem", async (req, reply) => {
  const { member_id } = req.body || {};
  if (!member_id) return reply.code(400).send({ error: "member_id required" });
  const reward = db.prepare("SELECT cost_points FROM rewards WHERE id = ?").get(req.params.id);
  if (!reward) return reply.code(404).send({ error: "reward not found" });
  const bal = db.prepare(
    `SELECT COALESCE((SELECT SUM(points_awarded) FROM chore_completions WHERE member_id = ? AND status = 'approved'),0)
           - COALESCE((SELECT SUM(points_spent)     FROM redemptions       WHERE member_id = ?),0) AS balance`,
  ).get(member_id, member_id);
  if ((bal?.balance ?? 0) < reward.cost_points) return reply.code(400).send({ error: "Not enough points" });
  db.prepare(
    "INSERT INTO redemptions (id,reward_id,member_id,points_spent,redeemed_at) VALUES (?,?,?,?,?)",
  ).run(uid(), req.params.id, member_id, reward.cost_points, now());
  broadcast("rewards"); broadcast("points");
  return { ok: true };
});

// -----------------------------------------------------------------------------
// Shopping
// -----------------------------------------------------------------------------
app.get("/api/shopping", async () =>
  db.prepare("SELECT * FROM shopping_items ORDER BY checked ASC, created_at DESC").all(),
);
app.post("/api/shopping", async (req, reply) => {
  const { name, quantity, category } = req.body || {};
  if (!name) return reply.code(400).send({ error: "name required" });
  const row = {
    id: uid(), name: String(name).slice(0, 120),
    quantity: quantity ? String(quantity).slice(0, 60) : null,
    category: category ? String(category).slice(0, 40) : "general",
    checked: 0, checked_at: null, created_at: now(),
  };
  db.prepare(
    "INSERT INTO shopping_items (id,name,quantity,category,checked,checked_at,created_at) VALUES (@id,@name,@quantity,@category,@checked,@checked_at,@created_at)",
  ).run(row);
  broadcast("shopping");
  return row;
});
app.patch("/api/shopping/:id", async (req) => {
  const { checked } = req.body || {};
  db.prepare("UPDATE shopping_items SET checked = ?, checked_at = ? WHERE id = ?")
    .run(checked ? 1 : 0, checked ? now() : null, req.params.id);
  broadcast("shopping");
  return { ok: true };
});
app.delete("/api/shopping/:id", async (req) => {
  db.prepare("DELETE FROM shopping_items WHERE id = ?").run(req.params.id);
  broadcast("shopping");
  return { ok: true };
});
app.post("/api/shopping/clear-checked", async () => {
  db.prepare("DELETE FROM shopping_items WHERE checked = 1").run();
  broadcast("shopping");
  return { ok: true };
});

// -----------------------------------------------------------------------------
// Recipes + meal plan
// -----------------------------------------------------------------------------
app.get("/api/recipes", async () =>
  db.prepare("SELECT * FROM recipes ORDER BY name").all().map((r) => ({ ...r, ingredients: safeJson(r.ingredients, []) })),
);
app.post("/api/recipes", async (req, reply) => {
  const { name, notes, ingredients } = req.body || {};
  if (!name) return reply.code(400).send({ error: "name required" });
  const row = {
    id: uid(), name: String(name).slice(0, 120),
    notes: notes ? String(notes).slice(0, 2000) : null,
    ingredients: JSON.stringify(Array.isArray(ingredients) ? ingredients : []),
    created_at: now(),
  };
  db.prepare(
    "INSERT INTO recipes (id,name,notes,ingredients,created_at) VALUES (@id,@name,@notes,@ingredients,@created_at)",
  ).run(row);
  broadcast("recipes");
  return { ...row, ingredients: safeJson(row.ingredients, []) };
});
app.delete("/api/recipes/:id", async (req) => {
  db.prepare("DELETE FROM recipes WHERE id = ?").run(req.params.id);
  broadcast("recipes"); broadcast("meal-plan");
  return { ok: true };
});
app.get("/api/meal-plan", async (req) => {
  const { from, to } = req.query || {};
  const rows = db.prepare(
    `SELECT mp.*, r.name AS recipe_name, r.ingredients AS recipe_ingredients
     FROM meal_plan mp LEFT JOIN recipes r ON r.id = mp.recipe_id
     WHERE mp.plan_date BETWEEN ? AND ? ORDER BY mp.plan_date`,
  ).all(from || "1900-01-01", to || "2999-12-31");
  return rows.map((r) => ({
    ...r,
    recipes: r.recipe_name ? { id: r.recipe_id, name: r.recipe_name, ingredients: safeJson(r.recipe_ingredients, []) } : null,
  }));
});
app.post("/api/meal-plan", async (req, reply) => {
  const { plan_date, meal, recipe_id, custom_name } = req.body || {};
  if (!plan_date || !meal) return reply.code(400).send({ error: "plan_date and meal required" });
  db.prepare(
    `INSERT INTO meal_plan (id,plan_date,meal,recipe_id,custom_name,created_at) VALUES (?,?,?,?,?,?)
     ON CONFLICT(plan_date, meal) DO UPDATE SET recipe_id = excluded.recipe_id, custom_name = excluded.custom_name`,
  ).run(uid(), plan_date, meal, recipe_id || null, custom_name || null, now());
  broadcast("meal-plan");
  return { ok: true };
});
app.delete("/api/meal-plan/:id", async (req) => {
  db.prepare("DELETE FROM meal_plan WHERE id = ?").run(req.params.id);
  broadcast("meal-plan");
  return { ok: true };
});
app.post("/api/meal-plan/build-shopping", async (req) => {
  const { from, to } = req.body || {};
  const rows = db.prepare(
    `SELECT r.ingredients FROM meal_plan mp JOIN recipes r ON r.id = mp.recipe_id
     WHERE mp.plan_date BETWEEN ? AND ?`,
  ).all(from, to);
  const merged = new Map();
  for (const r of rows) {
    for (const ing of safeJson(r.ingredients, [])) {
      if (!ing?.name) continue;
      const key = String(ing.name).trim().toLowerCase();
      if (!key) continue;
      const existing = merged.get(key);
      if (existing) {
        if (ing.quantity && !existing.quantity.includes(ing.quantity)) {
          existing.quantity = existing.quantity ? `${existing.quantity} + ${ing.quantity}` : String(ing.quantity);
        }
      } else merged.set(key, { name: ing.name, quantity: ing.quantity || "" });
    }
  }
  const insert = db.prepare(
    "INSERT INTO shopping_items (id,name,quantity,category,checked,checked_at,created_at) VALUES (?,?,?,?,0,NULL,?)",
  );
  const tx = db.transaction((items) => { for (const it of items) insert.run(uid(), it.name, it.quantity || null, "meal-plan", now()); });
  const items = [...merged.values()];
  tx(items);
  broadcast("shopping");
  return { added: items.length };
});

// -----------------------------------------------------------------------------
// Events
// -----------------------------------------------------------------------------
app.get("/api/events", async () =>
  db.prepare(
    `SELECT e.*, m.name AS member_name, m.avatar_color AS member_color
     FROM events e LEFT JOIN family_members m ON m.id = e.member_id ORDER BY starts_at`,
  ).all(),
);
app.get("/api/events/upcoming", async () =>
  db.prepare(
    `SELECT e.*, m.name AS member_name, m.avatar_color AS member_color
     FROM events e LEFT JOIN family_members m ON m.id = e.member_id
     WHERE starts_at >= datetime('now') ORDER BY starts_at LIMIT 6`,
  ).all(),
);
app.post("/api/events", async (req, reply) => {
  const { title, starts_at, ends_at, location, member_id, color } = req.body || {};
  if (!title || !starts_at) return reply.code(400).send({ error: "title and starts_at required" });
  const row = {
    id: uid(), title: String(title).slice(0, 120), starts_at,
    ends_at: ends_at || null,
    location: location ? String(location).slice(0, 120) : null,
    member_id: member_id || null, color: color || "sky", created_at: now(),
  };
  db.prepare(
    "INSERT INTO events (id,title,starts_at,ends_at,location,member_id,color,created_at) VALUES (@id,@title,@starts_at,@ends_at,@location,@member_id,@color,@created_at)",
  ).run(row);
  broadcast("events");
  return row;
});
app.delete("/api/events/:id", async (req) => {
  db.prepare("DELETE FROM events WHERE id = ?").run(req.params.id);
  broadcast("events");
  return { ok: true };
});

// -----------------------------------------------------------------------------
// Backup export / import (client-side encrypted .fhb bundles)
// -----------------------------------------------------------------------------
const BACKUP_TABLES = [
  "family_members", "chores", "chore_completions", "rewards", "redemptions",
  "shopping_items", "recipes", "meal_plan", "events",
];

app.get("/api/backup/export", async () => {
  const tables = {};
  for (const t of BACKUP_TABLES) tables[t] = db.prepare(`SELECT * FROM ${t}`).all();
  return { version: 1, exported_at: now(), mode: "selfhost", tables };
});

app.post("/api/backup/import", async (req, reply) => {
  const { bundle, mode } = req.body || {};
  if (!bundle || !bundle.tables) return reply.code(400).send({ error: "bundle.tables required" });
  const wipe = mode === "replace";
  const tx = db.transaction(() => {
    if (wipe) {
      for (const t of ["chore_completions", "redemptions", "meal_plan", "events", "shopping_items", "chores", "rewards", "recipes", "family_members"]) {
        db.prepare(`DELETE FROM ${t}`).run();
      }
    }
    for (const t of BACKUP_TABLES) {
      const rows = bundle.tables[t];
      if (!Array.isArray(rows) || rows.length === 0) continue;
      const info = db.prepare(`PRAGMA table_info(${t})`).all();
      const colNames = info.map((c) => c.name);
      for (const row of rows) {
        const cols = colNames.filter((c) => c in row);
        if (cols.length === 0) continue;
        const placeholders = cols.map(() => "?").join(",");
        const values = cols.map((c) => {
          const v = row[c];
          if (v === null || v === undefined) return null;
          if (typeof v === "object") return JSON.stringify(v);
          if (typeof v === "boolean") return v ? 1 : 0;
          return v;
        });
        const sql = wipe
          ? `INSERT INTO ${t} (${cols.join(",")}) VALUES (${placeholders})`
          : `INSERT OR IGNORE INTO ${t} (${cols.join(",")}) VALUES (${placeholders})`;
        try { db.prepare(sql).run(...values); } catch { /* skip malformed rows */ }
      }
    }
  });
  tx();
  broadcastAll();
  return { ok: true };
});

// -----------------------------------------------------------------------------
// WebSocket (unauthenticated — read-only invalidation pings, no data payload)
// -----------------------------------------------------------------------------
app.register(async (instance) => {
  instance.get("/ws", { websocket: true }, (socket) => {
    sockets.add(socket);
    socket.send(JSON.stringify({ topic: "hello", at: Date.now() }));
    socket.on("close", () => sockets.delete(socket));
    socket.on("error", () => sockets.delete(socket));
  });
});

// -----------------------------------------------------------------------------
// Static SPA + SPA fallback
// -----------------------------------------------------------------------------
// The Vite build emits hashed assets into <STATIC_DIR>/assets/index-*.{js,css}
// but no top-level index.html (TanStack Start does SSR by default). We generate
// the SPA shell here so a home server only needs to run `npm run build` and
// `npm start` — no separate SSR process, no Nitro output required.
import { readdirSync } from "node:fs";
function findEntryAssets() {
  const assetsDir = join(STATIC_DIR, "assets");
  if (!existsSync(assetsDir)) return { js: null, css: null };
  const files = readdirSync(assetsDir);
  const js = files.find((f) => /^index-.*\.js$/.test(f));
  const css = files.find((f) => /^index-.*\.css$/.test(f));
  return { js: js ? `/assets/${js}` : null, css: css ? `/assets/${css}` : null };
}
function renderIndexHtml() {
  const { js, css } = findEntryAssets();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Family Hub</title>
  <meta name="description" content="Your family's private chores, shopping, meals and calendar hub." />
  <meta name="theme-color" content="#0f172a" />
  <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
  <link rel="apple-touch-icon" href="/icon-192.png" />
  <link rel="manifest" href="/manifest.webmanifest" />
  ${css ? `<link rel="stylesheet" href="${css}" />` : ""}
</head>
<body>
  <div id="root"></div>
  ${js ? `<script type="module" src="${js}"></script>` : "<p style=\"padding:2rem;font-family:system-ui\">Build not found. Run <code>npm run build</code> and restart.</p>"}
</body>
</html>`;
}

if (existsSync(STATIC_DIR)) {
  await app.register(fastifyStatic, { root: STATIC_DIR, wildcard: false, index: false });
  // Root and every non-asset, non-API path serves the SPA shell.
  const sendShell = (_req, reply) => reply.type("text/html; charset=utf-8").send(renderIndexHtml());
  app.get("/", sendShell);
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith("/api/") || req.url.startsWith("/ws")) return reply.code(404).send({ error: "Not found" });
    return sendShell(req, reply);
  });
} else {
  app.get("/", async () => ({ ok: true, hint: `Static bundle not found at ${STATIC_DIR}. Run \`npm run build\` first.` }));
}

function safeJson(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

await app.listen({ port: PORT, host: HOST });
app.log.info(`Family Hub listening on http://${HOST}:${PORT}`);
app.log.info(`Database: ${DB_PATH}`);
app.log.info(`Static:   ${STATIC_DIR}`);
if (userCount() === 0) app.log.info("No users yet — first person to register becomes the admin.");
