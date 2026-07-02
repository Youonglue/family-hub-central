// Hub data-layer barrel.
// -----------------------------------------------------------------------------
// Every route imports its data functions from here so we can flip the whole
// app between Lovable Cloud (dev preview) and the offline LAN server
// (production Docker image) by setting a single build flag.
//
//   VITE_HUB_MODE=selfhost   ->  Fastify + SQLite over /api/* on the same box
//   (unset / anything else)  ->  Lovable Cloud server functions
//
// Signatures are identical in both modules.

export const HUB_MODE: "selfhost" | "cloud" =
  import.meta.env.VITE_HUB_MODE === "selfhost" ? "selfhost" : "cloud";

// Static re-exports so tree-shaking works and route files stay unchanged.
// Vite resolves the unused branch at build time when the env var is fixed.
export * from
  import.meta.env.VITE_HUB_MODE === "selfhost"
    ? "./lan-client"
    : "./hub.functions";
