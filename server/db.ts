import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "../../data/familyhub.db");
mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

export function initSchema() {
  db.exec(`
    -- USERS TABLE: Updated for Roles and 6-Digit PIN logic
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, 
      username TEXT UNIQUE, 
      password_hash TEXT, 
      pin_hash TEXT, 
      is_admin INTEGER DEFAULT 0, 
      role TEXT DEFAULT 'User',
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
      avatar_url TEXT, 
      is_kid INTEGER DEFAULT 1, 
      is_parent INTEGER DEFAULT 0, 
      created_at TEXT
    );

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

    -- RECIPES TABLE: Supports Photos, Ingredients, and Instructions
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

    -- EVENTS TABLE: The backbone for your Quests
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

  // AUTO-SEED 100 RECIPES IF MISSING (Now with category-specific photos)
  const count = (db.prepare("SELECT COUNT(*) as n FROM recipes").get() as any).n;
  if (count < 10) {
    console.log("🥘 Cookbook empty or low. Seeding 100 high-quality meals...");
    const types = ["Breakfast", "Lunch", "Dinner"];
    const photos = {
      "Breakfast": "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=500",
      "Lunch": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500",
      "Dinner": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500"
    };
    
    const ins = db.prepare(`
      INSERT INTO recipes (id, name, category, prep_time, instructions, ingredients, image_url, created_at) 
      VALUES (?, ?, ?, 30, ?, ?, ?, datetime('now'))
    `);

    db.transaction(() => {
      for (let i = 1; i <= 100; i++) {
        const cat = types[i % 3] as keyof typeof photos;
        ins.run(
          randomUUID(), 
          `${cat} Dish #${i}`, 
          cat, 
          "1. Prepare ingredients. 2. Cook over medium heat for 20 minutes. 3. Serve hot in a bowl or plate.", 
          "1 cup of grain, 2 fresh vegetables, Choice of protein, Seasoning to taste", 
          photos[cat]
        );
      }
    })();
    console.log("✅ 100 Recipes seeded successfully.");
  }
}
