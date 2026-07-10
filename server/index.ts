import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

const app = Fastify({ logger: false });
await app.register(fastifyWebsocket);

// --- MUSCLE: LIVE SYNC BROADCASTER ---
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

// --- MUSCLE: SECURITY GATEKEEPER ---
const getSession = (req: any) => {
  const token = req.headers.cookie?.match(/fh_sid=([^;]+)/)?.[1];
  if (!token) return null;
  return db.prepare(`
    SELECT u.* FROM sessions s 
    JOIN users u ON s.user_id = u.id 
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).get(token) as any;
};

app.addHook("preHandler", async (req, reply) => {
  const url = req.url;
  // Skip auth for login/assets
  if (!url.startsWith("/api") || ["/api/auth/login", "/api/auth/register", "/api/auth/me"].some(p => url.startsWith(p))) return;
  
  const user = getSession(req);
  if (!user) return reply.code(401).send({ error: "Unauthorized" });
  (req as any).user = user; // Attach for modular usage

  // Muscle: Admin Path Protection
  const adminOnlyPaths = ["/api/members", "/api/auth/users", "/api/auth/promote", "/api/backup"];
  if (adminOnlyPaths.some(p => url.startsWith(p)) && ["POST", "DELETE", "PATCH"].includes(req.method) && user.role !== 'admin') {
    return reply.code(403).send({ error: "Access Denied: Admin Level Required" });
  }
});

// --- CONNECT MODULES ---
app.register(authRoutes, { prefix: "/api/auth" });
app.register(familyRoutes, { prefix: "/api/members", broadcast });
app.register(rewardRoutes, { prefix: "/api/rewards", broadcast });
app.register(shoppingRoutes, { prefix: "/api/shopping", broadcast });
app.register(choreRoutes, { prefix: "/api/chores", broadcast }); 
app.register(mealRoutes, { prefix: "/api/meals", broadcast });
app.register(kioskRoutes, { prefix: "/api/kiosk", broadcast });
app.register(calendarRoutes, { prefix: "/api/calendar", broadcast });

// --- SERVE FRONTEND ---
app.register(fastifyStatic, { root: path.join(__dirname, "../dist"), prefix: "/" });
app.setNotFoundHandler((req, reply) => {
  if (req.url.startsWith("/api")) return reply.code(404).send({ error: "Route Missing" });
  reply.sendFile("index.html");
});

app.listen({ port: 3000, host: "0.0.0.0" }, () => {
    console.log(`🚀 FORTRESS HUB ONLINE | http://192.168.1.226:3000`);
});
