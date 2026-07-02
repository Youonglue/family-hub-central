// Family Hub — self-hosted server
// -----------------------------------------------------------------------------
// Node 20+, Fastify, better-sqlite3, WebSocket broadcast for LAN real-time sync.
// Serves the built SPA from ../dist and exposes /api/* endpoints.
// Zero external calls: everything stays on your home network.

import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";
import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { randomUUID, timingSafeEqual, createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const DATA_DIR = process.env.DATA_DIR || resolve(__dirname, "..", "data");
const DB_PATH = process.env.DB_PATH || join(DATA_DIR, "familyhub.db");
const STATIC_DIR = process.env.STATIC_DIR || resolve(__dirname, "..", "dist");
const FAMILY_PIN = process.env.FAMILY_PIN || ""; // empty = no gate

// -----------------------------------------------------------------------------
// Database
// -----------------------------------------------------------------------------
import { mkdirSync } from "node:fs";
mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(readFileSync(join(__dirname, "schema.sql"), "utf8"));

const now = () => new Date().toISOString();
const uid = () => randomUUID();

// -----------------------------------------------------------------------------
// Fastify + WS
// -----------------------------------------------------------------------------
const app = Fastify({ logger: { level: "info" } });
await app.register(fastifyWebsocket);

// Broadcast helper — every state-changing endpoint calls this so all connected
// devices (phones, tablets, fridge) refresh in real time.
const sockets = new Set();
function broadcast(topic) {
  const msg = JSON.stringify({ topic, at: Date.now() });
  for (const ws of sockets) {
    try { ws.send(msg); } catch { /* client gone */ }
  }
}

// -----------------------------------------------------------------------------
// Auth (optional shared family PIN, cookie-based)
// -----------------------------------------------------------------------------
function hashPin(pin) {
  return createHash("sha256").update(String(pin), "utf8").digest();
}
function pinMatches(input) {
  if (!FAMILY_PIN) return true;
  const a = hashPin(input);
  const b = hashPin(FAMILY_PIN);
  return a.length === b.length && timingSafeEqual(a, b);
}

app.addHook("onRequest", async (req, reply) => {
  // Public routes: assets, health, WebSocket handshake, pin endpoints.
  const url = req.url;
  if (
    !FAMILY_PIN ||
    url.startsWith("/api/health") ||
    url.startsWith("/api/pin") ||
    url.startsWith("/ws") ||
    !url.startsWith("/api/")
  ) {
    return;
  }
  const cookie = req.headers.cookie || "";
  const match = /(?:^|;\s*)fh_unlocked=([^;]+)/.exec(cookie);
  if (!match || !pinMatches(decodeURIComponent(match[1]))) {
    return reply.code(401).send({ error: "Locked. POST /api/pin with { pin }." });
  }
});

// -----------------------------------------------------------------------------
// Health + PIN
// -----------------------------------------------------------------------------
app.get("/api/health", async () => ({ ok: true, version: "1.0.0", pin_required: !!FAMILY_PIN }));

app.post("/api/pin", async (req, reply) => {
  const { pin } = (req.body || {});
  if (!FAMILY_PIN) return { ok: true };
  if (!pinMatches(pin)) return reply.code(401).send({ ok: false, error: "Wrong PIN" });
  reply.header(
    "set-cookie",
    `fh_unlocked=${encodeURIComponent(pin)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}`,
  );
  return { ok: true };
});

app.post("/api/pin/clear", async (_req, reply) => {
  reply.header("set-cookie", "fh_unlocked=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
  return { ok: true };
});

// -----------------------------------------------------------------------------
// Family members
// -----------------------------------------------------------------------------
app.get("/api/members", async () =>
  db.prepare("SELECT * FROM family_members ORDER BY sort_order, created_at").all(),
);

app.post("/api/members", async (req, reply) => {
  const { name, avatar_color, is_kid } = req.body || {};
  if (!name || !avatar_color) return reply.code(400).send({ error: "name and avatar_color required" });
  const row = {
    id: uid(),
    name: String(name).slice(0, 60),
    avatar_color: String(avatar_color).slice(0, 20),
    is_kid: is_kid ? 1 : 0,
    sort_order: 0,
    created_at: now(),
  };
  db.prepare(
    "INSERT INTO family_members (id,name,avatar_color,is_kid,sort_order,created_at) VALUES (@id,@name,@avatar_color,@is_kid,@sort_order,@created_at)",
  ).run(row);
  broadcast("members");
  return row;
});

app.delete("/api/members/:id", async (req) => {
  db.prepare("DELETE FROM family_members WHERE id = ?").run(req.params.id);
  broadcast("members");
  broadcast("points");
  return { ok: true };
});

// -----------------------------------------------------------------------------
// Points / leaderboard (view computed on the fly)
// -----------------------------------------------------------------------------
app.get("/api/points", async () =>
  db
    .prepare(
      `SELECT m.id AS member_id, m.name, m.avatar_color, m.is_kid,
              COALESCE(earned.pts, 0) - COALESCE(spent.pts, 0)  AS balance,
              COALESCE(earned.week_pts, 0)                     AS week_points
       FROM family_members m
       LEFT JOIN (
         SELECT member_id,
                SUM(points_awarded) AS pts,
                SUM(CASE WHEN completed_at >= datetime('now','-7 days') THEN points_awarded ELSE 0 END) AS week_pts
         FROM chore_completions GROUP BY member_id
       ) earned ON earned.member_id = m.id
       LEFT JOIN (
         SELECT member_id, SUM(points_spent) AS pts FROM redemptions GROUP BY member_id
       ) spent ON spent.member_id = m.id
       ORDER BY balance DESC`,
    )
    .all(),
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

app.post("/api/chores/:id/complete", async (req, reply) => {
  const { member_id } = req.body || {};
  if (!member_id) return reply.code(400).send({ error: "member_id required" });
  const chore = db.prepare("SELECT points FROM chores WHERE id = ?").get(req.params.id);
  if (!chore) return reply.code(404).send({ error: "chore not found" });
  db.prepare(
    "INSERT INTO chore_completions (id,chore_id,member_id,points_awarded,completed_at) VALUES (?,?,?,?,?)",
  ).run(uid(), req.params.id, member_id, chore.points, now());
  broadcast("chores");
  broadcast("points");
  broadcast("completions");
  return { ok: true, points: chore.points };
});

app.get("/api/completions/recent", async () =>
  db
    .prepare(
      `SELECT cc.id, cc.points_awarded, cc.completed_at,
              c.title AS chore_title,
              m.name  AS member_name, m.avatar_color AS member_color
       FROM chore_completions cc
       JOIN chores c         ON c.id = cc.chore_id
       JOIN family_members m ON m.id = cc.member_id
       ORDER BY cc.completed_at DESC LIMIT 20`,
    )
    .all(),
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
  const bal = db
    .prepare(
      `SELECT COALESCE((SELECT SUM(points_awarded) FROM chore_completions WHERE member_id = ?),0)
             - COALESCE((SELECT SUM(points_spent)     FROM redemptions       WHERE member_id = ?),0) AS balance`,
    )
    .get(member_id, member_id);
  if ((bal?.balance ?? 0) < reward.cost_points) {
    return reply.code(400).send({ error: "Not enough points" });
  }
  db.prepare(
    "INSERT INTO redemptions (id,reward_id,member_id,points_spent,redeemed_at) VALUES (?,?,?,?,?)",
  ).run(uid(), req.params.id, member_id, reward.cost_points, now());
  broadcast("rewards");
  broadcast("points");
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
    id: uid(),
    name: String(name).slice(0, 120),
    quantity: quantity ? String(quantity).slice(0, 60) : null,
    category: category ? String(category).slice(0, 40) : "general",
    checked: 0,
    checked_at: null,
    created_at: now(),
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
  db
    .prepare("SELECT * FROM recipes ORDER BY name")
    .all()
    .map((r) => ({ ...r, ingredients: safeJson(r.ingredients, []) })),
);

app.post("/api/recipes", async (req, reply) => {
  const { name, notes, ingredients } = req.body || {};
  if (!name) return reply.code(400).send({ error: "name required" });
  const row = {
    id: uid(),
    name: String(name).slice(0, 120),
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
  broadcast("recipes");
  broadcast("meal-plan");
  return { ok: true };
});

app.get("/api/meal-plan", async (req) => {
  const { from, to } = req.query || {};
  const rows = db
    .prepare(
      `SELECT mp.*, r.name AS recipe_name, r.ingredients AS recipe_ingredients
       FROM meal_plan mp
       LEFT JOIN recipes r ON r.id = mp.recipe_id
       WHERE mp.plan_date BETWEEN ? AND ?
       ORDER BY mp.plan_date`,
    )
    .all(from || "1900-01-01", to || "2999-12-31");
  return rows.map((r) => ({
    ...r,
    recipes: r.recipe_name
      ? { id: r.recipe_id, name: r.recipe_name, ingredients: safeJson(r.recipe_ingredients, []) }
      : null,
  }));
});

app.post("/api/meal-plan", async (req, reply) => {
  const { plan_date, meal, recipe_id, custom_name } = req.body || {};
  if (!plan_date || !meal) return reply.code(400).send({ error: "plan_date and meal required" });
  db.prepare(
    `INSERT INTO meal_plan (id,plan_date,meal,recipe_id,custom_name,created_at)
     VALUES (?,?,?,?,?,?)
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
  const rows = db
    .prepare(
      `SELECT r.ingredients FROM meal_plan mp
       JOIN recipes r ON r.id = mp.recipe_id
       WHERE mp.plan_date BETWEEN ? AND ?`,
    )
    .all(from, to);
  const merged = new Map();
  for (const r of rows) {
    for (const ing of safeJson(r.ingredients, [])) {
      if (!ing?.name) continue;
      const key = String(ing.name).trim().toLowerCase();
      if (!key) continue;
      const existing = merged.get(key);
      if (existing) {
        if (ing.quantity && !existing.quantity.includes(ing.quantity)) {
          existing.quantity = existing.quantity
            ? `${existing.quantity} + ${ing.quantity}`
            : String(ing.quantity);
        }
      } else {
        merged.set(key, { name: ing.name, quantity: ing.quantity || "" });
      }
    }
  }
  const insert = db.prepare(
    "INSERT INTO shopping_items (id,name,quantity,category,checked,checked_at,created_at) VALUES (?,?,?,?,0,NULL,?)",
  );
  const tx = db.transaction((items) => {
    for (const it of items) insert.run(uid(), it.name, it.quantity || null, "meal-plan", now());
  });
  const items = [...merged.values()];
  tx(items);
  broadcast("shopping");
  return { added: items.length };
});

// -----------------------------------------------------------------------------
// Events (calendar)
// -----------------------------------------------------------------------------
app.get("/api/events", async () =>
  db
    .prepare(
      `SELECT e.*, m.name AS member_name, m.avatar_color AS member_color
       FROM events e LEFT JOIN family_members m ON m.id = e.member_id
       ORDER BY starts_at`,
    )
    .all(),
);

app.get("/api/events/upcoming", async () =>
  db
    .prepare(
      `SELECT e.*, m.name AS member_name, m.avatar_color AS member_color
       FROM events e LEFT JOIN family_members m ON m.id = e.member_id
       WHERE starts_at >= datetime('now')
       ORDER BY starts_at LIMIT 6`,
    )
    .all(),
);

app.post("/api/events", async (req, reply) => {
  const { title, starts_at, ends_at, location, member_id, color } = req.body || {};
  if (!title || !starts_at) return reply.code(400).send({ error: "title and starts_at required" });
  const row = {
    id: uid(),
    title: String(title).slice(0, 120),
    starts_at,
    ends_at: ends_at || null,
    location: location ? String(location).slice(0, 120) : null,
    member_id: member_id || null,
    color: color || "sky",
    created_at: now(),
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
// WebSocket — clients subscribe and receive `{ topic }` messages on changes.
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
// Static SPA + fallback (must be last)
// -----------------------------------------------------------------------------
import { existsSync } from "node:fs";
if (existsSync(STATIC_DIR)) {
  await app.register(fastifyStatic, { root: STATIC_DIR, wildcard: false });
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith("/api/") || req.url.startsWith("/ws")) {
      return reply.code(404).send({ error: "Not found" });
    }
    return reply.sendFile("index.html");
  });
} else {
  app.get("/", async () => ({
    ok: true,
    hint: "Static bundle not found. Build the frontend with `npm run build` first.",
  }));
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function safeJson(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

// -----------------------------------------------------------------------------
await app.listen({ port: PORT, host: HOST });
app.log.info(`Family Hub listening on http://${HOST}:${PORT}`);
app.log.info(`Database: ${DB_PATH}`);
app.log.info(FAMILY_PIN ? "PIN gate: ENABLED" : "PIN gate: disabled (set FAMILY_PIN to enable)");
