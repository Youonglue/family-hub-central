## Family Hub Dashboard — Build Plan

An open-source, self-hostable family dashboard with calendar sync, gamified chores, shopping list, meal planner, and Home Assistant integration.

### Tech stack

- **Frontend**: TanStack Start (React 19 + Vite 7) — already scaffolded here
- **Backend**: TanStack server functions + server routes (`/api/*`)
- **Database + Auth + Realtime + Push**: Lovable Cloud (Supabase under the hood — Postgres, RLS, Realtime, Web Push via edge)
- **Calendar sync**: CalDAV/ICS ingest + Google Calendar (per-user OAuth) with a cron-driven sync job
- **Mobile push**: Web Push (VAPID) — installable PWA works on iOS/Android home screens
- **Home Assistant**: Long-lived access token + REST/WebSocket bridge, plus a webhook endpoint HA can call
- **GitHub**: connect via Lovable's GitHub integration (Plus menu → GitHub → Connect project) so the repo is created and kept in two-way sync automatically

### Features

1. **Calendar**
  - Month/week/day views, per-family-member color coding
  - Link external calendars (Google OAuth, ICS URL, CalDAV)
  - Background sync every 15 min via cron-triggered `/api/public/cron/sync-calendars`
  - Realtime updates pushed to all connected clients (Supabase Realtime)
  - Web Push notifications for upcoming events on mobile
2. **Chore list (gamified)**
  - Kid profiles with avatars
  - Chores with point values, recurrence, due dates
  - Tap-to-complete with animations, sounds, confetti
  - Points bank → redeem for parent-defined rewards (screen time, treats, outings)
  - Leaderboard with weekly/monthly resets, badges, streaks
3. **Shopping list**
  - Shared, realtime, categorized by aisle
  - Check-off syncs across devices
  - "Add from meal plan" bulk import
4. **Meal planner**
  - Weekly grid, drag-and-drop recipes
  - Recipe library with ingredients
  - One-click "generate shopping list from this week's meals" (deduped, quantity-summed)
5. **Home Assistant integration**
  - Settings page to paste HA URL + long-lived token
  - Pull entity states (weather, presence, lights) onto dashboard tiles
  - Publish family events to HA (event bus) — e.g. "chore completed" → HA automation
  - Optional: HA webhook receiver at `/api/public/ha/webhook` (HMAC-verified)

### Data model (Postgres via Lovable Cloud)

`families`, `profiles` (with `family_id`, `role: parent|kid`, `avatar`, `color`),
`user_roles` (separate table per security rules),
`calendars` (source: google|ics|caldav|local, credentials encrypted),
`events`, `chores`, `chore_completions`, `rewards`, `redemptions`, `points_ledger`,
`shopping_items`, `recipes`, `recipe_ingredients`, `meal_plan_entries`,
`ha_connections`, `push_subscriptions`.
RLS scoped to `family_id` on every table.

### Build order (this first pass)

1. Enable Lovable Cloud
2. Design system + shell (dashboard grid, sidebar nav, kid/parent mode toggle)
3. Auth (email + Google) + family onboarding
4. Chores + points + leaderboard (highest interactivity, best first demo)
5. Shopping list (realtime)
6. Meal planner + "generate shopping list"
7. Calendar (local first, then Google OAuth, then ICS/CalDAV, then cron sync)
8. Web Push (PWA manifest + service worker + VAPID)
9. Home Assistant panel
10. GitHub connect + README + docker-compose for self-hosting

### What I need from you before starting

- **Design direction** — I'll propose 2–3 visual directions (playful kid-friendly vs. calm minimal vs. bold dark). Pick one.
- **Google Calendar** — needs your own Google Cloud OAuth credentials (per-user OAuth, since each family member links their own calendar). I'll wire the flow; you paste client ID/secret when ready. OK to defer to phase 7?
- **GitHub repo** — I can't create the repo directly, but after we build I'll walk you through the Plus (+) → GitHub → Connect project flow which creates it in one click and keeps it synced.
- **Scope of first ship** — this is a big app. I 
  recommend shipping phases 1–6 first (working dashboard with chores/shopping/meals/local calendar), then layering Google sync, push, and HA in follow-ups. Agree?

Reply with your direction preference and any scope tweaks and I'll start building.