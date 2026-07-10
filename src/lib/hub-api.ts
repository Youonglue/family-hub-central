// Thin barrel — all data goes through the local Node + SQLite server over /api.
// Supabase and the cloud hub are gone; the LAN client is the only implementation.
export * from "./lan-client";
// --- ADDED FOR HERO CUSTOMIZATION ---
export async function updateMember({ data }: { data: any }) {
  const res = await fetch(`/api/members/${data.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update hero');
  }
  return res.json();
}
