// server/db.ts
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import { autoSeedRecipes } from "./seed_recipes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Absolute path prevents ghost databases
const DB_PATH = path.resolve(__dirname, "../data/familyhub.db");

mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");
db.pragma("synchronous = NORMAL");

export function initSchema() {
  console.log("🛡️ Initializing Fortress Database...");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, 
      username TEXT UNIQUE, 
      password_hash TEXT, 
      pin_hash TEXT, 
      is_admin INTEGER DEFAULT 0, 
      role TEXT DEFAULT 'user', 
      needs_pin_setup INTEGER DEFAULT 0, 
      recovery_key_hash TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY, 
      user_id TEXT, 
      expires_at TEXT
    );

    CREATE TABLE IF NOT EXISTS trusted_devices (
      id TEXT PRIMARY KEY,
      device_name TEXT,
      device_token TEXT UNIQUE,
      ip_address TEXT,
      user_agent TEXT,
      paired_by TEXT,
      is_trusted INTEGER DEFAULT 1,
      last_active TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS pairing_requests (
      id TEXT PRIMARY KEY,
      pairing_code TEXT UNIQUE,
      device_name TEXT,
      ip_address TEXT,
      user_agent TEXT,
      status TEXT DEFAULT 'pending',
      device_token TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS family_members (
      id TEXT PRIMARY KEY, 
      name TEXT, 
      avatar_color TEXT, 
      avatar_icon TEXT DEFAULT 'Ghost', 
      avatar_config TEXT,
      xp INTEGER DEFAULT 0, 
      level INTEGER DEFAULT 1, 
      is_kid INTEGER DEFAULT 1, 
      is_parent INTEGER DEFAULT 0,
      show_on_leaderboard INTEGER DEFAULT 1,
      show_on_dashboard INTEGER DEFAULT 1,
      show_on_chores INTEGER DEFAULT 1,
      show_on_rewards INTEGER DEFAULT 1,
      show_on_kiosk INTEGER DEFAULT 1,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS chores (
      id TEXT PRIMARY KEY, 
      title TEXT, 
      points INTEGER, 
      xp INTEGER,
      active INTEGER DEFAULT 1, 
      is_boss INTEGER DEFAULT 0,
      is_coop INTEGER DEFAULT 0,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS chore_completions (
      id TEXT PRIMARY KEY, 
      chore_id TEXT, 
      member_id TEXT, 
      points_awarded INTEGER, 
      xp_awarded INTEGER,
      status TEXT DEFAULT 'pending', 
      approved_by TEXT, 
      approved_at TEXT, 
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY, 
      name TEXT, 
      category TEXT, 
      prep_time INTEGER, 
      instructions TEXT, 
      ingredients TEXT, 
      image_url TEXT, 
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS meal_plan (
      id TEXT PRIMARY KEY, 
      plan_date TEXT, 
      meal TEXT, 
      recipe_id TEXT, 
      custom_name TEXT, 
      created_at TEXT, 
      UNIQUE(plan_date, meal)
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY, 
      title TEXT, 
      starts_at TEXT, 
      ends_at TEXT, 
      location TEXT, 
      color TEXT, 
      tile_color TEXT,
      member_id TEXT, 
      time_from TEXT,
      time_to TEXT,
      category TEXT DEFAULT 'General',
      is_recurring INTEGER DEFAULT 0,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS shopping_items (
      id TEXT PRIMARY KEY, 
      name TEXT, 
      checked INTEGER DEFAULT 0,
      quantity TEXT,
      category TEXT,
      created_at TEXT
    );
  `);

  const inject = (table: string, col: string, type: string) => {
    try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`); } catch (e) {}
  };

  inject("users", "role", "TEXT DEFAULT 'user'");
  inject("users", "needs_pin_setup", "INTEGER DEFAULT 0");
  inject("users", "recovery_key_hash", "TEXT");
  inject("family_members", "avatar_icon", "TEXT DEFAULT 'Ghost'");
  inject("family_members", "avatar_config", "TEXT");
  inject("family_members", "xp", "INTEGER DEFAULT 0");
  inject("family_members", "level", "INTEGER DEFAULT 1");
  inject("family_members", "show_on_dashboard", "INTEGER DEFAULT 1");
  inject("family_members", "show_on_chores", "INTEGER DEFAULT 1");
  inject("family_members", "show_on_rewards", "INTEGER DEFAULT 1");
  inject("family_members", "show_on_kiosk", "INTEGER DEFAULT 1");

  autoSeedRecipes(db);
  console.log("✅ Database Engine Online.");
}
