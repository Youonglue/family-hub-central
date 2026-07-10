import { randomUUID } from "node:crypto";
import { db } from "../db.js";

export default async function calendarRoutes(app: any, opts: any) {
  const { broadcast } = opts;

  // 1. Fetch all Quests
  app.get("/", async () => {
    return db.prepare("SELECT * FROM events ORDER BY starts_at ASC").all();
  });

  // 2. Create Quest (Supports multiple dates)
  app.post("/", async (req: any) => {
    const { title, location, member_id, color, dates } = req.body;
    
    const stmt = db.prepare(`
      INSERT INTO events (id, title, location, member_id, color, starts_at, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    db.transaction(() => {
      for (const date of dates) {
        stmt.run(randomUUID(), title, location, member_id, color, date);
      }
    })();

    broadcast("CALENDAR_UPDATED");
    return { success: true };
  });

  // 3. Delete Individual Quest
  app.delete("/:id", async (req: any) => {
    db.prepare("DELETE FROM events WHERE id = ?").run(req.params.id);
    broadcast("CALENDAR_UPDATED");
    return { success: true };
  });

  // 4. Bulk Delete View (Day/Week/Month/Year)
  app.delete("/range", async (req: any) => {
    const { start, end } = req.query;
    db.prepare("DELETE FROM events WHERE starts_at BETWEEN ? AND ?").run(start, end);
    broadcast("CALENDAR_UPDATED");
    return { success: true };
  });
}
