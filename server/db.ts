import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "../data/familyhub.db");

// Ensure the data folder exists so SQLite doesn't crash
mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL"); // High-performance mode

export function initSchema() {
  console.log("🛡️ Hardening Database Schema...");

  // 1. Create Core Tables with full column sets
  db.exec(`
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
      member_id TEXT, 
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS chores (
      id TEXT PRIMARY KEY, 
      title TEXT, 
      points INTEGER, 
      active INTEGER DEFAULT 1, 
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS shopping_items (
      id TEXT PRIMARY KEY, 
      name TEXT, 
      completed INTEGER DEFAULT 0, 
      created_at TEXT
    );
  `);

  // 2. COLUMN INJECTION (The Muscle)
  // If the file already exists, these lines force the new columns into the tables
  const inject = (table: string, col: string, type: string) => {
    try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`); } catch (e) { /* already exists */ }
  };

  inject("users", "role", "TEXT DEFAULT 'user'");
  inject("users", "needs_pin_setup", "INTEGER DEFAULT 0");
  inject("family_members", "avatar_icon", "TEXT DEFAULT 'Ghost'");
  inject("family_members", "xp", "INTEGER DEFAULT 0");
  inject("family_members", "level", "INTEGER DEFAULT 1");

  console.log("✅ Database hardened and ready.");
}
