# ── Stage 1: Build the React SPA ──────────────────────────────────────────────
FROM node:20-alpine AS webbuild
WORKDIR /app

# Define build-time arguments
ARG SUPABASE_URL
ARG SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Assign them to ENV so they are available during 'npm run build'
ENV SUPABASE_URL=$SUPABASE_URL
ENV SUPABASE_PUBLISHABLE_KEY=$SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

COPY package.json bun.lock* package-lock.json* ./
RUN if [ -f bun.lock ]; then \
      npm install -g bun && bun install --frozen-lockfile; \
    else \
      npm install; \
    fi

COPY . .
ENV VITE_HUB_MODE=selfhost
ENV NITRO_PRESET=node-server
RUN npm run build

# ── Stage 2: Install server dependencies ──────────────────────────────────────
FROM node:20-alpine AS serverdeps
WORKDIR /server
RUN apk add --no-cache python3 make g++
COPY server/package.json ./
RUN npm install --omit=dev

# ── Stage 3: Runtime image ────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache tini

COPY --from=serverdeps /server/node_modules ./server/node_modules
COPY server ./server
COPY --from=webbuild /app/.output ./.output

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    DATA_DIR=/data

VOLUME ["/data"]
EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", ".output/server/index.mjs"]
