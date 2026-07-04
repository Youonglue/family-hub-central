// Thin barrel — all data goes through the local Node + SQLite server over /api.
// Supabase and the cloud hub are gone; the LAN client is the only implementation.
export * from "./lan-client";
