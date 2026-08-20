// server/routes/calendar.ts
import { randomUUID } from "node:crypto";
import { db } from "../db.js";

export default async function calendarRoutes(app: any, opts: any) {
  const { broadcast } = opts;

  const ensureColumnsExist = () => {
    const inject = (col: string, type: string) => {
      try {
        db.prepare(`ALTER TABLE events ADD COLUMN ${col} ${type}`).run();
      } catch (e) {}
    };

    inject("time_from", "TEXT");
    inject("time_to", "TEXT");
    inject("category", "TEXT DEFAULT 'General'");
    inject("is_recurring", "INTEGER DEFAULT 0");
    inject("recurrence_rule", "TEXT");
    inject("tile_color", "TEXT");
  };

  // GET: /api/events (Public/Kiosk Read-Only)
  app.get("/", async () => {
    ensureColumnsExist();
    return db.prepare("SELECT * FROM events ORDER BY starts_at ASC, time_from ASC").all();
  });

  // GET: /api/events/upcoming
  app.get("/upcoming", async () => {
    ensureColumnsExist();
    return db.prepare("SELECT * FROM events WHERE starts_at >= date('now') ORDER BY starts_at ASC, time_from ASC LIMIT 5").all();
  });

  // iCalendar (.ics) Feed: Optimized for Apple & Google Calendar
  app.get("/calendar.ics", async (req: any, reply: any) => {
    try {
      ensureColumnsExist();
      const list = db.prepare("SELECT e.*, m.name as member_name FROM events e LEFT JOIN family_members m ON e.member_id = m.id").all() as any[];
      
      let ics = "BEGIN:VCALENDAR\r\n";
      ics += "VERSION:2.0\r\n";
      ics += "PRODID:-//Family Hub Central//EN\r\n";
      ics += "CALSCALE:GREGORIAN\r\n";
      ics += "METHOD:PUBLISH\r\n";
      ics += "X-WR-CALNAME:Family Hub Quests\r\n";
      ics += "X-WR-TIMEZONE:UTC\r\n";
      ics += "REFRESH-INTERVAL;VALUE=DURATION:PT15M\r\n";
      ics += "X-PUBLISHED-TTL:PT15M\r\n";

      for (const e of list) {
        const dtStamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
        const dateParts = e.starts_at.split("-");
        const year = dateParts[0];
        const month = (dateParts[1] || "01").padStart(2, "0");
        const day = (dateParts[2] || "01").padStart(2, "0");

        let dtStart = "";
        let dtEnd = "";

        if (e.time_from && e.time_from.includes(":")) {
          const startParts = e.time_from.split(":");
          const startHrs = startParts[0].padStart(2, "0");
          const startMins = startParts[1].padStart(2, "0");

          let endHrs = "23";
          let endMins = "59";

          if (e.time_to && e.time_to.includes(":")) {
            const endParts = e.time_to.split(":");
            endHrs = endParts[0].padStart(2, "0");
            endMins = endParts[1].padStart(2, "0");
          } else {
            endHrs = String((parseInt(startHrs) + 1) % 24).padStart(2, "0");
            endMins = startMins;
          }

          dtStart = `${year}${month}${day}T${startHrs}${startMins}00Z`;
          dtEnd = `${year}${month}${day}T${endHrs}${endMins}00Z`;
        } else {
          dtStart = `;VALUE=DATE:${year}${month}${day}`;
          const nextDayDate = new Date(`${year}-${month}-${day}T00:00:00Z`);
          nextDayDate.setUTCDate(nextDayDate.getUTCDate() + 1);
          const nextYear = nextDayDate.getUTCFullYear();
          const nextMonth = String(nextDayDate.getUTCMonth() + 1).padStart(2, "0");
          const nextDay = String(nextDayDate.getUTCDate()).padStart(2, "0");
          dtEnd = `;VALUE=DATE:${nextYear}${nextMonth}${nextDay}`;
        }

        ics += "BEGIN:VEVENT\r\n";
        ics += `UID:${e.id}@familyhub.local\r\n`;
        ics += `DTSTAMP:${dtStamp}\r\n`;
        
        if (e.time_from) {
          ics += `DTSTART:${dtStart}\r\n`;
          ics += `DTEND:${dtEnd}\r\n`;
        } else {
          ics += `DTSTART${dtStart}\r\n`;
          ics += `DTEND${dtEnd}\r\n`;
        }

        const cleanSummary = (e.title || "Family Quest").replace(/[\\;,]/g, " ");
        ics += `SUMMARY:${cleanSummary}${e.member_name ? ` (${e.member_name})` : ""}\r\n`;
        
        if (e.location) {
          ics += `LOCATION:${e.location.replace(/[\\;,]/g, " ")}\r\n`;
        }

        if (e.category) {
          ics += `CATEGORIES:${e.category}\r\n`;
        }

        ics += "STATUS:CONFIRMED\r\n";
        ics += "END:VEVENT\r\n";
      }

      ics += "END:VCALENDAR\r\n";

      reply.header("Content-Type", "text/calendar; charset=utf-8");
      reply.header("Content-Disposition", 'inline; filename="familyhub.ics"');
      reply.header("Cache-Control", "no-cache, no-store, must-revalidate");
      return reply.send(ics);
    } catch (error) {
      console.error("ICS Compilation Error:", error);
      return reply.code(500).send({ error: "Failed to generate calendar feed" });
    }
  });

  // POST: /api/events (Admin Only)
  app.post("/", async (req: any, reply: any) => {
    ensureColumnsExist();
    if (!req.user || req.user.role !== "admin") {
      return reply.code(403).send({ error: "Only administrators can schedule or modify quests" });
    }

    const { title, location, member_id, color, dates, time_from, time_to, category, is_recurring, tile_color } = req.body;
    
    const stmt = db.prepare(`
      INSERT INTO events (id, title, location, member_id, color, starts_at, time_from, time_to, category, is_recurring, tile_color, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const isRecur = is_recurring ? 1 : 0;
    const finalTileColor = tile_color || (isRecur ? color : null);

    db.transaction(() => {
      for (const date of dates) { 
        stmt.run(
          randomUUID(), 
          title.trim(), 
          location ? location.trim() : "", 
          member_id || null, 
          color, 
          date, 
          time_from || "", 
          time_to || "", 
          category || "General",
          isRecur,
          finalTileColor
        ); 
      }
    })();

    broadcast("calendar");
    return { success: true };
  });

  // DELETE: /api/events/:id (Admin Only)
  app.delete("/:id", async (req: any, reply: any) => {
    if (!req.user || req.user.role !== "admin") {
      return reply.code(403).send({ error: "Only administrators can delete calendar quests" });
    }

    db.prepare("DELETE FROM events WHERE id = ?").run(req.params.id);
    broadcast("calendar");
    return { success: true };
  });

  // DELETE: /api/events/range (Admin Only)
  app.delete("/range", async (req: any, reply: any) => {
    if (!req.user || req.user.role !== "admin") {
      return reply.code(403).send({ error: "Only administrators can clear calendar ranges" });
    }

    const { start, end } = req.query;
    db.prepare("DELETE FROM events WHERE DATE(starts_at) BETWEEN DATE(?) AND DATE(?)").run(start, end);
    broadcast("calendar");
    return { success: true };
  });
}
