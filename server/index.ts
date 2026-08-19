// server/index.ts
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { copyFileSync, mkdirSync, readdirSync, unlinkSync, existsSync, statSync } from "node:fs";
import { db, initSchema } from "./db.js";

// Modular Imports
import authRoutes from "./routes/auth.js";
import familyRoutes from "./routes/family.js";
import choreRoutes from "./routes/chores.js";
import rewardRoutes from "./routes/rewards.js";
import mealRoutes from "./routes/meals.js";
import shoppingRoutes from "./routes/shopping.js";
import kioskRoutes from "./routes/kiosk.js";
import calendarRoutes from "./routes/calendar.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
initSchema();

// --- AUTOMATED DATABASE SNAPSHOT ENGINE ---
function runAutoSnapshot() {
  try {
    const backupDir = path.resolve("./data/backups");
    mkdirSync(backupDir, { recursive: true });

    const currentDbPath = path.resolve("./data/familyhub.db");
    if (!existsSync(currentDbPath)) return;

    // Check if we already took a snapshot today (format: YYYY-MM-DD)
    const todayStr = new Date().toISOString().slice(0, 10);
    const existingFiles = readdirSync(backupDir).filter(f => f.endsWith(".db"));
    const alreadyBackedUpToday = existingFiles.some(f => f.includes(todayStr));

    if (!alreadyBackedUpToday || existingFiles.length === 0) {
      // 1. Flush SQLite WAL memory pages safely to disk
      try {
        db.pragma("wal_checkpoint(TRUNCATE)");
      } catch (e) {}

      // 2. Create timestamped snapshot
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const targetSnapshotPath = path.join(backupDir, `familyhub-auto-${timestamp}.db`);
      copyFileSync(currentDbPath, targetSnapshotPath);
      console.log(`🛡️ Automated Snapshot Created: familyhub-auto-${timestamp}.db`);

      // 3. Keep latest 7 snapshots, delete older ones
      const sortedBackups = readdirSync(backupDir)
        .filter(f => f.endsWith(".db"))
        .sort((a, b) => {
          return statSync(path.join(backupDir, b)).mtime.getTime() - statSync(path.join(backupDir, a)).mtime.getTime();
        });

      while (sortedBackups.length > 7) {
        const oldest = sortedBackups.pop();
        if (oldest) {
          unlinkSync(path.join(backupDir, oldest));
          console.log(`🧹 Rotated old snapshot: ${oldest}`);
        }
      }
    }
  } catch (error) {
    console.error("❌ Auto Snapshot Engine Error:", error);
  }
}

// Run initial snapshot on boot and schedule every 6 hours
runAutoSnapshot();
setInterval(runAutoSnapshot, 6 * 60 * 60 * 1000);

// MUSCLE: ignoreTrailingSlash ensures routes like /api/chores/ don't return 404
const app = Fastify({ 
  logger: false,
  ignoreTrailingSlash: true 
});

await app.register(fastifyWebsocket);

// --- BROADCASTER MUSCLE ---
const connections = new Set<any>();
function broadcast(topic: string) {
  const msg = JSON.stringify({ topic, at: Date.now() });
  for (const conn of connections) { 
    try { conn.send(msg); } catch { connections.delete(conn); } 
  }
}

app.get("/ws", { websocket: true }, (connection) => {
  connections.add(connection);
  connection.on("close", () => connections.delete(connection));
});

// --- GATEKEEPER MUSCLE ---
const getSession = (req: any) => {
  const token = req.headers.cookie?.match(/fh_sid=([^;]+)/)?.[1];
  if (!token) return null;
  return db.prepare(`SELECT u.* FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime('now')`).get(token) as any;
};

// Global Gatekeeper Hook with Read-Only Whitelist
app.addHook("preHandler", async (req, reply) => {
  const url = req.url;
  const method = req.method;

  // 1. If not an API request, bypass gatekeeper completely
  if (!url.startsWith("/api")) {
    return;
  }

  // 2. Whitelist open unauthenticated API endpoints
  const publicPaths = [
    "/api/auth/login", 
    "/api/auth/register", 
    "/api/auth/me", 
    "/api/auth/logout", 
    "/api/auth/emergency-recover",
    "/api/events/calendar.ics"
  ];

  if (publicPaths.some(p => url.startsWith(p))) {
    return;
  }

  // 3. Whitelist GET (read-only) queries for kiosk and character select
  if (method === "GET" && (url.startsWith("/api/members") || url.startsWith("/api/events") || url.startsWith("/api/notifications") || url.startsWith("/api/auth/users"))) {
    return;
  }

  // 4. All other API requests require valid session
  const user = getSession(req);
  if (!user) return reply.code(401).send({ error: "Unauthorized" });
  (req as any).user = user;
});

// --- REGISTER MODULAR ROUTES ---
app.register(authRoutes, { prefix: "/api/auth" });
app.register(familyRoutes, { prefix: "/api/members", broadcast });
app.register(rewardRoutes, { prefix: "/api/rewards", broadcast });
app.register(shoppingRoutes, { prefix: "/api/shopping", broadcast });
app.register(choreRoutes, { prefix: "/api/chores", broadcast }); 
app.register(mealRoutes, { prefix: "/api/meals", broadcast });
app.register(kioskRoutes, { prefix: "/api/kiosk", broadcast });
app.register(calendarRoutes, { prefix: "/api/events", broadcast }); 

// Points Alignment
app.get("/api/points", async (req: any) => {
    return db.prepare(`
        SELECT 
          m.id as member_id, m.name, m.avatar_color, m.avatar_icon, m.xp, m.level, m.is_kid, m.is_parent,
          (COALESCE((SELECT SUM(points_awarded) FROM chore_completions WHERE member_id = m.id AND status = 'approved'), 0) - 
           COALESCE((SELECT SUM(points_spent) FROM redemptions WHERE member_id = m.id), 0)) as balance
        FROM family_members m 
        ORDER BY m.xp DESC
    `).all();
});

// Adventure Log Notifications Alignment
app.get("/api/notifications", async () => {
    try {
      return db.prepare("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 30").all();
    } catch (e) {
      return [];
    }
});

// --- SERVE FRONTEND ---
app.register(fastifyStatic, { root: path.join(__dirname, "../dist"), prefix: "/" });
app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith("/api")) return reply.code(404).send({ error: "Check modular route mapping" });
    reply.sendFile("index.html");
});

app.listen({ port: 3000, host: "0.0.0.0" }, () => {
    console.log(`🚀 FORTRESS ONLINE | 192.168.1.210:3000`);
});
