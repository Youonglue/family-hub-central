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

app.addHook("preHandler", async (req, reply) => {
  const url = req.url;
  if (!url.startsWith("/api") || ["/api/auth/login", "/api/auth/register", "/api/auth/me"].some(p => url.startsWith(p))) return;
  const user = getSession(req);
  if (!user) return reply.code(401).send({ error: "Unauthorized" });
  (req as any).user = user;
});

// --- REGISTER MODULAR ROUTES (Aligned with Frontend Calls) ---
app.register(authRoutes, { prefix: "/api/auth" });
app.register(familyRoutes, { prefix: "/api/members", broadcast });
app.register(rewardRoutes, { prefix: "/api/rewards", broadcast });
app.register(shoppingRoutes, { prefix: "/api/shopping", broadcast });
app.register(choreRoutes, { prefix: "/api/chores", broadcast }); // Aligned to /api/chores
app.register(mealRoutes, { prefix: "/api/meals", broadcast });   // Aligned to /api/meals
app.register(kioskRoutes, { prefix: "/api/kiosk", broadcast });

// Calendar Alignment: Frontend calls /api/events, but we named it /api/calendar
app.register(calendarRoutes, { prefix: "/api/events", broadcast }); 

// Points Alignment: Often requested separately by the frontend
app.get("/api/points", async (req: any) => {
    return db.prepare("SELECT member_id, SUM(points_awarded) as total FROM chore_completions WHERE status = 'approved' GROUP BY member_id").all();
});

// --- SERVE FRONTEND ---
app.register(fastifyStatic, { root: path.join(__dirname, "../dist"), prefix: "/" });
app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith("/api")) return reply.code(404).send({ error: "Check modular route mapping" });
    reply.sendFile("index.html");
});

app.listen({ port: 3000, host: "0.0.0.0" }, () => {
    console.log(`🚀 FORTRESS ONLINE | 192.168.1.226:3000`);
});
