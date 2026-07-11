import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import { autoSeedRecipes } from "./seed_recipes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// MUSCLE: This absolute path prevents "Ghost Databases" from being created elsewhere
const DB_PATH = path.resolve(__dirname, "../data/familyhub.db");

// Ensure the directory exists
mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

export function initSchema() {
  console.log("🛡️ Initializing Fortress Database...");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE, password_hash TEXT, pin_hash TEXT, is_admin INTEGER DEFAULT 0, role TEXT DEFAULT 'user', needs_pin_setup INTEGER DEFAULT 0, created_at TEXT);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT, expires_at TEXT);
    CREATE TABLE IF NOT EXISTS family_members (id TEXT PRIMARY KEY, name TEXT, avatar_color TEXT, avatar_icon TEXT DEFAULT 'Ghost', xp INTEGER DEFAULT 0, level INTEGER DEFAULT 1, is_kid INTEGER DEFAULT 1, is_parent INTEGER DEFAULT 0, created_at TEXT);
    CREATE TABLE IF NOT EXISTS chores (id TEXT PRIMARY KEY, title TEXT, points INTEGER, active INTEGER DEFAULT 1, created_at TEXT);
    CREATE TABLE IF NOT EXISTS chore_completions (id TEXT PRIMARY KEY, chore_id TEXT, member_id TEXT, points_awarded INTEGER, status TEXT DEFAULT 'pending', approved_by TEXT, approved_at TEXT, completed_at TEXT);
    CREATE TABLE IF NOT EXISTS recipes (id TEXT PRIMARY KEY, name TEXT, category TEXT, prep_time INTEGER, instructions TEXT, ingredients TEXT, image_url TEXT, created_at TEXT);
    CREATE TABLE IF NOT EXISTS meal_plan (id TEXT PRIMARY KEY, plan_date TEXT, meal TEXT, recipe_id TEXT, custom_name TEXT, created_at TEXT, UNIQUE(plan_date, meal));
    CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, title TEXT, starts_at TEXT, ends_at TEXT, location TEXT, color TEXT, member_id TEXT, created_at TEXT);
    CREATE TABLE IF NOT EXISTS shopping_items (id TEXT PRIMARY KEY, name TEXT, completed INTEGER DEFAULT 0, created_at TEXT);
  `);

  // Column Injection Muscle
  const inject = (table: string, col: string, type: string) => {
    try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`); } catch (e) {}
  };
  inject("users", "role", "TEXT DEFAULT 'user'");
  inject("users", "needs_pin_setup", "INTEGER DEFAULT 0");
  inject("family_members", "avatar_icon", "TEXT DEFAULT 'Ghost'");
  inject("family_members", "xp", "INTEGER DEFAULT 0");
  inject("family_members", "level", "INTEGER DEFAULT 1");

  // SEEDER LINK
  autoSeedRecipes(db);

  console.log("✅ Database Engine Online.");
}
