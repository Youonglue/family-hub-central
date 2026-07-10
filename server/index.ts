import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db, initSchema } from "./db.js";

// Import your modules
import authRoutes from "./routes/auth.js";
import familyRoutes from "./routes/family.js";
import choreRoutes from "./routes/chores.js";
import rewardRoutes from "./routes/rewards.js";
import mealRoutes from "./routes/meals.js";
import shoppingRoutes from "./routes/shopping.js";
import kioskRoutes from "./routes/kiosk.js";
import calendarRoutes from "./routes/calendar.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = Fastify({ 
  logger: true // Set to true to see exact errors in the terminal
});

const startServer = async () => {
  try {
    // 1. Initialize DB
    console.log("🗄️ Initializing Database...");
    initSchema();

    // 2. Setup WebSockets
    await app.register(fastifyWebsocket);
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

    // 3. Security Helper
    const getSession = (req: any) => {
      const token = req.headers.cookie?.match(/fh_sid=([^;]+)/)?.[1];
      if (!token) return null;
      return db.prepare(`SELECT u.* FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime('now')`).get(token) as any;
    };

    // 4. Security Gatekeeper
    app.addHook("preHandler", async (req, reply) => {
      const url = req.url;
      // Allow frontend and specific auth routes
      if (!url.startsWith("/api") || ["/api/auth/login", "/api/auth/register", "/api/auth/me"].some(p => url.startsWith(p))) return;
      
      const user = getSession(req);
      if (!user) return reply.code(401).send({ error: "Unauthorized" });

      const adminOnlyPaths = ["/api/members", "/api/users", "/api/auth/set-pin", "/api/backup"];
      if (adminOnlyPaths.some(p => url.startsWith(p)) && ["POST", "DELETE", "PATCH"].includes(req.method) && !user.is_admin) {
        return reply.code(403).send({ error: "Admin only" });
      }
    });

    // 5. Register Modular Routes
    console.log("🔗 Registering Modular Routes...");
    app.register(authRoutes, { prefix: "/api/auth" });
    app.register(familyRoutes, { prefix: "/api/members", broadcast });
    app.register(rewardRoutes, { prefix: "/api/rewards", broadcast });
    app.register(shoppingRoutes, { prefix: "/api/shopping", broadcast });
    app.register(choreRoutes, { prefix: "/api", broadcast }); 
    app.register(mealRoutes, { prefix: "/api", broadcast });
    app.register(kioskRoutes, { prefix: "/api", broadcast });
    app.register(calendarRoutes, { prefix: "/api/calendar", broadcast });

    // 6. Serve Static Frontend
    console.log("📂 Serving Static Files...");
    app.register(fastifyStatic, { 
      root: path.join(__dirname, "../dist"), 
      prefix: "/",
      wildcard: false 
    });

    // 7. SPA Fallback
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith("/api")) {
        reply.code(404).send({ error: "API Route not found" });
      } else {
        reply.sendFile("index.html");
      }
    });

    // 8. Start Listener
    await app.listen({ port: 3000, host: "0.0.0.0" });
    console.log(`
    🚀 MODULAR HUB ONLINE & LOCKED
    -----------------------------------
    Network: http://192.168.1.226:3000
    -----------------------------------
    `);

  } catch (err) {
    console.error("❌ SERVER CRASHED ON STARTUP:");
    console.error(err);
    process.exit(1);
  }
};

startServer();
