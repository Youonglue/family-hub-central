import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs"; // Fixed: mkdirSync moved here
import { randomBytes, scryptSync, timingSafeEqual, randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, "../data");
const DB_PATH = path.join(DATA_DIR, "familyhub.db");

// 1. Initialize Database & Tables
mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password_hash TEXT,
    is_admin INTEGER DEFAULT 0,
    created_at TEXT
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT,
    expires_at TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  -- Chores table
  CREATE TABLE IF NOT EXISTS chores (
    id TEXT PRIMARY KEY,
    title TEXT,
    points INTEGER,
    active INTEGER DEFAULT 1,
    created_at TEXT
  );
`);

// 2. Helpers for Auth
const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
};

const verifyPassword = (password: string, stored: string) => {
  const [schema, salt, hash] = stored.split("$");
  const attempt = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(attempt, "hex"));
};

// 3. Fastify Setup
const app = Fastify({ logger: true });
await app.register(fastifyWebsocket);
app.register(fastifyStatic, {
  root: path.join(__dirname, "../dist"),
  prefix: "/",
});

// 4. AUTH ROUTES
app.get("/api/auth/me", async (req, reply) => {
  const cookie = req.headers.cookie || "";
  const token = cookie.match(/fh_sid=([^;]+)/)?.[1];
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
  
  if (!token) {
    return { id: null, first_run: userCount.count === 0 };
  }

  const session = db.prepare(`
    SELECT u.id, u.username, u.is_admin 
    FROM sessions s JOIN users u ON s.user_id = u.id 
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).get(token) as any;

  if (!session) return { id: null, first_run: userCount.count === 0 };
  return { ...session, first_run: false };
});

app.post("/api/auth/register", async (req, reply) => {
  const { username, password } = req.body as any;
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
  const isFirstUser = userCount.count === 0;

  try {
    const id = randomUUID();
    const isAdmin = isFirstUser ? 1 : 0;
    db.prepare("INSERT INTO users (id, username, password_hash, is_admin, created_at) VALUES (?, ?, ?, ?, datetime('now'))")
      .run(id, username, hashPassword(password), isAdmin);

    const token = randomBytes(32).toString("hex");
    db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))")
      .run(token, id);

    reply.header("Set-Cookie", `fh_sid=${token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax`);
    return { id, username, is_admin: !!isAdmin };
  } catch (e) {
    return reply.code(400).send({ error: "Username taken or invalid data" });
  }
});

app.post("/api/auth/login", async (req, reply) => {
  const { username, password } = req.body as any;
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;

  if (!user || !verifyPassword(password, user.password_hash)) {
    return reply.code(401).send({ error: "Invalid credentials" });
  }

  const token = randomBytes(32).toString("hex");
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))")
    .run(token, user.id);

  reply.header("Set-Cookie", `fh_sid=${token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax`);
  return { id: user.id, username: user.username, is_admin: !!user.is_admin };
});

// 5. SPA Fallback
app.setNotFoundHandler((req, reply) => {
  if (req.url.startsWith("/api")) return reply.code(404).send({ error: "Not Found" });
  return reply.sendFile("index.html");
});

const start = async () => {
  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`\n🚀 Family Hub is LIVE at http://localhost:${PORT}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
start();
