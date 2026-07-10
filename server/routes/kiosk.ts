import { randomUUID } from "node:crypto";
import { db } from "../db.js";

export default async function kioskRoutes(app: any, opts: any) {
  const { broadcast } = opts;

  // --- CALENDAR EVENTS ---
  app.get("/events", async () => db.prepare("SELECT * FROM events ORDER BY starts_at ASC").all());
  app.get("/events/upcoming", async () => db.prepare("SELECT * FROM events WHERE starts_at >= datetime('now') ORDER BY starts_at ASC LIMIT 5").all());
  
  // FIXED: Single Deletion
  app.delete("/events/:id", async (req: any) => {
    db.prepare("DELETE FROM events WHERE id = ?").run(req.params.id);
    broadcast("events"); return { success: true };
  });

  // FIXED: Bulk Deletion
  app.post("/events/bulk-delete", async (req: any) => {
    const { title, range, start_date, end_date } = req.body;
    if (range === 'all') {
      db.prepare("DELETE FROM events WHERE title = ?").run(title);
    } else if (range === 'range' && start_date && end_date) {
      db.prepare("DELETE FROM events WHERE title = ? AND starts_at BETWEEN ? AND ?").run(title, start_date, end_date);
    }
    broadcast("events"); return { success: true };
  });

  // Bulk Addition
  app.post("/events", async (req: any) => {
    const { title, location, member_id, color, dates } = req.body;
    const insert = db.prepare("INSERT INTO events (id, title, starts_at, location, color, member_id, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))");
    db.transaction(() => {
      for (const d of dates) insert.run(randomUUID(), title, d, location || "", color || "blue", member_id || null);
    })();
    broadcast("events"); return { success: true };
  });

  // --- MESSAGES ---
  app.get("/messages", async () => db.prepare("SELECT m.*, f.name, f.avatar_color FROM messages m JOIN family_members f ON m.member_id = f.id ORDER BY m.created_at DESC LIMIT 10").all());
  app.post("/messages", async (req: any) => {
    db.prepare("INSERT INTO messages (id, member_id, content, created_at) VALUES (?,?,?,datetime('now'))").run(randomUUID(), req.body.member_id, req.body.content);
    broadcast("messages"); return { success: true };
  });
}
