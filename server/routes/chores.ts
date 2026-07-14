import { randomUUID } from "node:crypto";
import { db } from "../db.js";

export default async function choreRoutes(app: any, opts: any) {
  const { broadcast } = opts;

  // Self-heal utility to ensure all tables and columns exist before querying
  const ensureTablesExist = () => {
    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS chores (
          id TEXT PRIMARY KEY,
          title TEXT,
          points INTEGER,
          active INTEGER,
          created_at TEXT
        )
      `).run();
    } catch (e) {}

    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS chore_completions (
          id TEXT PRIMARY KEY,
          chore_id TEXT,
          member_id TEXT,
          points_awarded INTEGER,
          status TEXT,
          completed_at TEXT,
          approved_at TEXT
        )
      `).run();
    } catch (e) {}

    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS redemptions (
          id TEXT PRIMARY KEY,
          reward_id TEXT,
          member_id TEXT,
          points_spent INTEGER,
          created_at TEXT
        )
      `).run();
    } catch (e) {}

    // Self-Heal: Ensure 'show_on_leaderboard' column exists in family_members table
    try {
      db.prepare("ALTER TABLE family_members ADD COLUMN show_on_leaderboard INTEGER DEFAULT 1").run();
    } catch (e) {}

    // Self-Heal: Ensure 'is_boss' and 'is_coop' exist in chores table
    try {
      db.prepare("ALTER TABLE chores ADD COLUMN is_boss INTEGER DEFAULT 0").run();
    } catch (e) {}
    try {
      db.prepare("ALTER TABLE chores ADD COLUMN is_coop INTEGER DEFAULT 0").run();
    } catch (e) {}

    // Self-Heal: Ensure streak columns exist on family_members table
    try {
      db.prepare("ALTER TABLE family_members ADD COLUMN streak_count INTEGER DEFAULT 0").run();
    } catch (e) {}
    try {
      db.prepare("ALTER TABLE family_members ADD COLUMN last_completion_date TEXT").run();
    } catch (e) {}
  };

  // 1. GET ALL ACTIVE CHORES
  // Final Path: GET /api/chores
  app.get("/", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      return db.prepare("SELECT * FROM chores WHERE active = 1 ORDER BY points DESC").all();
    } catch (e) {
      console.error("❌ GET CHORES ERROR:", e);
      return [];
    }
  });

  // 2. ADD NEW CHORE (Saves Boss and Co-Op parameters)
  // Final Path: POST /api/chores
  app.post("/", async (req: any) => {
    ensureTablesExist();
    const { title, points, is_boss, is_coop } = req.body;
    db.prepare(`
      INSERT INTO chores (id, title, points, active, is_boss, is_coop, created_at) 
      VALUES (?, ?, ?, 1, ?, ?, datetime('now'))
    `).run(
      randomUUID(), 
      title, 
      points, 
      is_boss ? 1 : 0, 
      is_coop ? 1 : 0
    );
    
    broadcast("chores"); 
    return { success: true };
  });

  // 3. DELETE CHORE
  // Final Path: DELETE /api/chores/:id
  app.delete("/:id", async (req: any) => {
    ensureTablesExist();
    db.prepare("UPDATE chores SET active = 0 WHERE id = ?").run(req.params.id);
    broadcast("chores"); 
    return { success: true };
  });

  // 4. COMPLETE CHORE (Kid side)
  // Final Path: POST /api/chores/:id/complete
  app.post("/:id/complete", async (req: any) => {
    ensureTablesExist();
    const chore = db.prepare("SELECT points FROM chores WHERE id = ?").get(req.params.id) as any;
    db.prepare(`
      INSERT INTO chore_completions (id, chore_id, member_id, points_awarded, status, completed_at) 
      VALUES (?, ?, ?, ?, 'pending', datetime('now'))
    `).run(randomUUID(), req.params.id, req.body.member_id, chore.points);
    
    broadcast("completions"); 
    return { success: true };
  });

  // 5. GET PENDING APPROVALS
  // Final Path: GET /api/chores/completions/pending
  app.get("/completions/pending", async () => {
    ensureTablesExist();
    return db.prepare(`
      SELECT cc.*, c.title as chore_title, c.is_boss, c.is_coop, m.name as member_name 
      FROM chore_completions cc 
      JOIN chores c ON cc.chore_id = c.id 
      JOIN family_members m ON cc.member_id = m.id 
      WHERE cc.status = 'pending'
    `).all();
  });

  // 6. APPROVE CHORE (Award XP, process Boss multipliers, Co-op Synergy, and Streak bonuses)
  // Final Path: POST /api/chores/completions/:id/approve
  app.post("/completions/:id/approve", async (req: any, reply: any) => {
    ensureTablesExist();
    const completionId = req.params.id;
    
    // Get completion and corresponding chore properties
    const comp = db.prepare(`
      SELECT cc.*, c.is_boss, c.is_coop 
      FROM chore_completions cc
      JOIN chores c ON cc.chore_id = c.id
      WHERE cc.id = ?
    `).get(completionId) as any;
    
    if (!comp) return reply.code(404).send({ error: "Completion not found" });

    // Establish timezone-safe local dates (YYYY-MM-DD)
    const today = new Date().toLocaleDateString('en-CA');
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');

    // Calculate dynamic base points and XP bonuses
    let pointsAwarded = comp.points_awarded;
    let xpAwarded = comp.points_awarded;

    // A. Boss Multiplier (2x Points and XP)
    if (comp.is_boss === 1) {
      pointsAwarded *= 2;
      xpAwarded *= 2;
    }

    // B. Co-Op Synergy Bonus (+15 XP)
    if (comp.is_coop === 1) {
      xpAwarded += 15;
    }

    db.transaction(() => {
      // Approve completion and save the actual final points awarded in completions history
      db.prepare("UPDATE chore_completions SET status = 'approved', points_awarded = ?, approved_at = datetime('now') WHERE id = ?")
        .run(pointsAwarded, completionId);
      
      // Fetch member's current streak details
      const member = db.prepare("SELECT streak_count, last_completion_date FROM family_members WHERE id = ?").get(comp.member_id) as any;
      
      let newStreak = 1;
      let streakBonusXp = 0;

      if (member) {
        if (member.last_completion_date === today) {
          // If they already completed a chore today, maintain the current streak
          newStreak = member.streak_count || 1;
        } else if (member.last_completion_date === yesterday) {
          // If the last completion was yesterday, increment the streak
          newStreak = (member.streak_count || 0) + 1;
          
          // Streak Milestone Bonuses
          if (newStreak === 3) streakBonusXp = 10;
          if (newStreak === 7) streakBonusXp = 30;
        } else {
          // Streak was broken, reset back to 1 day
          newStreak = 1;
        }
      }

      const totalXp = xpAwarded + streakBonusXp;

      // Update XP, Level, and Streak details inside transaction
      db.prepare(`
        UPDATE family_members 
        SET xp = xp + ?, 
            level = 1 + ((xp + ?) / 100),
            streak_count = ?,
            last_completion_date = ?
        WHERE id = ?
      `).run(totalXp, totalXp, newStreak, today, comp.member_id);
    })();

    broadcast("points"); 
    broadcast("completions"); 
    broadcast("members"); 
    return { success: true };
  });

  // 7. POINTS LEADERBOARD (Safe, Try-Capped, and Filtered by show_on_leaderboard)
  // Final Path: GET /api/chores/points
  app.get("/points", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      return db.prepare(`
          SELECT 
            m.id as member_id, m.name, m.avatar_color, m.avatar_icon, m.xp, m.level, m.is_kid, m.is_parent, m.streak_count, m.last_completion_date,
            (COALESCE((SELECT SUM(points_awarded) FROM chore_completions WHERE member_id = m.id AND status = 'approved'), 0) - 
             COALESCE((SELECT SUM(points_spent) FROM redemptions WHERE member_id = m.id), 0)) as balance
          FROM family_members m 
          WHERE m.show_on_leaderboard = 1 OR m.show_on_leaderboard IS NULL
          ORDER BY m.xp DESC
      `).all();
    } catch (error) {
      console.error("❌ CHORES LEADERBOARD ERROR:", error);
      
      try {
        return db.prepare(`
          SELECT id as member_id, name, avatar_color, avatar_icon, xp, level, is_kid, is_parent, 0 as balance, 0 as streak_count
          FROM family_members
          WHERE show_on_leaderboard = 1 OR show_on_leaderboard IS NULL
          ORDER BY xp DESC
        `).all();
      } catch (err) {
        return [];
      }
    }
  });
}
