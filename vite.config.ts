// @lovable.dev/vite-tanstack-config wires TanStack Start + Nitro. We override
// the Nitro preset so `npm run build` produces a standalone Node server at
// .output/server/index.mjs — runnable with `node .output/server/index.mjs`
// on any Linux VPS. No Cloudflare Workers, no edge runtime.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    target: "node-server",
  },
  nitro: {
    preset: "node-server",
  },
});

