import { randomUUID } from "node:crypto";
import { db } from "../db.js";

export default async function choreRoutes(app: any, opts: any) {
  const { broadcast } = opts;

  // Self-heal utility to ensure all tables exist before querying
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

    // Self-Heal: Ensure notifications table exists
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
  };

  // Helper to write live notifications directly to the Adventure database log
  const logNotification = (memberId: string | null, title: string, message: string, type: string) => {
    try {
      db.prepare(`
        INSERT INTO notifications (id, member_id, title, message, type, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(randomUUID(), memberId, title, message, type);
    } catch (e) {
      console.error("❌ LOG NOTIFICATION ERROR:", e);
    }
  };

  // 1. GET ALL ACTIVE CHORES
  app.get("/", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      return db.prepare("SELECT * FROM chores WHERE active = 1 ORDER BY points DESC").all();
    } catch (e) {
      console.error("❌ GET CHORES ERROR:", e);
      return [];
    }
  });

  // 2. ADD NEW CHORE
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
  app.delete("/:id", async (req: any) => {
    ensureTablesExist();
    db.prepare("UPDATE chores SET active = 0 WHERE id = ?").run(req.params.id);
    broadcast("chores"); 
    return { success: true };
  });

  // 4. COMPLETE CHORE (Kid side)
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
  app.post("/completions/:id/approve", async (req: any, reply: any) => {
    ensureTablesExist();
    const completionId = req.params.id;
    
    const comp = db.prepare(`
      SELECT cc.*, c.title as chore_title, c.is_boss, c.is_coop 
      FROM chore_completions cc
      JOIN chores c ON cc.chore_id = c.id
      WHERE cc.id = ?
    `).get(completionId) as any;
    
    if (!comp) return reply.code(404).send({ error: "Completion not found" });

    const today = new Date().toLocaleDateString('en-CA');
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');

    let pointsAwarded = comp.points_awarded;
    let xpAwarded = comp.points_awarded;

    if (comp.is_boss === 1) {
      pointsAwarded *= 2;
      xpAwarded *= 2;
    }

    if (comp.is_coop === 1) {
      xpAwarded += 15;
    }

    db.transaction(() => {
      db.prepare("UPDATE chore_completions SET status = 'approved', points_awarded = ?, approved_at = datetime('now') WHERE id = ?")
        .run(pointsAwarded, completionId);
      
      const member = db.prepare("SELECT name, streak_count, last_completion_date FROM family_members WHERE id = ?").get(comp.member_id) as any;
      
      let newStreak = 1;
      let streakBonusXp = 0;

      if (member) {
        if (member.last_completion_date === today) {
          newStreak = member.streak_count || 1;
        } else if (member.last_completion_date === yesterday) {
          newStreak = (member.streak_count || 0) + 1;
          
          if (newStreak === 3) streakBonusXp = 10;
          if (newStreak === 7) streakBonusXp = 30;
        } else {
          newStreak = 1;
        }

        const totalXp = xpAwarded + streakBonusXp;

        // Update Member
        db.prepare(`
          UPDATE family_members 
          SET xp = xp + ?, 
              level = 1 + ((xp + ?) / 100),
              streak_count = ?,
              last_completion_date = ?
          WHERE id = ?
        `).run(totalXp, totalXp, newStreak, today, comp.member_id);

        // A. Log Chore Completion Quest Milestone
        logNotification(
          comp.member_id, 
          "Quest Approved! ⚔️", 
          `"${member.name}" completed "${comp.chore_title}" and earned ${pointsAwarded} pts!`, 
          "chore"
        );

        // B. Log Streak Milestones
        if (streakBonusXp > 0) {
          logNotification(
            comp.member_id,
            "Streak Milestone! 🔥",
            `"${member.name}" hit a ${newStreak}-day streak and earned a +${streakBonusXp} XP milestone bonus!`,
            "streak"
          );
        }
      }
    })();

    broadcast("points"); 
    broadcast("completions"); 
    broadcast("members"); 
    broadcast("notifications");
    return { success: true };
  });

  // 7. POINTS LEADERBOARD (Safely Clamped to Prevent Negative Balances)
  app.get("/points", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      // SQL Case Clamp prevents calculations from returning values below 0
      return db.prepare(`
          SELECT 
            m.id as member_id, m.name, m.avatar_color, m.avatar_icon, m.xp, m.level, m.is_kid, m.is_parent, m.streak_count, m.last_completion_date,
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

  // 8. DEDUCT POINTS (With dynamic log writing and Math.min clamp safeguard)
  app.post("/deduct-points", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      if (!req.user || req.user.role !== 'admin') {
        return reply.code(403).send({ error: "Only administrators can deduct points" });
      }

      const { memberId, points } = req.body;
      const parsedPoints = parseInt(points);

      if (isNaN(parsedPoints) || parsedPoints <= 0) {
        return reply.code(400).send({ error: "Invalid points value" });
      }

      const member = db.prepare("SELECT name FROM family_members WHERE id = ?").get(memberId) as any;
      if (!member) {
        return reply.code(404).send({ error: "Family member not found" });
      }

      // Fetch member's current approved points balance
      const balanceRecord = db.prepare(`
        SELECT 
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
        FROM family_members m WHERE m.id = ?
      `).get(memberId) as any;

      const currentBalance = balanceRecord ? balanceRecord.balance : 0;

      // Anti-Exploit Safeguard: Cap the deduction to their exact remaining balance so they hit 0 instead of a negative number
      const pointsToDeduct = Math.min(currentBalance, parsedPoints);

      if (pointsToDeduct <= 0) {
        return reply.code(400).send({ error: `"${member.name}" already has 0 points! Cannot deduct further.` });
      }

      db.prepare(`
        INSERT INTO redemptions (id, reward_id, member_id, points_spent, status, created_at)
        VALUES (?, 'admin_deduction', ?, ?, 'approved', datetime('now'))
      `).run(randomUUID(), memberId, pointsToDeduct);

      // Log points correction to the Adventure Log
      logNotification(
        memberId, 
        "Points Adjusted! ⚖️", 
        `Parent adjusted "${member.name}" points balance by -${pointsToDeduct} pts.`, 
        "points"
      );

      broadcast("points");
      broadcast("members");
      broadcast("notifications");
      return { success: true };
    } catch (error) {
      console.error("❌ DEDUCT POINTS ERROR:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });
}
