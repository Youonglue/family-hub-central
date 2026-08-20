// server/routes/auth.ts
import { randomBytes, scryptSync, timingSafeEqual, randomUUID } from "node:crypto";
import { copyFileSync, mkdirSync, readdirSync, unlinkSync, existsSync, statSync, createReadStream } from "node:fs";
import path from "node:path";
import { db } from "../db.js";

// Cryptographic Hardening: Upgraded cost parameters (N=32768, r=8, p=1)
const SCRYPT_OPTIONS = {
  cost: 32768,
  blockSize: 8,
  parallelization: 1,
  maxmem: 64 * 1024 * 1024
};

function hashSecret(secret: string, salt: string): string {
  return scryptSync(secret, salt, 64, SCRYPT_OPTIONS).toString("hex");
}

// Dual-Compatibility Verifier: Checks both hardened and legacy scrypt hashes safely
function verifySecret(secret: string, storedHashString: string): boolean {
  try {
    if (!storedHashString || typeof storedHashString !== "string") return false;
    const parts = storedHashString.split("$");
    if (parts.length < 3) return false;
    const [, salt, expectedHash] = parts;
    const expectedBuf = Buffer.from(expectedHash, "hex");

    // 1. Try with hardened parameters
    try {
      const attemptHashHardened = scryptSync(secret, salt, 64, SCRYPT_OPTIONS).toString("hex");
      const attemptBufHardened = Buffer.from(attemptHashHardened, "hex");
      if (expectedBuf.length === attemptBufHardened.length && timingSafeEqual(expectedBuf, attemptBufHardened)) {
        return true;
      }
    } catch {}

    // 2. Fallback to default/legacy scrypt parameters for existing accounts
    try {
      const attemptHashLegacy = scryptSync(secret, salt, 64).toString("hex");
      const attemptBufLegacy = Buffer.from(attemptHashLegacy, "hex");
      if (expectedBuf.length === attemptBufLegacy.length && timingSafeEqual(expectedBuf, attemptBufLegacy)) {
        return true;
      }
    } catch {}

    return false;
  } catch {
    return false;
  }
}

// Background Stale Session Purge Utility
function pruneExpiredSessions() {
  try {
    const result = db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();
    if (result.changes > 0) {
      console.log(`🧹 Security Pruner: Evicted ${result.changes} expired session(s)`);
    }
  } catch (e) {}
}

pruneExpiredSessions();
setInterval(pruneExpiredSessions, 60 * 60 * 1000);

