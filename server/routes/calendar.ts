import { randomUUID } from "node:crypto";
import { db } from "../db.js";

export default async function calendarRoutes(app: any, opts: any) {
  const { broadcast } = opts;

  // GET: /api/events (The main list)
  app.get("/", async () => {
    return db.prepare("SELECT * FROM events ORDER BY starts_at ASC").all();
  });

  // GET: /api/events/upcoming (FIX FOR 404)
  app.get("/upcoming", async () => {
    return db.prepare("SELECT * FROM events WHERE starts_at >= date('now') ORDER BY starts_at ASC LIMIT 5").all();
  });

  // POST: /api/events (Create)
  app.post("/", async (req: any) => {
    const { title, location, member_id, color, dates } = req.body;
    const stmt = db.prepare(`INSERT INTO events (id, title, location, member_id, color, starts_at, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`);
    db.transaction(() => {
      for (const date of dates) { stmt.run(randomUUID(), title, location, member_id, color, date); }
    })();
    broadcast("calendar");
    return { success: true };
  });

  // DELETE: /api/events/:id
  app.delete("/:id", async (req: any) => {
    db.prepare("DELETE FROM events WHERE id = ?").run(req.params.id);
    broadcast("calendar");
    return { success: true };
  });

  // DELETE: /api/events/range
  app.delete("/range", async (req: any) => {
    const { start, end } = req.query;
    db.prepare("DELETE FROM events WHERE DATE(starts_at) BETWEEN DATE(?) AND DATE(?)").run(start, end);
    broadcast("calendar");
    return { success: true };
  });
}
