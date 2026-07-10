import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db, initSchema } from "./db.js";

import authRoutes from "./routes/auth.js";
import familyRoutes from "./routes/family.js";
import choreRoutes from "./routes/chores.js";
import rewardRoutes from "./routes/rewards.js";
import mealRoutes from "./routes/meals.js";
import shoppingRoutes from "./routes/shopping.js";
import kioskRoutes from "./routes/kiosk.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
initSchema();

const app = Fastify({ logger: false });
await app.register(fastifyWebsocket);

const connections = new Set<any>();
function broadcast(topic: string) {
  const msg = JSON.stringify({ topic, at: Date.now() });
  for (const conn of connections) { try { conn.send(msg); } catch { connections.delete(conn); } }
}
app.get("/ws", { websocket: true }, (connection) => {
  connections.add(connection);
  connection.on("close", () => connections.delete(connection));
});

const getSession = (req: any) => {
  const token = req.headers.cookie?.match(/fh_sid=([^;]+)/)?.[1];
  if (!token) return null;
  return db.prepare(`SELECT u.* FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime('now')`).get(token) as any;
};

// SECURITY GATEKEEPER
app.addHook("preHandler", async (req, reply) => {
  const url = req.url;
  if (!url.startsWith("/api") || ["/api/auth/login", "/api/auth/register", "/api/auth/me"].some(p => url.startsWith(p))) return;
  const user = getSession(req);
  if (!user) return reply.code(401).send({ error: "Unauthorized" });

  const adminOnlyPaths = ["/api/members", "/api/users", "/api/auth/set-pin", "/api/backup"];
  if (adminOnlyPaths.some(p => url.startsWith(p)) && ["POST", "DELETE", "PATCH"].includes(req.method) && !user.is_admin) {
    return reply.code(403).send({ error: "Admin only" });
  }
});

// REGISTER MODULAR SECTIONS
// We use prefix: "/api" so the sub-files can define their exact paths easily
app.register(authRoutes, { prefix: "/api/auth" });
app.register(familyRoutes, { prefix: "/api/members", broadcast });
app.register(rewardRoutes, { prefix: "/api/rewards", broadcast });
app.register(shoppingRoutes, { prefix: "/api/shopping", broadcast });
app.register(choreRoutes, { prefix: "/api", broadcast }); 
app.register(mealRoutes, { prefix: "/api", broadcast });
app.register(kioskRoutes, { prefix: "/api", broadcast });

app.register(fastifyStatic, { root: path.join(__dirname, "../dist"), prefix: "/" });
app.setNotFoundHandler((req, reply) => reply.sendFile("index.html"));

app.listen({ port: 3000, host: "0.0.0.0" }, () => console.log("🚀 MODULAR HUB ONLINE & LOCKED"));
