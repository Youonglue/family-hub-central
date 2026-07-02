# Self-hosting Family Hub

Run the whole hub on a box you own — Raspberry Pi, old laptop, NAS, mini-PC —
and every device on your Wi-Fi opens `http://familyhub.local:3000` to see the
same live data. No internet required. No cloud. No accounts.

## What you need

- A machine on your home network running **Docker** (24+). Raspberry Pi 4/5,
  Synology/QNAP, Intel NUC, old laptop, whatever.
- 5 minutes.

## One-command install

```bash
git clone https://github.com/YOUR-USER/family-hub.git
cd family-hub
docker compose up -d
```

That's it. Open `http://<your-server-ip>:3000` from any device on the same
Wi-Fi. On phones and tablets, tap **Share → Add to Home Screen** to install it
like a native app — full-screen, its own icon, launches offline.

## Optional: shared family PIN

By default there is no lock — anyone on your Wi-Fi can open the hub. To gate
it behind a shared 4-digit PIN, edit `docker-compose.yml`:

```yaml
environment:
  FAMILY_PIN: "1234"
```

Then `docker compose up -d` again. Each device enters the PIN once and stays
unlocked for 30 days.

## Optional: nice URL (`familyhub.local`)

Instead of remembering the IP, install Avahi/mDNS on the host so it announces
itself as `familyhub.local`:

- **Raspberry Pi OS / Ubuntu / Debian**: already ships with `avahi-daemon`.
  Set the hostname to `familyhub` (`sudo hostnamectl set-hostname familyhub`)
  and reboot. Every device on the network can now use
  `http://familyhub.local:3000`.
- **Synology / QNAP**: use the built-in "Network → Bonjour" service.
- **Windows / macOS clients**: they already speak mDNS, no setup needed.
- **Android**: some older Androids don't resolve `.local` — use the IP or add
  a hosts entry via your router.

## Backup

Everything lives in one SQLite file inside the `familyhub-data` volume:

```bash
docker compose exec familyhub sh -c 'sqlite3 /data/familyhub.db ".backup /data/backup.db"'
docker cp familyhub:/data/backup.db ./familyhub-backup-$(date +%F).db
```

Copy that `.db` file to any drive you trust. Restore by dropping it back into
`/data/familyhub.db` before starting the container.

## Update

```bash
git pull
docker compose build
docker compose up -d
```

Your data persists across upgrades because it lives in a Docker volume, not
the image.

## Uninstall

```bash
docker compose down -v   # -v also wipes the data volume — you asked for it
```

## Ports and firewall

The container exposes **port 3000** by default. If your router firewalls
between VLANs (e.g. IoT vs. main Wi-Fi), allow traffic from your family
devices to the host on TCP 3000. Nothing outbound is required — the container
never calls out.

## What runs where

```text
Family device (phone / tablet / fridge)
  └─ Home-screen icon → http://familyhub.local:3000
       └─ Static SPA (bundled Inter + Outfit fonts, no CDN)
       └─ /api/*   → Fastify + SQLite   (all your data)
       └─ /ws      → WebSocket          (real-time sync between devices)
```

No requests leave your house. If your internet goes down, the hub keeps
working.

## Home Assistant (coming soon)

The container will accept a long-lived HA access token via env, so you can
push family events into your HA dashboard and read HA calendars back into the
hub — all over your LAN. Watch this space.
