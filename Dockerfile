# ── Family Hub — self-hosted image ───────────────────────────────────────────
# Multi-stage: build the SPA, then run a slim Node + SQLite server.
# Works on x86_64 and arm64 (Raspberry Pi 4/5, Apple Silicon, most NAS).

# ── Stage 1: build the React SPA
FROM node:20-alpine AS webbuild
WORKDIR /app
COPY package.json bun.lock* package-lock.json* ./
RUN if [ -f bun.lock ]; then \
      npm install -g bun && bun install --frozen-lockfile; \
    else \
      npm ci; \
    fi
COPY . .
# Point the SPA at a same-origin API instead of Lovable Cloud.
ENV VITE_HUB_MODE=selfhost
RUN npm run build

# ── Stage 2: install server deps (native better-sqlite3 build)
FROM node:20-alpine AS serverdeps
WORKDIR /server
RUN apk add --no-cache python3 make g++
COPY server/package.json ./
RUN npm install --omit=dev

# ── Stage 3: runtime
FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache tini
COPY --from=serverdeps /server/node_modules ./server/node_modules
COPY server ./server
COPY --from=webbuild /app/dist ./dist

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    DATA_DIR=/data \
    STATIC_DIR=/app/dist

VOLUME ["/data"]
EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server/index.js"]
