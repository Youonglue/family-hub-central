# Family Hub — Self-Hosted

A fully local family organiser: chores with parent approval, shopping list,
meal planner, family calendar, and rewards. **No cloud, no Supabase, no
external services.** Everything runs on your home server and stores data in
one SQLite file on your disk.

- **Backend**: Node.js + Fastify + SQLite (`better-sqlite3`)
- **Frontend**: React (Vite) served as a static bundle by the same Node process
- **Realtime**: WebSocket broadcast on the LAN — updates on one device appear
  on every other device instantly
- **Auth**: username + password, sessions in an HttpOnly cookie

---

## Prerequisites

- **Node.js 20 or newer** (`node --version` to check)
- Git, or a copy of this project on the server
- A port free on your box (default `3000`)

That's it. No Docker required. No accounts to sign up for.

---

## Install & run (production)

From the project root:

```bash
# 1. Install app dependencies (React + build tools)
npm install

# 2. Install server dependencies (Fastify + SQLite)
cd server && npm install && cd ..

# 3. Build the React frontend into ./dist
npm run build

# 4. Start the server
npm start
```

You'll see:

```
Family Hub listening on http://0.0.0.0:3000
Database: /path/to/project/data/familyhub.db
No users yet — first person to register becomes the admin.
```

Open **`http://<your-server-ip>:3000`** from any device on the same Wi-Fi
network. The first account you create becomes the admin. After that, only
the admin can add new accounts (family-member sign-ups happen from
Settings, not the public sign-in page).

Find your server's LAN IP with `ip addr` (Linux), `ifconfig` (macOS), or
`ipconfig` (Windows). It'll look something like `192.168.1.42`.

---

## Where your data lives

- **Database file**: `./data/familyhub.db`
- **WAL journal**: `./data/familyhub.db-wal` and `./data/familyhub.db-shm`
  (temporary — SQLite manages them)

To back up: stop the server, copy the whole `data/` folder somewhere safe,
start the server again. To reset everything: stop the server, delete
`data/familyhub.db*`, start again — you'll be prompted to create a new
admin.

Override the location with the `DATA_DIR` env var:

```bash
DATA_DIR=/mnt/nas/familyhub npm start
```

---

## Change the port

```bash
PORT=8080 npm start
```

---

## Keep it running on boot (Linux, systemd)

Save this as `/etc/systemd/system/familyhub.service` (edit `WorkingDirectory`
and `User`):

```ini
[Unit]
Description=Family Hub
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/familyhub
ExecStart=/usr/bin/npm start
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now familyhub
sudo systemctl status familyhub
```

---

## Development (making changes)

Two terminals — the Vite dev server talks to the Node backend via a proxy.

**Terminal 1** (backend, port 3000):

```bash
cd server && npm install && cd ..
npm run server
```

**Terminal 2** (frontend hot reload, port 8080 by default):

```bash
npm install
npm run dev
```

Open the URL Vite prints. Frontend API calls are proxied to the Node server
so `/api/*` and `/ws` just work.

When you're done, `npm run build` and restart the production server.

---

## Troubleshooting

- **`Cannot find module 'better-sqlite3'`** — you skipped `cd server &&
  npm install`.
- **`EACCES: permission denied, mkdir '/data'`** — your `DATA_DIR` points
  somewhere you can't write. Unset it or `chown` the folder.
- **Blank page at `/`** — you forgot `npm run build`. The server logs the
  static folder it's serving; make sure `dist/index.html` exists there.
- **Locked out** — stop the server, run
  `sqlite3 data/familyhub.db "DELETE FROM sessions;"` to force everyone to
  sign in again, or delete the whole `data/familyhub.db*` to nuke and start
  fresh.
- **Port already in use** — set `PORT=<something-else> npm start`.

---

## Ports & security

The server binds to `0.0.0.0:3000` so any device on your LAN can reach it.
This is a home-network app — do **not** expose port 3000 to the public
internet directly. If you want remote access, put it behind a VPN
(Tailscale, WireGuard) or a reverse proxy with HTTPS. Sessions are 30 days,
HttpOnly, SameSite=Lax; passwords are hashed with scrypt.
