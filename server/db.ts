import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import { autoSeedRecipes } from "./seed_recipes.js"; // Modular Link

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "../../data/familyhub.db");
mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

export function initSchema() {
  console.log("🛡️ Hardening Database & Plugging in Muscle...");

  // 1. CORE TABLE INITIALIZATION
  db.exec(`
    -- USERS: Security Muscle
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, 
      username TEXT UNIQUE, 
      password_hash TEXT, 
      pin_hash TEXT, 
      is_admin INTEGER DEFAULT 0, 
      role TEXT DEFAULT 'user',
      needs_pin_setup INTEGER DEFAULT 0,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY, 
      user_id TEXT, 
      expires_at TEXT
    );

    -- FAMILY: Recruitment & Gamification Muscle
    CREATE TABLE IF NOT EXISTS family_members (
      id TEXT PRIMARY KEY, 
      name TEXT, 
      avatar_color TEXT, 
      avatar_icon TEXT DEFAULT 'Ghost',
      avatar_url TEXT, 
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      is_kid INTEGER DEFAULT 1, 
      is_parent INTEGER DEFAULT 0, 
      created_at TEXT
    );

    -- CHORES: Task Muscle
    CREATE TABLE IF NOT EXISTS chores (
      id TEXT PRIMARY KEY, 
      title TEXT, 
      points INTEGER, 
      active INTEGER DEFAULT 1, 
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS chore_completions (
      id TEXT PRIMARY KEY, 
      chore_id TEXT, 
      member_id TEXT, 
      points_awarded INTEGER, 
      status TEXT DEFAULT 'pending', 
      approved_by TEXT, 
      approved_at TEXT, 
      completed_at TEXT
    );

    -- MEALS & SHOPPING: Logistics Muscle
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

    CREATE TABLE IF NOT EXISTS shopping_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      created_at TEXT
    );

    -- CALENDAR: Quest Muscle
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY, 
      title TEXT, 
      starts_at TEXT, 
      ends_at TEXT, 
      location TEXT, 
      color TEXT, 
      member_id TEXT, 
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS rewards (
      id TEXT PRIMARY KEY, 
      title TEXT, 
      cost INTEGER, 
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS redemptions (
      id TEXT PRIMARY KEY, 
      reward_id TEXT, 
      member_id TEXT, 
      points_spent INTEGER, 
      redeemed_at TEXT
    );
  `);

  // 2. SCHEMA HARDENING (Emergency Column Injection)
  // If your DB file already exists, this ensures it has the new columns without crashing
  const addColumn = (table: string, column: string, type: string) => {
    try {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
      console.log(`✅ Injected missing column: ${column} into ${table}`);
    } catch (e) {
      // Column already exists, skip silently
    }
  };

  addColumn("users", "role", "TEXT DEFAULT 'user'");
  addColumn("users", "needs_pin_setup", "INTEGER DEFAULT 0");
  addColumn("family_members", "avatar_icon", "TEXT DEFAULT 'Ghost'");
  addColumn("family_members", "xp", "INTEGER DEFAULT 0");
  addColumn("family_members", "level", "INTEGER DEFAULT 1");

  // 3. AUTOMATIC MODULAR SEEDING
  // This calls the code in seed_recipes.ts automatically
  autoSeedRecipes(db);
  
  console.log("✅ Modular Hub Database is ready for action.");
}
