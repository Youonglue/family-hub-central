# Family Hub — LAN Quick Start

Get your family's private hub running on your home Wi-Fi in about 5 minutes.
No cloud account, no subscription, no data leaves your house.

---

## 1. What you need

- Any always-on Linux box with Docker installed. Good options:
  - Raspberry Pi 4 or 5 (2 GB+ RAM)
  - Synology / QNAP NAS with Container Manager
  - An old laptop or Mac mini
  - A small Intel N100 / N305 mini-PC
- All family devices (phones, tablets, kitchen display) on the same Wi-Fi.

If you don't have Docker yet: `curl -fsSL https://get.docker.com | sh`

---

## 2. Install

### Option A — one command (recommended)

```bash
mkdir -p ~/familyhub && cd ~/familyhub
curl -fsSL https://raw.githubusercontent.com/YOUR-ORG/familyhub/main/docker-compose.yml -o docker-compose.yml
docker compose up -d
```

### Option B — build from source

```bash
git clone https://github.com/YOUR-ORG/familyhub.git
cd familyhub
docker compose up -d --build
```

Both create a container called `familyhub` and a persistent volume for the
SQLite database.

---

## 3. Find it on your network

Open a browser on any device on the same Wi-Fi:

- Preferred: **`http://familyhub.local:3000`** (works if your device supports mDNS —
  every Apple device, most Linux, and Windows 10+).
- Fallback: **`http://<box-ip>:3000`**. Find the box's IP with:
  - Router admin page → "Connected devices"
  - On the box: `ip a` or `hostname -I`
  - macOS: `ipconfig getifaddr en0`

Tip: give the box a **DHCP reservation** in your router so its IP never changes.

---

## 4. Add it to phones and tablets as an app

Family Hub is a PWA — it installs like a native app.

- **iPhone / iPad (Safari):** open the URL → Share → *Add to Home Screen*.
- **Android (Chrome):** open the URL → menu (⋮) → *Install app* or *Add to Home Screen*.
- **Kitchen tablet / Fire tablet:** same as Android; consider a launcher like
  *Fully Kiosk Browser* for auto-start.

Once installed, tapping the icon opens Family Hub full-screen with no browser chrome.

---

## 5. (Optional) Set a shared family PIN

By default, anyone on your Wi-Fi can open the hub. To add a shared PIN:

```bash
# edit docker-compose.yml
services:
  familyhub:
    environment:
      FAMILY_PIN: "1234"   # pick your own
```

Then:

```bash
docker compose up -d   # picks up the env change and restarts
```

Everyone types the PIN once per device; the app remembers them.

---

## 6. Backups

Your data lives in the Docker volume `familyhub-data` as a single SQLite file.

### One-off backup

```bash
docker run --rm \
  -v familyhub-data:/data \
  -v "$PWD":/backup \
  alpine tar czf /backup/familyhub-$(date +%F).tgz -C /data .
```

### Restore

```bash
docker compose down
docker run --rm \
  -v familyhub-data:/data \
  -v "$PWD":/backup \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/familyhub-YYYY-MM-DD.tgz -C /data"
docker compose up -d
```

You can also **export/import from inside the app** (Settings → Import / Export)
for encrypted, passphrase-locked transfers between devices — perfect for
migrating from the Lovable Cloud preview to your LAN box.

---

## 7. Updating

```bash
cd ~/familyhub
docker compose pull
docker compose up -d
```

Your data volume is preserved across updates.

---

## 8. Troubleshooting

**"Port 3000 already in use"** — change the host port in `docker-compose.yml`:
`ports: - "3080:3000"` then browse to `http://familyhub.local:3080`.

**`familyhub.local` doesn't resolve on Android** — some Android versions lack
mDNS. Use the IP address instead, or install Avahi on the host and ensure
your router forwards multicast.

**Container keeps restarting** — check logs:
`docker compose logs -f familyhub`

**Wrong times on events** — the container inherits `TZ` from the host, or set
it explicitly: `environment: TZ: "Europe/London"`.

**Forgot the PIN** — clear it by unsetting `FAMILY_PIN` in the compose file
and restarting.

---

For deeper self-hosting details (reverse proxy, HTTPS on the LAN, custom data
directory) see [SELF_HOST.md](./SELF_HOST.md).
