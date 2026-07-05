// The Fastify server in server/index.js serves the built client bundle from
// dist/client and provides /api + /ws. The Nitro output is unused by that
// self-hosted flow — we still ask Nitro for the node-server preset so if you
// ever want to run `.output/server/index.mjs` directly it works on any Linux
// VPS. Inside the Lovable sandbox this override is ignored (Lovable forces
// its own Cloudflare preset), which is fine.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: {
    preset: "node-server",
  },
  tanstackStart: {
    target: "node-server",
  },
});
