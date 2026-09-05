// server/routes/calendar.ts
import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import { encryptField, decryptField, decryptRows } from "../lib/crypto.js";

// Helper: Smart NLP Date & Time Extractor from OCR Text
function extractAppointmentDetails(text: string, title: string) {
  const combined = `${title}\n${text}`;
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // 1. Regex Matchers for common UK/US date formats:
  // e.g. 14/10/2026, 14-10-2026, 2026-10-14, 14th October 2026, Oct 14 2026
  const datePatterns = [
    /\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/, // YYYY-MM-DD
    /\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/, // DD/MM/YYYY or MM/DD/YYYY
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b/i, // 14th October 2026
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})\b/i // October 14, 2026
  ];

  const monthMap: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
  };

  let extractedDate: string | null = null;

  for (const pattern of datePatterns) {
    const match = combined.match(pattern);
    if (match) {
      try {
        if (pattern === datePatterns[0]) {
          // YYYY-MM-DD
          extractedDate = `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
        } else if (pattern === datePatterns[1]) {
          // DD/MM/YYYY
          extractedDate = `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
        } else if (pattern === datePatterns[2]) {
          // 14th October 2026
          const m = monthMap[match[2].slice(0, 3).toLowerCase()] || "01";
          extractedDate = `${match[3]}-${m}-${match[1].padStart(2, "0")}`;
        } else if (pattern === datePatterns[3]) {
          // October 14, 2026
          const m = monthMap[match[1].slice(0, 3).toLowerCase()] || "01";
          extractedDate = `${match[3]}-${m}-${match[2].padStart(2, "0")}`;
        }

        // Validate date validity
        const parsed = new Date(`${extractedDate}T00:00:00`);
        if (!isNaN(parsed.getTime()) && extractedDate >= todayStr) {
          break; // Found valid future date!
        } else {
          extractedDate = null; // Discard past dates!
        }
      } catch (e) {
        extractedDate = null;
      }
    }
  }

  // 2. Time Extractor (e.g. 14:30, 2:30pm, 09:15 AM)
  let extractedTime = "";
  const timeMatch = combined.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i) || combined.match(/\b(\d{1,2})\s*(am|pm)\b/i);
  if (timeMatch) {
    let hrs = parseInt(timeMatch[1]);
    const mins = timeMatch[2] && !isNaN(parseInt(timeMatch[2])) ? timeMatch[2] : "00";
    const meridiem = (timeMatch[3] || timeMatch[2] || "").toLowerCase();

    if (meridiem === "pm" && hrs < 12) hrs += 12;
    if (meridiem === "am" && hrs === 12) hrs = 0;
    extractedTime = `${String(hrs).padStart(2, "0")}:${mins.padStart(2, "0")}`;
  }

  // 3. Location Extractor
  let location = "Clinic / Base";
  const locMatch = combined.match(/(?:at|location|venue|hospital|surgery|school|centre|center):\s*([^\n,.]+)/i);
  if (locMatch) {
    location = locMatch[1].trim();
  }

  return {
    date: extractedDate,
    time: extractedTime,
    location
  };
}

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
    inject("source", "TEXT DEFAULT 'manual'");
  };

  // GET: /api/events
  app.get("/", async () => {
    ensureColumnsExist();
    const rows = db.prepare("SELECT * FROM events ORDER BY starts_at ASC, time_from ASC").all() as any[];
    return decryptRows(rows, ["title", "location", "category"]);
  });

  // GET: /api/events/upcoming
  app.get("/upcoming", async () => {
    ensureColumnsExist();
    const rows = db.prepare("SELECT * FROM events WHERE starts_at >= date('now') ORDER BY starts_at ASC, time_from ASC LIMIT 5").all() as any[];
    return decryptRows(rows, ["title", "location", "category"]);
  });

  // iCalendar (.ics) Feed
  app.get("/calendar.ics", async (req: any, reply: any) => {
    try {
      ensureColumnsExist();
      const rawList = db.prepare("SELECT e.*, m.name as member_name FROM events e LEFT JOIN family_members m ON e.member_id = m.id").all() as any[];
      const list = decryptRows(rawList, ["title", "location", "category", "member_name"]);
      
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

  // --- 4. NEW: PAPERLESS-NGX DOCUMENT CONSUMPTION WEBHOOK ---
  app.post("/paperless-webhook", async (req: any, reply: any) => {
    try {
      ensureColumnsExist();
      const body = req.body || {};

      // Paperless-ngx payload extraction (supports title, content, custom_fields)
      const docTitle = body.title || body.document?.title || "Scanned Document";
      const docContent = body.content || body.document?.content || "";

      // Extract details
      const parsed = extractAppointmentDetails(docContent, docTitle);

      // Check if a future valid appointment date was found
      if (!parsed.date) {
        return { 
          success: true, 
          action: "ignored", 
          reason: "No future appointment date found in document or date is in the past." 
        };
      }

      // Check if any hero name is mentioned in the document for auto-assignment
      const members = db.prepare("SELECT id, name, avatar_color FROM family_members").all() as any[];
      let matchedMemberId: string | null = null;
      let matchedMemberColor = "#0284c7";

      for (const m of members) {
        const plainName = decryptField(m.name).toLowerCase();
        if (plainName.length > 2 && (docTitle.toLowerCase().includes(plainName) || docContent.toLowerCase().includes(plainName))) {
          matchedMemberId = m.id;
          matchedMemberColor = m.avatar_color || "#0284c7";
          break;
        }
      }

      // Determine category (e.g. School vs Hospital/Medical vs General)
      let category = "General";
      const lower = `${docTitle} ${docContent}`.toLowerCase();
      if (lower.includes("dentist") || lower.includes("doctor") || lower.includes("hospital") || lower.includes("clinic") || lower.includes("nhs") || lower.includes("medical")) {
        category = "General";
      } else if (lower.includes("school") || lower.includes("class") || lower.includes("teacher") || lower.includes("tuition")) {
        category = "School";
      }

      const questTitle = `📄 ${docTitle}`;
      const eventId = randomUUID();

      db.prepare(`
        INSERT INTO events (id, title, location, member_id, color, starts_at, time_from, time_to, category, is_recurring, source, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, '', ?, 0, 'paperless-ngx', datetime('now'))
      `).run(
        eventId,
        encryptField(questTitle),
        encryptField(parsed.location),
        matchedMemberId,
        matchedMemberColor,
        parsed.date,
        parsed.time,
        encryptField(category)
      );

      // Log notification to Adventure Log
      try {
        db.prepare(`
          INSERT INTO notifications (id, member_id, title, message, type, created_at)
          VALUES (?, ?, ?, ?, 'calendar', datetime('now'))
        `).run(
          randomUUID(),
          matchedMemberId,
          encryptField("Paperless Scanned Quest! 📄"),
          encryptField(`Auto-scheduled "${questTitle}" on ${parsed.date}${parsed.time ? ` at ${parsed.time}` : ""}`),
          "calendar"
        );
      } catch (e) {}

      broadcast("calendar");
      broadcast("notifications");

      console.log(`📄 Paperless-ngx Event Auto-Created: "${questTitle}" on ${parsed.date}`);
      return { 
        success: true, 
        action: "created", 
        eventId, 
        title: questTitle, 
        date: parsed.date, 
        time: parsed.time 
      };
    } catch (error) {
      console.error("❌ Paperless Webhook Error:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // POST: /api/events
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

    const encryptedTitle = encryptField(title.trim());
    const encryptedLocation = encryptField(location ? location.trim() : "");
    const encryptedCategory = encryptField(category || "General");

    db.transaction(() => {
      for (const date of dates) { 
        stmt.run(
          randomUUID(), 
          encryptedTitle, 
          encryptedLocation, 
          member_id || null, 
          color, 
          date, 
          time_from || "", 
          time_to || "", 
          encryptedCategory,
          isRecur,
          finalTileColor
        ); 
      }
    })();

    broadcast("calendar");
    return { success: true };
  });

  // DELETE: /api/events/:id
  app.delete("/:id", async (req: any, reply: any) => {
    if (!req.user || req.user.role !== "admin") {
      return reply.code(403).send({ error: "Only administrators can delete calendar quests" });
    }

    db.prepare("DELETE FROM events WHERE id = ?").run(req.params.id);
    broadcast("calendar");
    return { success: true };
  });

  // DELETE: /api/events/range
  app.delete("/range", async (req: any) => {
    if (!req.user || req.user.role !== "admin") {
      return reply.code(403).send({ error: "Only administrators can clear calendar ranges" });
    }

    const { start, end } = req.query;
    db.prepare("DELETE FROM events WHERE DATE(starts_at) BETWEEN DATE(?) AND DATE(?)").run(start, end);
    broadcast("calendar");
    return { success: true };
  });
}