export default async function authRoutes(app: any) {
  const getSessionUser = (req: any) => {
    if (req.user) return req.user;
    const token = req.headers.cookie?.match(/fh_sid=([^;]+)/)?.[1];
    if (!token) return null;
    return db.prepare(`
      SELECT u.* FROM sessions s 
      JOIN users u ON s.user_id = u.id 
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `).get(token) as any;
  };

  const ensureRecoverySchema = () => {
    try {
      db.prepare("ALTER TABLE users ADD COLUMN recovery_key_hash TEXT").run();
    } catch (e) {}
    try {
      db.prepare("ALTER TABLE users ADD COLUMN needs_pin_setup INTEGER DEFAULT 0").run();
    } catch (e) {}
  };

  app.get("/me", async (req: any) => {
    ensureRecoverySchema();
    const user = getSessionUser(req);
    const userCount = (db.prepare("SELECT COUNT(*) as n FROM users").get() as any).n;
    if (!user) return { id: null, role: 'guest', first_run: userCount === 0 };
    return { 
      ...user, 
      role: user.role || 'user', 
      has_pin: !!user.pin_hash,
      needs_pin_setup: user.needs_pin_setup === 1 || !user.pin_hash,
      has_recovery_key: !!user.recovery_key_hash,
      ntfy_topic: user.ntfy_topic || ""
    };
  });

  // Rate-limited registration
  app.post("/register", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "1 minute"
      }
    }
  }, async (req: any, reply: any) => {
    const { username, password } = req.body;
    const isFirst = (db.prepare("SELECT COUNT(*) as n FROM users").get() as any).n === 0;
    const salt = randomBytes(16).toString("hex");
    const hash = hashSecret(password, salt);
    const id = randomUUID();
    
    db.prepare(`INSERT INTO users (id, username, password_hash, is_admin, role, needs_pin_setup, created_at) VALUES (?,?,?,?,?,1,datetime('now'))`)
      .run(id, username, `scrypt$${salt}$${hash}`, isFirst ? 1 : 0, isFirst ? 'admin' : 'user');
    
    const token = randomBytes(64).toString("hex");
    db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))").run(token, id);
    reply.header("Set-Cookie", `fh_sid=${token}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Strict`);
    return { success: true };
  });

  // Rate-limited login
  app.post("/login", {
    config: {
      rateLimit: {
        max: 6,
        timeWindow: "1 minute"
      }
    }
  }, async (req: any, reply: any) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
    
    if (user && user.password_hash) {
      const isValid = verifySecret(password, user.password_hash);
      if (isValid) {
        const token = randomBytes(64).toString("hex");
        db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))").run(token, user.id);
        reply.header("Set-Cookie", `fh_sid=${token}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Strict`);
        return { success: true };
      }
    }
    return reply.code(401).send({ error: "Invalid credentials" });
  });

  app.post("/logout", async (req: any, reply: any) => {
    const token = req.headers.cookie?.match(/fh_sid=([^;]+)/)?.[1];
    if (token) {
      db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    }
    reply.header("Set-Cookie", "fh_sid=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict");
    return { success: true };
  });

  // PIN Verification (Supports both new scrypt and legacy hashes)
  app.post("/verify-pin", {
    config: {
      rateLimit: {
        max: 6,
        timeWindow: "1 minute"
      }
    }
  }, async (req: any, reply: any) => {
    const { userId, pin, isSetup } = req.body;
    const activeUser = getSessionUser(req);
    const targetUserId = userId || activeUser?.id;

    if (!targetUserId) {
      return reply.code(400).send({ error: "No user specified" });
    }
    
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(targetUserId) as any;
    if (!user) {
      return reply.code(404).send({ error: "User not found" });
    }

    if (isSetup || !user.pin_hash || user.needs_pin_setup === 1) {
      if (!pin || pin.length !== 6) {
        return reply.code(400).send({ error: "PIN must be 6 digits" });
      }

      const salt = randomBytes(16).toString("hex");
      const hash = hashSecret(pin, salt);
      db.prepare("UPDATE users SET pin_hash = ?, needs_pin_setup = 0 WHERE id = ?").run(`scrypt$${salt}$${hash}`, user.id);
      
      const token = randomBytes(64).toString("hex");
      db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 minutes'))").run(token, user.id);
      
      const linkedHero = db.prepare("SELECT * FROM family_members WHERE user_id = ? OR LOWER(name) = LOWER(?)").get(user.id, user.username) as any;

      reply.header("Set-Cookie", `fh_sid=${token}; Path=/; Max-Age=1800; HttpOnly; SameSite=Strict`);
      return { 
        success: true, 
        setupComplete: true,
        user: { id: user.id, username: user.username, role: user.role },
        member: linkedHero || null 
      };
    }

    const isValid = verifySecret(pin, user.pin_hash);
    if (isValid) {
      const token = randomBytes(64).toString("hex");
      db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 minutes'))").run(token, user.id);
      
      const linkedHero = db.prepare("SELECT * FROM family_members WHERE user_id = ? OR LOWER(name) = LOWER(?)").get(user.id, user.username) as any;

      reply.header("Set-Cookie", `fh_sid=${token}; Path=/; Max-Age=1800; HttpOnly; SameSite=Strict`);
      return { 
        success: true, 
        user: { id: user.id, username: user.username, role: user.role },
        member: linkedHero || null 
      };
    }
    
    return reply.code(401).send({ error: "Wrong PIN" });
  });

  // Emergency Master Recovery Key Generation
  app.post("/generate-recovery-key", async (req: any, reply: any) => {
    try {
      ensureRecoverySchema();
      const user = getSessionUser(req);
      if (!user || user.role !== 'admin') {
        return reply.code(403).send({ error: "Only administrators can generate recovery keys" });
      }

      const rawKey = randomBytes(10).toString("hex").toUpperCase();
      const formattedKey = `FHUB-${rawKey.slice(0, 4)}-${rawKey.slice(4, 8)}-${rawKey.slice(8, 12)}-${rawKey.slice(12, 16)}-${rawKey.slice(16, 20)}`;

      const salt = randomBytes(16).toString("hex");
      const hash = hashSecret(formattedKey.replace(/-/g, ""), salt);
      
      db.prepare("UPDATE users SET recovery_key_hash = ? WHERE id = ?").run(`scrypt$${salt}$${hash}`, user.id);

      return { success: true, key: formattedKey };
    } catch (error) {
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // Emergency Reset using Master Key
  app.post("/emergency-recover", async (req: any, reply: any) => {
    try {
      ensureRecoverySchema();
      const { username, recoveryKey, newPassword, newPin } = req.body;
      if (!username || !recoveryKey || !newPassword) {
        return reply.code(400).send({ error: "Username, Recovery Key, and New Password are required" });
      }

      const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username.trim()) as any;
      if (!user || !user.recovery_key_hash) {
        return reply.code(400).send({ error: "No recovery key active for this account" });
      }

      const cleanInputKey = recoveryKey.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      const isValid = verifySecret(cleanInputKey, user.recovery_key_hash);

      if (!isValid) {
        return reply.code(401).send({ error: "Invalid Recovery Key" });
      }

      const newSalt = randomBytes(16).toString("hex");
      const newPassHash = hashSecret(newPassword, newSalt);

      let newPinHash = null;
      if (newPin && newPin.length === 6) {
        const pinSalt = randomBytes(16).toString("hex");
        newPinHash = `scrypt$${pinSalt}$${hashSecret(newPin, pinSalt)}`;
      }

      db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);

      db.prepare(`
        UPDATE users 
        SET password_hash = ?, pin_hash = ?, needs_pin_setup = ? 
        WHERE id = ?
      `).run(`scrypt$${newSalt}$${newPassHash}`, newPinHash, newPinHash ? 0 : 1, user.id);

      const token = randomBytes(64).toString("hex");
      db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))").run(token, user.id);
      reply.header("Set-Cookie", `fh_sid=${token}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Strict`);

      return { success: true, message: "Account recovered and elevated successfully!" };
    } catch (error) {
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // Automated Snapshot Routes
  app.get("/snapshots", async (req: any, reply: any) => {
    try {
      const user = getSessionUser(req);
      if (!user || user.role !== 'admin') {
        return reply.code(403).send({ error: "Only administrators can access snapshots" });
      }

      const backupDir = path.resolve("./data/backups");
      mkdirSync(backupDir, { recursive: true });

      const files = readdirSync(backupDir)
        .filter(f => f.endsWith(".db"))
        .map(f => {
          const stats = statSync(path.join(backupDir, f));
          return {
            filename: f,
            sizeBytes: stats.size,
            sizeFormatted: (stats.size / 1024 / 1024).toFixed(2) + " MB",
            createdAt: stats.mtime.toISOString(),
          };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return files;
    } catch (error) {
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  app.post("/create-snapshot", async (req: any, reply: any) => {
    try {
      const user = getSessionUser(req);
      if (!user || user.role !== 'admin') {
        return reply.code(403).send({ error: "Only administrators can trigger database backups" });
      }

      const backupDir = path.resolve("./data/backups");
      mkdirSync(backupDir, { recursive: true });

      try {
        db.pragma("wal_checkpoint(TRUNCATE)");
      } catch (e) {}

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupFilename = `familyhub-snap-${timestamp}.db`;
      const backupPath = path.join(backupDir, backupFilename);
      const currentDbPath = path.resolve("./data/familyhub.db");

      if (existsSync(currentDbPath)) {
        copyFileSync(currentDbPath, backupPath);
      }

      const sortedBackups = readdirSync(backupDir)
        .filter(f => f.endsWith(".db"))
        .sort((a, b) => statSync(path.join(backupDir, b)).mtime.getTime() - statSync(path.join(backupDir, a)).mtime.getTime());

      while (sortedBackups.length > 7) {
        const oldest = sortedBackups.pop();
        if (oldest) unlinkSync(path.join(backupDir, oldest));
      }

      return { success: true, filename: backupFilename };
    } catch (error) {
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  app.get("/download-snapshot/:filename", async (req: any, reply: any) => {
    try {
      const user = getSessionUser(req);
      if (!user || user.role !== 'admin') {
        return reply.code(403).send({ error: "Unauthorized" });
      }

      const { filename } = req.params;
      const safeFilename = path.basename(filename);
      const filePath = path.resolve("./data/backups", safeFilename);

      if (!existsSync(filePath)) {
        return reply.code(404).send({ error: "Snapshot file not found" });
      }

      reply.header("Content-Disposition", `attachment; filename="${safeFilename}"`);
      reply.header("Content-Type", "application/x-sqlite3");
      return reply.send(createReadStream(filePath));
    } catch (error) {
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // Change Password Endpoint
  app.post("/change-password", async (req: any, reply: any) => {
    try {
      const user = getSessionUser(req);
      if (!user) {
        return reply.code(401).send({ error: "Unauthorized session" });
      }

      const { currentPassword, newPassword } = req.body;
      if (!newPassword || newPassword.length < 4) {
        return reply.code(400).send({ error: "New password must be at least 4 characters long" });
      }

      if (currentPassword && user.password_hash) {
        const isValid = verifySecret(currentPassword, user.password_hash);
        if (!isValid) {
          return reply.code(400).send({ error: "Current password is incorrect" });
        }
      }

      const newSalt = randomBytes(16).toString("hex");
      const newHash = hashSecret(newPassword, newSalt);
      
      db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(`scrypt$${newSalt}$${newHash}`, user.id);

      const currentToken = req.headers.cookie?.match(/fh_sid=([^;]+)/)?.[1];
      if (currentToken) {
        db.prepare("DELETE FROM sessions WHERE user_id = ? AND token != ?").run(user.id, currentToken);
      }

      return { success: true, message: "Password updated successfully" };
    } catch (error) {
      console.error("Change Password Error:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  app.post("/change-username", async (req: any, reply: any) => {
    try {
      const user = getSessionUser(req);
      if (!user) {
        return reply.code(401).send({ error: "Unauthorized session" });
      }

      const { currentPassword, newUsername } = req.body;
      if (!newUsername || newUsername.trim().length === 0) {
        return reply.code(400).send({ error: "Username cannot be empty" });
      }

      if (currentPassword && user.password_hash) {
        const isValid = verifySecret(currentPassword, user.password_hash);
        if (!isValid) {
          return reply.code(400).send({ error: "Current password is incorrect" });
        }
      }

      db.prepare("UPDATE users SET username = ? WHERE id = ?").run(newUsername.trim(), user.id);
      db.prepare("UPDATE family_members SET name = ? WHERE user_id = ?").run(newUsername.trim(), user.id);

      return { success: true, message: "Username updated successfully" };
    } catch (error) {
      console.error("Change Username Error:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // Set PIN Endpoint
  app.post("/set-pin", async (req: any, reply: any) => {
    const user = getSessionUser(req);
    if (!user) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    try {
      db.prepare("ALTER TABLE users ADD COLUMN needs_pin_setup INTEGER DEFAULT 0").run();
    } catch (e) {}

    const { pin, currentPassword } = req.body;
    if (!pin || pin.length !== 6) {
      return reply.code(400).send({ error: "PIN must be exactly 6 digits" });
    }

    if (currentPassword && user.password_hash) {
      const isValid = verifySecret(currentPassword, user.password_hash);
      if (!isValid) {
        return reply.code(400).send({ error: "Current password is incorrect" });
      }
    }

    const salt = randomBytes(16).toString("hex");
    const hash = hashSecret(pin, salt);
    db.prepare(`UPDATE users SET pin_hash = ?, needs_pin_setup = 0 WHERE id = ?`).run(`scrypt$${salt}$${hash}`, user.id);
    return { success: true };
  });

  app.post("/clear-pin", async (req: any, reply: any) => {
    const user = getSessionUser(req);
    if (!user) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    db.prepare("UPDATE users SET pin_hash = NULL WHERE id = ?").run(user.id);
    return { success: true };
  });

  app.get("/users", async () => {
    return db.prepare("SELECT id, username, role, pin_hash, needs_pin_setup FROM users").all();
  });

  app.get("/pin-status", async (req: any) => {
    try {
      const user = getSessionUser(req);
      if (!user) return { has_pin: false, needs_pin_setup: false };
      return { 
        has_pin: !!user.pin_hash, 
        needs_pin_setup: user.needs_pin_setup === 1 || !user.pin_hash
      };
    } catch (e) {
      return { has_pin: false, needs_pin_setup: false };
    }
  });

  app.post("/set-ntfy-topic", async (req: any, reply: any) => {
    try {
      const user = getSessionUser(req);
      if (!user || user.role !== 'admin') {
        return reply.code(403).send({ error: "Only administrators can configure push settings" });
      }

      try {
        db.prepare("ALTER TABLE users ADD COLUMN ntfy_topic TEXT").run();
      } catch (e) {}

      const { topic } = req.body;
      db.prepare("UPDATE users SET ntfy_topic = ? WHERE id = ?").run(topic ? topic.trim() : null, user.id);

      return { success: true };
    } catch (error) {
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  app.post("/link-member", async (req: any, reply: any) => {
    try {
      const user = getSessionUser(req);
      if (!user || user.role !== 'admin') {
        return reply.code(403).send({ error: "Only administrators can link accounts" });
      }

      const { memberId, userId } = req.body;

      try {
        db.prepare("ALTER TABLE family_members ADD COLUMN user_id TEXT").run();
      } catch (e) {}

      try {
        db.prepare("ALTER TABLE family_members ADD COLUMN role TEXT").run();
      } catch (e) {}

      db.prepare("UPDATE family_members SET user_id = NULL WHERE user_id = ?").run(userId);

      if (memberId) {
        db.prepare("UPDATE family_members SET user_id = ? WHERE id = ?").run(userId, memberId);

        const targetUser = db.prepare("SELECT role FROM users WHERE id = ?").get(userId) as any;
        if (targetUser) {
          db.prepare("UPDATE family_members SET role = ? WHERE id = ?").run(targetUser.role, memberId);
        }
      }

      return { success: true };
    } catch (error) {
      console.error("❌ LINK-MEMBER ERROR:", error);
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  app.delete("/users/:id", async (req: any, reply: any) => {
    const user = getSessionUser(req);
    if (!user || user.role !== 'admin') {
      return reply.code(403).send({ error: "Only administrators can delete user accounts" });
    }

    const { id } = req.params;

    if (user.id === id) {
      return reply.code(400).send({ error: "You cannot delete your own account" });
    }

    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
    db.prepare("UPDATE family_members SET user_id = NULL, role = 'user' WHERE user_id = ?").run(id);

    return { success: true };
  });

  app.post("/promote", async (req: any, reply: any) => {
    const user = getSessionUser(req);
    if (!user || user.role !== 'admin') {
      return reply.code(403).send({ error: "Only administrators can promote users" });
    }

    const { userId } = req.body;
    let targetUserId = userId;
    
    try {
      const member = db.prepare("SELECT * FROM family_members WHERE id = ?").get(userId) as any;
      if (member && member.user_id) {
        targetUserId = member.user_id;
      }
    } catch (e) {}

    db.prepare("UPDATE users SET role = 'admin', is_admin = 1, needs_pin_setup = 1 WHERE id = ?").run(targetUserId);
    try {
      db.prepare("UPDATE family_members SET role = 'admin' WHERE id = ? OR user_id = ?").run(targetUserId, targetUserId);
    } catch (e) {}

    return { success: true };
  });

  app.post("/demote", async (req: any, reply: any) => {
    const user = getSessionUser(req);
    if (!user || user.role !== 'admin') {
      return reply.code(403).send({ error: "Only administrators can demote users" });
    }

    const { userId } = req.body;
    let targetUserId = userId;

    try {
      const member = db.prepare("SELECT * FROM family_members WHERE id = ?").get(userId) as any;
      if (member && member.user_id) {
        targetUserId = member.user_id;
      }
    } catch (e) {}

    if (user.id === targetUserId) {
      return reply.code(400).send({ error: "You cannot demote yourself" });
    }

    const adminCountResult = db.prepare(
      "SELECT COUNT(*) as count FROM users WHERE role = 'admin' OR is_admin = 1"
    ).get() as { count: number };

    if (adminCountResult.count <= 1) {
      return reply.code(400).send({ error: "Cannot demote the last remaining administrator." });
    }

    db.prepare("UPDATE users SET role = 'user', is_admin = 0, pin_hash = NULL, needs_pin_setup = 0 WHERE id = ?").run(targetUserId);
    try {
      db.prepare("UPDATE family_members SET role = 'user' WHERE id = ? OR user_id = ?").run(targetUserId, targetUserId);
    } catch (e) {}
    
    return { success: true };
  });
}
