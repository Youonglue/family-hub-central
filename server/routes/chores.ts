// server/routes/chores.ts
import { randomUUID } from "node:crypto";
import { db } from "../db.js";

export default async function choreRoutes(app: any, opts: any) {
  const { broadcast } = opts;

  const ensureTablesExist = () => {
    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS chores (
          id TEXT PRIMARY KEY,
          title TEXT,
          points INTEGER,
          xp INTEGER,
          active INTEGER DEFAULT 1,
          is_boss INTEGER DEFAULT 0,
          is_coop INTEGER DEFAULT 0,
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
          xp_awarded INTEGER,
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

    const injectChore = (col: string, type: string) => {
      try {
        db.prepare(`ALTER TABLE chores ADD COLUMN ${col} ${type}`).run();
      } catch (e) {}
    };

    injectChore("xp", "INTEGER");
    injectChore("is_boss", "INTEGER DEFAULT 0");
    injectChore("is_coop", "INTEGER DEFAULT 0");

    const injectComp = (col: string, type: string) => {
      try {
        db.prepare(`ALTER TABLE chore_completions ADD COLUMN ${col} ${type}`).run();
      } catch (e) {}
    };
    injectComp("xp_awarded", "INTEGER");

    try {
      db.prepare("ALTER TABLE family_members ADD COLUMN show_on_leaderboard INTEGER DEFAULT 1").run();
    } catch (e) {}
    try {
      db.prepare("ALTER TABLE family_members ADD COLUMN show_on_dashboard INTEGER DEFAULT 1").run();
    } catch (e) {}
    try {
      db.prepare("ALTER TABLE family_members ADD COLUMN streak_count INTEGER DEFAULT 0").run();
    } catch (e) {}
    try {
      db.prepare("ALTER TABLE family_members ADD COLUMN last_completion_date TEXT").run();
    } catch (e) {}

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
    const { title, points, xp, is_boss, is_coop } = req.body;
    const finalPoints = parseInt(points) || 10;
    const finalXp = xp !== undefined && xp !== "" ? (parseInt(xp) || 0) : finalPoints;

    db.prepare(`
      INSERT INTO chores (id, title, points, xp, active, is_boss, is_coop, created_at) 
      VALUES (?, ?, ?, ?, 1, ?, ?, datetime('now'))
    `).run(
      randomUUID(), 
      title.trim(), 
      finalPoints, 
      finalXp, 
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

  // 4. COMPLETE CHORE
  app.post("/:id/complete", async (req: any) => {
    ensureTablesExist();
    const chore = db.prepare("SELECT points, xp, is_boss, is_coop FROM chores WHERE id = ?").get(req.params.id) as any;
    const basePoints = chore.points || 0;
    const baseXp = chore.xp !== null && chore.xp !== undefined ? chore.xp : basePoints;

    db.prepare(`
      INSERT INTO chore_completions (id, chore_id, member_id, points_awarded, xp_awarded, status, completed_at) 
      VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))
    `).run(randomUUID(), req.params.id, req.body.member_id, basePoints, baseXp);
    
    broadcast("completions"); 
    return { success: true };
  });

  // 5. GET PENDING APPROVALS
  app.get("/completions/pending", async () => {
    ensureTablesExist();
    return db.prepare(`
      SELECT cc.*, c.title as chore_title, c.is_boss, c.is_coop, c.points as base_points, c.xp as base_xp, m.name as member_name 
      FROM chore_completions cc 
      JOIN chores c ON cc.chore_id = c.id 
      JOIN family_members m ON cc.member_id = m.id 
      WHERE cc.status = 'pending'
    `).all();
  });

  // 6. APPROVE CHORE (Boss: x3 Points & 1x XP; Co-Op: x2 Points & x2 XP)
  app.post("/completions/:id/approve", async (req: any, reply: any) => {
    ensureTablesExist();
    const completionId = req.params.id;
    
    const comp = db.prepare(`
      SELECT cc.*, c.title as chore_title, c.is_boss, c.is_coop, c.points as base_points, c.xp as base_xp 
      FROM chore_completions cc
      JOIN chores c ON cc.chore_id = c.id
      WHERE cc.id = ?
    `).get(completionId) as any;
    
    if (!comp) return reply.code(404).send({ error: "Completion not found" });

    const today = new Date().toLocaleDateString('en-CA');
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');

    let basePoints = comp.base_points !== undefined ? comp.base_points : comp.points_awarded;
    let baseXp = comp.base_xp !== null && comp.base_xp !== undefined ? comp.base_xp : basePoints;

    let pointsAwarded = basePoints;
    let xpAwarded = baseXp;

    if (comp.is_boss === 1) {
      pointsAwarded = basePoints * 3;
      xpAwarded = baseXp;
    }

    if (comp.is_coop === 1) {
      pointsAwarded = basePoints * 2;
      xpAwarded = baseXp * 2;
    }

    db.transaction(() => {
      db.prepare("UPDATE chore_completions SET status = 'approved', points_awarded = ?, xp_awarded = ?, approved_at = datetime('now') WHERE id = ?")
        .run(pointsAwarded, xpAwarded, completionId);
      
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

        db.prepare(`
          UPDATE family_members 
          SET xp = xp + ?, 
              level = 1 + ((xp + ?) / 100),
              streak_count = ?,
              last_completion_date = ?
          WHERE id = ?
        `).run(totalXp, totalXp, newStreak, today, comp.member_id);

        logNotification(
          comp.member_id, 
          "Quest Approved! ⚔️", 
          `"${member.name}" completed "${comp.chore_title}" (+${pointsAwarded} pts, +${totalXp} XP)!`, 
          "chore"
        );

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
    return { success: true, pointsAwarded, xpAwarded };
  });

  // 7. POINTS LEADERBOARD (STRICTLY FILTERS OUT HIDDEN HEROES)
  app.get("/points", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      return db.prepare(`
          SELECT 
            m.id as member_id, m.name, m.avatar_color, m.avatar_icon, m.avatar_config, m.xp, m.level, m.is_kid, m.is_parent, m.streak_count, m.last_completion_date,
            m.show_on_dashboard, m.show_on_chores, m.show_on_rewards, m.show_on_kiosk, m.show_on_leaderboard,
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
          WHERE (m.show_on_dashboard != 0 OR m.show_on_dashboard IS NULL)
            AND (m.show_on_leaderboard != 0 OR m.show_on_leaderboard IS NULL)
          ORDER BY m.xp DESC
      `).all();
    } catch (error) {
      console.error("❌ CHORES LEADERBOARD ERROR:", error);
      return [];
    }
  });

  // 8. DEDUCT POINTS
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
      const pointsToDeduct = Math.min(currentBalance, parsedPoints);

      if (pointsToDeduct <= 0) {
        return reply.code(400).send({ error: `"${member.name}" already has 0 points! Cannot deduct further.` });
      }

      db.prepare(`
        INSERT INTO redemptions (id, reward_id, member_id, points_spent, status, created_at)
        VALUES (?, 'admin_deduction', ?, ?, 'approved', datetime('now'))
      `).run(randomUUID(), memberId, pointsToDeduct);

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

  // 9. REJECT/DECLINE CHORE COMPLETION
  app.post("/completions/:id/reject", async (req: any, reply: any) => {
    try {
      ensureTablesExist();
      if (!req.user || req.user.role !== 'admin') {
        return reply.code(403).send({ error: "Only administrators can reject quest completions" });
      }

      const completionId = req.params.id;
      let memberId = null;
      let memberName = "Hero";
      let choreTitle = "Quest";

      try {
        const comp = db.prepare(`
          SELECT cc.*, c.title as chore_title, m.name as member_name 
          FROM chore_completions cc 
          JOIN chores c ON cc.chore_id = c.id 
          JOIN family_members m ON cc.member_id = m.id 
          WHERE cc.id = ?
        `).get(completionId) as any;

        if (comp) {
          memberId = comp.member_id;
          memberName = comp.member_name;
          choreTitle = comp.chore_title;
        }
      } catch (e) {}

      db.prepare("DELETE FROM chore_completions WHERE id = ?").run(completionId);

      try {
        db.prepare(`
          INSERT INTO notifications (id, member_id, title, message, type, created_at)
          VALUES (?, ?, ?, ?, 'chore', datetime('now'))
        `).run(randomUUID(), memberId, "Quest Declined ❌", `"${memberName}"'s quest "${choreTitle}" was declined by parent.`, "chore");
      } catch (e) {}

      broadcast("points");
      broadcast("completions");
      broadcast("members");
      broadcast("notifications");
      
      return { success: true };
    } catch (error) {
      console.error("❌ REJECT CHORE COMPLETION ERROR:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });
}
