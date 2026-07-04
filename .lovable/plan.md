# Fully Local: Node + SQLite, No Supabase

Goal: rip Supabase out of the runtime path so the app runs entirely on your home server. One process serves the built React app AND the API AND the WebSocket, and stores everything in a single SQLite file inside the project.

## What changes

### 1. Backend — one Node process, SQLite on disk
- Keep the existing `server/` folder (Fastify + `better-sqlite3` + `@fastify/websocket` are already wired for your LAN mode). Fastify is Express-compatible and already integrated — swapping to Express would be busywork with no user-visible benefit. I'll call it "the Node server" in the README so the terminology matches your request.
- Add a `users` table + username/password auth (bcrypt hash, signed httpOnly session cookie). Endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`. First user registered becomes the parent/admin; subsequent registrations require being signed in as a parent (prevents randos on your LAN creating accounts).
- All existing `/api/*` routes stay; add a session-check hook so they require a logged-in user.
- SQLite file path: `./data/familyhub.db` at the project root (created on first boot). Configurable via `DATA_DIR` env var; default resolves to `<project>/data` so it writes to your server's storage exactly where you expect.
- Serve the built SPA (`dist/`) from the same Node server so it's one port, one process.

### 2. Frontend — remove Supabase entirely
- Delete `src/integrations/supabase/` (client, client.server, auth-middleware, auth-attacher, types).
- Delete `supabase/` migrations folder and `supabase/config.toml`.
- Delete cloud-only code: `src/lib/hub.functions.ts`, `src/hooks/useLiveSync.ts`, the `HUB_MODE` switch, and the TanStack Start server-function plumbing that assumed Supabase (`src/start.ts` bearer attacher, `_authenticated/route.tsx` Supabase gate).
- `src/lib/hub-api.ts` becomes a thin re-export of `lan-client.ts` (the LAN client is already the full API surface).
- Auth page (`src/routes/auth.tsx`): real username/password form that hits `/api/auth/login` and `/api/auth/register`. Cookie-based session — no more `localStorage.fake_session`.
- `_authenticated` gate: fetch `/api/auth/me`; redirect to `/auth` if 401.
- Drop `@supabase/*`, `@supabase/ssr` from `package.json`.

### 3. Build & run — Vite SPA + Node server
- Switch `vite.config.ts` to a plain SPA build (no TanStack Start SSR, no Cloudflare Worker target). SSR was there for Supabase/Lovable Cloud; a local home server doesn't need it and it complicates the Node runtime.
- `npm run build` → outputs `dist/`. Node server serves `dist/` in production.
- Dev: two commands (`npm run dev` for Vite on 5173 with API proxy → 3000, `npm run server` for Node). Prod: one command (`npm start`).

### 4. README.md — exact commands
Rewrite the README with:
- Prerequisites (Node 20+)
- `git clone` / `cd`
- `npm install` (root) and `cd server && npm install`
- `npm run build`
- `npm start` (starts Node server on port 3000, serves SPA + API + WS)
- How to open `http://<server-ip>:3000` from any device on your LAN
- Where the DB file lives (`./data/familyhub.db`), how to back it up (just copy the file), how to reset (delete it)
- Optional: `pm2` / `systemd` snippet to keep it running on boot
- Dev mode section for making changes

## Technical section

```text
project/
├── data/familyhub.db          ← SQLite, created on first run
├── dist/                      ← Vite build output, served by Node
├── server/
│   ├── index.js               ← Fastify + WS + auth + static
│   ├── schema.sql             ← + users table
│   └── package.json
├── src/                       ← React app, no Supabase imports
└── README.md
```

Auth flow: bcrypt(password) stored in `users.password_hash`. Login issues a random 32-byte session token, stored server-side in a `sessions` table with 30-day expiry, sent as `HttpOnly; SameSite=Lax` cookie. Every `/api/*` request (except `/api/auth/*`) checks the cookie.

Files touched:
- **Create**: `server/auth.js`, updated `server/schema.sql`, new `README.md`.
- **Modify**: `server/index.js`, `server/package.json` (add bcrypt), `src/routes/auth.tsx`, `src/routes/_authenticated/route.tsx`, `src/lib/hub-api.ts`, `src/lib/lan-client.ts` (add auth calls), `package.json`, `vite.config.ts`, `src/router.tsx`, `src/routes/__root.tsx`.
- **Delete**: `src/integrations/supabase/`, `supabase/`, `src/lib/hub.functions.ts`, `src/hooks/useLiveSync.ts`, `Dockerfile`, `docker-compose.yml` (optional — say the word if you want to keep Docker as an alternative), `src/start.ts` if it becomes vestigial.

## Open questions before I build

1. **First-user bootstrap**: is "first registration wins admin, then parents invite others" fine, or do you want a fixed admin username set via env var (e.g. `ADMIN_USERNAME=dad`) on first boot?
2. **Keep Docker files?** You asked earlier for a Docker/LAN quickstart. I can keep `Dockerfile` + `docker-compose.yml` updated for the new stack, or delete them if you're running bare-metal Node only.
3. **TanStack Start → plain Vite SPA**: this is the cleanest path for a local server. Confirm you're OK losing SSR (you don't need it for a home-LAN app — SEO/social previews are irrelevant).

Say the word and I'll execute. If you want tweaks, tell me which.