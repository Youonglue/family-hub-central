## What you're getting

A **single box** on your home network (Raspberry Pi, old laptop, NAS, mini-PC — anything running Docker) that hosts the Family Hub. Every phone, tablet, and fridge screen on your Wi-Fi opens `http://familyhub.local` and sees the same live data. Zero traffic leaves your house. No accounts to create, no cloud bills, no outages when the internet drops.

## How it will run at home

```text
          ┌──────────────────────────────┐
          │  Home Wi-Fi router           │
          └──────────────┬───────────────┘
                         │
   ┌──────────┬──────────┼──────────┬──────────┐
   │          │          │          │          │
 phone     tablet     laptop     fridge    Home Assistant
   │          │          │          │          │
   └──────────┴────► http://familyhub.local ◄──┘
                            │
                ┌───────────┴────────────┐
                │  Raspberry Pi / NAS    │
                │  ┌──────────────────┐  │
                │  │ familyhub Docker │  │
                │  │  • Node API      │  │
                │  │  • SQLite DB     │  │
                │  │  • Static web    │  │
                │  │  • WebSocket     │  │
                │  └──────────────────┘  │
                └────────────────────────┘
```

Everything lives in **one Docker container**. One command to install, one folder to back up.

## The offline switch

- **Real-time sync between devices** over your LAN using WebSockets — kid ticks a chore on their tablet, the fridge screen updates instantly, your phone gets the point bump.
- **Optimistic local writes** with IndexedDB on each device, so if the Wi-Fi hiccups the app stays snappy and reconciles when it reconnects.
- **Installable on every device** (Add to Home Screen) so it launches like a native app, full-screen, no browser bar.
- **Zero external calls.** No Google Fonts, no analytics, no telemetry. Fonts and icons bundled in the container.

## Scope of this pivot

Because you're moving from Lovable Cloud to a self-hosted box, this is a significant refactor — but it's what unlocks Home Assistant, full offline, and single-family privacy. Phases:

### Phase A — New local backend
1. Ship a `server/` directory: **Fastify** (Node) API + **better-sqlite3** for storage + **WebSocket** for live sync.
2. Re-implement every existing server-function endpoint (family, chores, points, rewards, shopping, meals, recipes, calendar) against SQLite. Same shapes so the frontend barely changes.
3. Optional PIN gate (one shared family PIN) instead of Google login — no accounts, no cloud auth.

### Phase B — Frontend rewire
1. Replace the `@/lib/hub.functions.ts` server-fn calls with a small `apiClient` that talks to `/api/*` on the same origin.
2. Add IndexedDB-backed offline queue (writes stored locally, flushed when server reachable).
3. Subscribe to WebSocket for realtime updates — leaderboard, shopping ticks, chore completions.
4. Add PWA manifest + service worker for install + full offline read.
5. Rip out Google fonts CDN link; bundle Inter + Outfit via `@fontsource` locally.

### Phase C — Packaging & docs
1. Multi-arch `Dockerfile` (works on Pi 4/5 arm64 and x86 NAS).
2. `docker-compose.yml` with one volume for the SQLite file and one for uploads.
3. Optional `avahi` / mDNS so it broadcasts as `familyhub.local` — no need to know its IP.
4. `README.md`: 3-command install, backup/restore, updating.
5. GitHub repo with CI that builds the container image on push.

### Phase D — Home Assistant hook (bonus, later turn)
- Long-lived HA token stored in the container's env — the Family Hub can push events to HA and read HA calendar/entities. Fully local, no cloud middleman.

## Things worth flagging

- **Lovable Cloud stays on this project** — it can't be disconnected. It'll act only as the dev preview while we build. The self-hosted container is what your family actually uses; it never talks to Lovable Cloud.
- **The preview inside Lovable won't be truly offline** — it runs inside a browser tab pointed at the sandbox. The offline story only kicks in once you install the container at home. I'll call that out clearly in the README.
- **Sign-in stays inside Lovable preview only** — the shipped container uses a family PIN (or no gate at all if you prefer). Say the word if you want per-member profiles instead of one shared family box.
- **Calendar sync (Google/CalDAV) was in the original roadmap** — with fully-isolated mode we drop external calendars by default. If later you want *optional* pull-from-Google when a family member's phone has internet, we can add it as a per-device pull, not a server call.

## First step

I'll start with **Phase A** — spinning up the local Fastify + SQLite server and rewiring the existing pages to talk to it. That's the biggest chunk and unblocks everything else. Once it's green in preview, Phase B (offline + PWA + WebSocket) and Phase C (Docker + docs) follow.

Say the word and I'll begin Phase A. If you'd rather I ship the whole thing in one push (bigger single review, longer wait), let me know and I'll batch it.
