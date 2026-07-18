import { randomUUID } from "node:crypto";
import { db } from "../db.js";

export default async function calendarRoutes(app: any, opts: any) {
  const { broadcast } = opts;

  // Self-heal utility to guarantee the time_from and time_to columns exist
  const ensureTimeColumnsExist = () => {
    try {
      db.prepare("ALTER TABLE events ADD COLUMN time_from TEXT").run();
    } catch (e) {}

    try {
      db.prepare("ALTER TABLE events ADD COLUMN time_to TEXT").run();
    } catch (e) {}
  };

  // GET: /api/events (The main list)
  app.get("/", async () => {
    ensureTimeColumnsExist();
    return db.prepare("SELECT * FROM events ORDER BY starts_at ASC, time_from ASC").all();
  });

  // GET: /api/events/upcoming
  app.get("/upcoming", async () => {
    ensureTimeColumnsExist();
    return db.prepare("SELECT * FROM events WHERE starts_at >= date('now') ORDER BY starts_at ASC, time_from ASC LIMIT 5").all();
  });

  // --- NEW: iCalendar (.ics) Feed exporter for Mobile synchronization ---
  // Final Path: GET /api/events/calendar.ics (Bypasses preHandler check in index.ts)
  app.get("/calendar.ics", async (req: any, reply: any) => {
    try {
      ensureTimeColumnsExist();
      const list = db.prepare("SELECT * FROM events").all() as any[];
      
      // Compile into standard iCalendar (.ics) format
      let ics = "BEGIN:VCALENDAR\r\n";
      ics += "VERSION:2.0\r\n";
      ics += "PRODID:-//Family Hub Central//NONSGML Calendar//EN\r\n";
      ics += "CALSCALE:GREGORIAN\r\n";
      ics += "METHOD:PUBLISH\r\n";
      ics += "X-WR-CALNAME:Family Hub Quests\r\n";
      ics += "X-WR-TIMEZONE:UTC\r\n";

      for (const e of list) {
        const dtStamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
        
        // Default fallbacks (all-day display: 9am - 10am)
        let startHrs = "09", startMins = "00";
        let endHrs = "10", endMins = "00";

        // Parse custom start time if provided
        if (e.time_from && e.time_from.includes(":")) {
          const parts = e.time_from.split(":");
          startHrs = parts[0].padStart(2, "0");
          startMins = parts[1].padStart(2, "0");
        }

        // Parse custom end time if provided
        if (e.time_to && e.time_to.includes(":")) {
          const parts = e.time_to.split(":");
          endHrs = parts[0].padStart(2, "0");
          endMins = parts[1].padStart(2, "0");
        }

        const dtStart = e.starts_at.replace(/-/g, "") + "T" + startHrs + startMins + "00Z";
        const dtEnd = e.starts_at.replace(/-/g, "") + "T" + endHrs + endMins + "00Z";
        
        ics += "BEGIN:VEVENT\r\n";
        ics += `UID:${e.id}@familyhub.local\r\n`;
        ics += `DTSTAMP:${dtStamp}\r\n`;
        ics += `DTSTART:${dtStart}\r\n`;
        ics += `DTEND:${dtEnd}\r\n`;
        ics += `SUMMARY:${e.title}\r\n`;
        if (e.location) {
          ics += `LOCATION:${e.location}\r\n`;
        }
        ics += "END:VEVENT\r\n";
      }

      ics += "END:VCALENDAR\r\n";

      // Set correct content-type so mobile devices recognize it as a calendar subscription
      reply.header("Content-Type", "text/calendar; charset=utf-8");
      reply.header("Content-Disposition", 'attachment; filename="familyhub.ics"');
      
      return reply.send(ics);
    } catch (error) {
      console.error("ICS Compilation Error:", error);
      return reply.code(500).send({ error: "Failed to generate calendar feed" });
    }
  });

  // POST: /api/events (Create with optional times)
  app.post("/", async (req: any) => {
    ensureTimeColumnsExist();
    const { title, location, member_id, color, dates, time_from, time_to } = req.body;
    const stmt = db.prepare(`
      INSERT INTO events (id, title, location, member_id, color, starts_at, time_from, time_to, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    db.transaction(() => {
      for (const date of dates) { 
        stmt.run(randomUUID(), title, location, member_id, color, date, time_from || "", time_to || ""); 
      }
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
