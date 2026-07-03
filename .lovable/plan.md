## Three additions to Family Hub

### 1. Parent-approved chore completions

Right now `completeChore` awards points instantly. Change to a two-step flow:

- **Kid taps "Done"** → creates a completion row with `status = 'pending'`, `points_awarded = 0`. No leaderboard change yet. UI shows a "Waiting for parent ✋" badge on the chore and in "Recent wins".
- **Parent taps "Approve"** (or "Reject") → sets `status = 'approved'` and awards `points_awarded = chore.points`, or `status = 'rejected'` (no points). Leaderboard, balances, and "Recent wins" only count approved rows.

Details:
- Add a `role` column to `family_members` (`'parent' | 'kid'`, default `'kid'`). Family page gets a toggle. First member auto-becomes parent.
- Add `status` + `approved_by` + `approved_at` columns to `chore_completions`. Existing rows migrate as `approved`.
- New server functions (mirrored in cloud `hub.functions.ts` and LAN `lan-client.ts` + `server/index.js` + `server/schema.sql`): `pendingApprovals()`, `approveCompletion({id, parent_id})`, `rejectCompletion({id, parent_id})`. Update `completeChore` to insert pending. Update `listPoints` / `recentCompletions` to filter by `status='approved'`.
- Chores page gets a new **"Approvals"** tab (visible when there's ≥1 pending) with Approve / Reject buttons — parent-only via a simple "acting as" picker at the top of the page (same pattern as the existing member picker; not real auth, it's a family device).
- Realtime: both cloud `useLiveSync` and LAN `useLanLive` already invalidate on `chore_completions` changes, so approvals push to every device automatically.

### 2. LAN Quick Start guide

Add `QUICKSTART.md` at repo root — a 5-minute path from zero to a working family hub on a Pi/NAS/old laptop. Sections:

1. **What you need** — any Linux box with Docker (Pi 4/5, Synology, Mac mini, old laptop), on the same Wi-Fi as your phones/tablets.
2. **Install in one command** — `curl … | sh` style wrapper around `docker compose up -d` using the published image, plus the manual `git clone` path.
3. **Find it on your network** — `http://familyhub.local:3000` (mDNS), fallback to `http://<box-ip>:3000`, and how to look up the IP on router / `ip a`.
4. **Add it to phones/tablets** — "Add to Home Screen" for iOS and Android so it feels like an app; enable the PWA badge.
5. **Set a family PIN** — uncomment `FAMILY_PIN` in `docker-compose.yml`, restart.
6. **Backups** — where SQLite lives (`familyhub-data` volume), one-line backup + restore commands.
7. **Updating** — `docker compose pull && docker compose up -d`.
8. **Troubleshooting** — port already in use, mDNS not resolving on Android (use IP), clock skew, container logs.

Link it from `README.md` and `SELF_HOST.md` (SELF_HOST becomes the deep reference; QUICKSTART is the friendly on-ramp).

### 3. Secure import / export between devices

Goal: move data (family, chores, rewards, points, shopping, meals, recipes, calendar) between a Lovable Cloud instance and a LAN box, or between two LAN boxes, without exposing it in transit.

Approach — **encrypted JSON backup file**:

- New **Settings** route `/settings` with an **Import / Export** card (accessible from the sidebar).
- **Export**: server function `exportBackup()` returns a bundle `{ version, exported_at, tables: { family_members, chores, rewards, chore_completions, redemptions, shopping_items, recipes, meal_plan, events } }`. Client encrypts it with a **user-supplied passphrase** using WebCrypto AES-GCM with PBKDF2 (200k iterations, random salt, random IV). Downloads as `familyhub-backup-YYYY-MM-DD.fhb` (JSON envelope: `{v, kdf, salt, iv, ciphertext}`).
- **Import**: user picks a `.fhb` file and enters the passphrase. Client decrypts, validates the schema version, then calls `importBackup({data, mode})` where mode is:
  - **Merge** (default) — upsert by natural keys (member name, chore title+points, event start+title, etc.); skips duplicates.
  - **Replace** — wipes existing rows then inserts. Requires typing "REPLACE" to confirm.
- Works in both modes: cloud implementation writes via Supabase with RLS; LAN implementation writes via Fastify to SQLite. Same bundle format on both sides, so a family can start on Lovable Cloud, export, and restore into their LAN box — or vice versa.
- Passphrase is never sent to the server; encryption/decryption happens entirely in the browser. Bundle carries no plaintext PII.
- Extra: a **"Copy backup to another device"** button that generates a short-lived (60s) one-time code shown as a QR — the receiving device on the same LAN scans the QR to pull the encrypted bundle over the WebSocket, still passphrase-locked. Cloud mode falls back to file download only.

### Technical section

- **Migration** (cloud only, applied first): adds `role` to `family_members`; `status`, `approved_by`, `approved_at` to `chore_completions`; backfills existing rows to `approved`; updates the leaderboard/points view to filter `status='approved'`.
- **`server/schema.sql`** (LAN): mirrors the same column additions with `ALTER TABLE … ADD COLUMN IF NOT EXISTS` guards so existing SQLite files upgrade cleanly on container restart.
- **Files touched**:
  - `src/lib/hub.functions.ts`, `src/lib/lan-client.ts`, `src/lib/hub-api.ts` — new `pendingApprovals`, `approveCompletion`, `rejectCompletion`, `updateMemberRole`, `exportBackup`, `importBackup`.
  - `server/index.js` — new `/api/completions/pending`, `/api/completions/:id/approve`, `/api/completions/:id/reject`, `/api/backup/export`, `/api/backup/import`, WS topic `approvals`.
  - `src/routes/_authenticated/chores.tsx` — Approvals tab, pending badges.
  - `src/routes/_authenticated/family.tsx` — role toggle.
  - `src/routes/_authenticated/settings.tsx` (new) — Import / Export UI + WebCrypto helpers in `src/lib/backup-crypto.ts`.
  - `src/components/AppShell.tsx` — Settings nav entry.
  - `QUICKSTART.md` (new), `README.md`, `SELF_HOST.md` — link the quick start.
- **Realtime**: extend `useLiveSync` / `useLanLive` to also invalidate on `family_members` (role changes) and after import (broadcast `bulk-refresh`).

### Order of work

1. Migration + schema.sql updates for approvals.
2. Approval server functions + LAN endpoints + Approvals UI.
3. Role toggle on Family page.
4. Settings route + WebCrypto backup module + export/import server functions.
5. QR-over-WS transfer (LAN only).
6. `QUICKSTART.md` and README links.

Anything I should tweak before I build — e.g. auto-approve chores under a certain point value, per-parent approval instead of any-parent, or dropping the QR transfer to keep scope tight?
