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

app.addHook("preHandler", async (req, reply) => {
  const url = req.url;
  if (!url.startsWith("/api") || ["/api/auth/login", "/api/auth/register", "/api/auth/me"].some(p => url.startsWith(p))) return;
  
  // Safely calls the local getSession helper
  const user = getSession(req);
  if (!user) return reply.code(401).send({ error: "Unauthorized" });
  (req as any).user = user;
});

// --- GLOBAL ERROR LOGGER (Forces hidden 500 errors to print in your terminal) ---
app.setErrorHandler((error, request, reply) => {
  console.error("❌ GLOBAL SERVER ERROR:", error);
  reply.status(error.statusCode || 500).send({ error: error.message });
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

// Points Alignment (Safely Clamped with Self-Healing Avatar Config Injection)
app.get("/api/points", async (req: any) => {
    // Self-Heal: Ensure 'avatar_config' column exists in family_members table on points query load
    try {
      db.prepare("ALTER TABLE family_members ADD COLUMN avatar_config TEXT").run();
    } catch (e) {
      // Ignore if the column already exists
    }

    return db.prepare(`
        SELECT 
          m.id as member_id, m.name, m.avatar_color, m.avatar_icon, m.avatar_config, m.xp, m.level, m.is_kid, m.is_parent,
          CASE 
            WHEN (
              COALESCE((SELECT SUM(points_awarded) FROM chore_completions WHERE member_id = m.id AND status = 'approved'), 0) - 
              COALESCE((SELECT SUM(points_spent) FROM redemptions WHERE member_id = m.id AND status = 'approved'), 0)
            ) < 0 THEN 0
            ELSE (
              COALESCE((SELECT SUM(points_awarded) FROM chore_completions WHERE member_id = m.id AND status = 'approved'), 0) - 
              COALESCE((SELECT SUM(points_spent) FROM redemptions WHERE member_id = m.id AND status = 'approved'), 0)
            )
          END as balance
        FROM family_members m 
        ORDER BY m.xp DESC
    `).all();
});

// --- NEW: ADVENTURE LOG (NOTIFICATIONS) ENDPOINT ---
app.get("/api/notifications", async (req: any) => {
  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        member_id TEXT,
        title TEXT,
        message TEXT,
        type TEXT,
        created_at TEXT
      )
    `).run();
  } catch (e) {}

  return db.prepare("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 20").all();
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
