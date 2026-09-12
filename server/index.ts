// server/index.ts
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
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

    const todayStr = new Date().toISOString().slice(0, 10);
    const existingFiles = readdirSync(backupDir).filter(f => f.endsWith(".db"));
    const alreadyBackedUpToday = existingFiles.some(f => f.includes(todayStr));

    if (!alreadyBackedUpToday || existingFiles.length === 0) {
      try {
        db.pragma("wal_checkpoint(PASSIVE)");
      } catch (e) {}

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const targetSnapshotPath = path.join(backupDir, `familyhub-auto-${timestamp}.db`);
      copyFileSync(currentDbPath, targetSnapshotPath);
      console.log(`🛡️ Automated Snapshot Created: familyhub-auto-${timestamp}.db`);

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

runAutoSnapshot();
setInterval(runAutoSnapshot, 6 * 60 * 60 * 1000);

const app = Fastify({ 
  logger: false,
  ignoreTrailingSlash: true,
  trustProxy: true
});

await app.register(fastifyWebsocket);

await app.register(fastifyHelmet, {
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  originAgentCluster: false,
  frameguard: { action: "deny" }
});

await app.register(fastifyRateLimit, {
  max: 300,
  timeWindow: "1 minute",
  allowList: (req) => {
    const rawIp = (req.ip || req.socket.remoteAddress || "").split(",")[0].trim().replace(/^::ffff:/, "");
    return rawIp === "127.0.0.1" || rawIp === "::1" || rawIp.startsWith("192.168.") || rawIp.startsWith("10.");
  }
});

// --- LOCAL HOME NETWORK AIR-GAP GUARD ---
app.addHook("onRequest", async (req, reply) => {
  const rawIp = req.ip || req.socket.remoteAddress || "";
  const cleanIp = rawIp.split(",")[0].trim().replace(/^::ffff:/, "");

  const isLocalSubnet = 
    cleanIp === "127.0.0.1" || 
    cleanIp === "::1" || 
    cleanIp.startsWith("192.168.") || 
    cleanIp.startsWith("10.") || 
    cleanIp.startsWith("172.16.") || 
    cleanIp.startsWith("172.17.") || 
    cleanIp.startsWith("172.18.") || 
    cleanIp.startsWith("172.19.") || 
    cleanIp.startsWith("172.20.") || 
    cleanIp.startsWith("172.21.") || 
    cleanIp.startsWith("172.22.") || 
    cleanIp.startsWith("172.23.") || 
    cleanIp.startsWith("172.24.") || 
    cleanIp.startsWith("172.25.") || 
    cleanIp.startsWith("172.26.") || 
    cleanIp.startsWith("172.27.") || 
    cleanIp.startsWith("172.28.") || 
    cleanIp.startsWith("172.29.") || 
    cleanIp.startsWith("172.30.") || 
    cleanIp.startsWith("172.31.");

  if (!isLocalSubnet) {
    console.warn(`🛑 Blocked non-local connection attempt from IP: ${cleanIp}`);
    return reply.code(403).send({ error: "Access strictly restricted to home network." });
  }
});

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

// Global Gatekeeper Hook with Read-Only & Pairing Whitelist
app.addHook("preHandler", async (req, reply) => {
  const url = req.url;
  const method = req.method;

  if (!url.startsWith("/api")) {
    return;
  }

  const publicPaths = [
    "/api/auth/login", 
    "/api/auth/register", 
    "/api/auth/me", 
    "/api/auth/logout", 
    "/api/auth/emergency-recover",
    "/api/auth/device-status",
    "/api/auth/request-pairing",
    "/api/auth/check-pairing",
    "/api/auth/pair-with-pin",
    "/api/auth/verify-pin",
    "/api/auth/pin-status",
    "/api/events/calendar.ics",
    "/api/events/paperless-webhook"
  ];

  if (publicPaths.some(p => url.startsWith(p))) {
    return;
  }

  if (method === "GET" && (url.startsWith("/api/members") || url.startsWith("/api/events") || url.startsWith("/api/notifications") || url.startsWith("/api/auth/users") || url.startsWith("/api/points"))) {
    return;
  }

  const user = getSession(req);
  if (!user) return reply.code(401).send({ error: "Unauthorized" });
  (req as any).user = user;
});

// --- REGISTER MODULAR ROUTES ---
app.register(authRoutes, { prefix: "/api/auth", broadcast });
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
           COALESCE((SELECT SUM(points_spent) FROM redemptions WHERE member_id = m.id AND status = 'approved'), 0)) as balance
        FROM family_members m 
        ORDER BY m.xp DESC
    `).all();
});

// Adventure Log Notifications (GET)
app.get("/api/notifications", async () => {
    try {
      return db.prepare("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 30").all();
    } catch (e) {
      return [];
    }
});

// DELETE INDIVIDUAL ADVENTURE LOG ENTRY (Admin Only)
app.delete("/api/notifications/:id", async (req: any, reply: any) => {
    try {
      const user = getSession(req);
      if (!user || user.role !== 'admin') {
        return reply.code(403).send({ error: "Admin only" });
      }
      db.prepare("DELETE FROM notifications WHERE id = ?").run(req.params.id);
      broadcast("notifications");
      return { success: true };
    } catch (e) {
      return reply.code(500).send({ error: (e as Error).message });
    }
});

// --- SERVE FRONTEND ---
const distPath = path.resolve(__dirname, "../dist");

app.register(fastifyStatic, { 
  root: distPath, 
  prefix: "/",
  setHeaders: (res, pathName) => {
    if (pathName.endsWith(".html")) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    } else {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
  }
});

app.setNotFoundHandler((req, reply) => {
  if (req.url.startsWith("/api")) {
    return reply.code(404).send({ error: "Check modular route mapping" });
  }
  reply.header("Cache-Control", "no-cache, no-store, must-revalidate");
  reply.header("Pragma", "no-cache");
  reply.header("Expires", "0");
  reply.sendFile("index.html");
});

app.listen({ port: 3000, host: "0.0.0.0" }, () => {
    console.log(`🚀 FORTRESS ONLINE | http://192.168.10.195:3000 (Air-Gapped)`);
});
