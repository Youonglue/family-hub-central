-- Family Hub — local SQLite schema.
-- Runs at container start. Idempotent. Safe on upgrade of existing databases.

CREATE TABLE IF NOT EXISTS family_members (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT 'amber',
  is_kid       INTEGER NOT NULL DEFAULT 1,
  is_parent    INTEGER NOT NULL DEFAULT 0,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chores (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  points      INTEGER NOT NULL DEFAULT 10,
  member_id   TEXT REFERENCES family_members(id) ON DELETE SET NULL,
  recurrence  TEXT NOT NULL DEFAULT 'daily' CHECK (recurrence IN ('daily','weekly','once')),
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chore_completions (
  id             TEXT PRIMARY KEY,
  chore_id       TEXT NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
  member_id      TEXT NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  points_awarded INTEGER NOT NULL,
  status         TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected')),
  approved_by    TEXT REFERENCES family_members(id) ON DELETE SET NULL,
  approved_at    TEXT,
  completed_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rewards (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  cost_points INTEGER NOT NULL DEFAULT 100,
  icon        TEXT,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS redemptions (
  id           TEXT PRIMARY KEY,
  reward_id    TEXT NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  member_id    TEXT NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  points_spent INTEGER NOT NULL,
  redeemed_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shopping_items (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  quantity    TEXT,
  category    TEXT DEFAULT 'general',
  checked     INTEGER NOT NULL DEFAULT 0,
  checked_at  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recipes (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  notes       TEXT,
  ingredients TEXT NOT NULL DEFAULT '[]',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS meal_plan (
  id          TEXT PRIMARY KEY,
  plan_date   TEXT NOT NULL,
  meal        TEXT NOT NULL CHECK (meal IN ('breakfast','lunch','dinner')),
  recipe_id   TEXT REFERENCES recipes(id) ON DELETE SET NULL,
  custom_name TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(plan_date, meal)
);

CREATE TABLE IF NOT EXISTS events (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  starts_at  TEXT NOT NULL,
  ends_at    TEXT,
  location   TEXT,
  member_id  TEXT REFERENCES family_members(id) ON DELETE SET NULL,
  color      TEXT DEFAULT 'sky',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_completions_member ON chore_completions(member_id);
CREATE INDEX IF NOT EXISTS idx_completions_status ON chore_completions(status);
CREATE INDEX IF NOT EXISTS idx_redemptions_member ON redemptions(member_id);
CREATE INDEX IF NOT EXISTS idx_events_starts     ON events(starts_at);
CREATE INDEX IF NOT EXISTS idx_meal_plan_date    ON meal_plan(plan_date);
