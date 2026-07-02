// LAN REST + WebSocket client for the self-hosted Family Hub server.
// -----------------------------------------------------------------------------
// This module MUST expose the same function names and shapes as
// `hub.functions.ts` so route components can call it interchangeably. The
// server (Fastify + SQLite) lives in ../../server and serves the SPA on the
// same origin, so all calls are relative — no host, no CORS.
//
// Nested-shape reshaping matches the Supabase-style objects the routes read
// (`family_members: { name, avatar_color }`, `chores: { title }`), so switching
// data sources requires zero UI changes.

async function j<T>(res: Response): Promise<T> {
  if (res.status === 401) throw new Error("Locked. Enter the family PIN.");
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `${res.status} ${res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const get   = <T>(path: string) => fetch(path, { credentials: "same-origin" }).then((r) => j<T>(r));
const post  = <T>(path: string, body?: unknown) =>
  fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }).then((r) => j<T>(r));
const patch = <T>(path: string, body: unknown) =>
  fetch(path, {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => j<T>(r));
const del   = <T>(path: string) =>
  fetch(path, { method: "DELETE", credentials: "same-origin" }).then((r) => j<T>(r));

// -----------------------------------------------------------------------------
// Reshapers — collapse LAN's flat rows into the nested shape the UI expects.
// -----------------------------------------------------------------------------
type Flat<T> = T & {
  member_name?: string | null;
  member_color?: string | null;
  chore_title?: string | null;
};

function withMember<T>(row: Flat<T>) {
  return {
    ...row,
    family_members: row.member_name
      ? { name: row.member_name, avatar_color: row.member_color ?? "amber" }
      : null,
  };
}
function withChoreAndMember<T>(row: Flat<T>) {
  const base = withMember(row);
  return {
    ...base,
    chores: row.chore_title ? { title: row.chore_title } : null,
  };
}

// -----------------------------------------------------------------------------
// FAMILY
// -----------------------------------------------------------------------------
export const listMembers   = () => get<any[]>("/api/members");
export const addMember     = ({ data }: { data: { name: string; avatar_color: string; is_kid: boolean } }) =>
  post("/api/members", data);
export const deleteMember  = ({ data }: { data: { id: string } }) =>
  del(`/api/members/${encodeURIComponent(data.id)}`);

// -----------------------------------------------------------------------------
// POINTS / LEADERBOARD
// -----------------------------------------------------------------------------
export const listPoints = () => get<any[]>("/api/points");

// -----------------------------------------------------------------------------
// CHORES
// -----------------------------------------------------------------------------
export const listChores  = () => get<any[]>("/api/chores");
export const addChore    = ({ data }: { data: any }) => post("/api/chores", data);
export const deleteChore = ({ data }: { data: { id: string } }) =>
  del(`/api/chores/${encodeURIComponent(data.id)}`);
export const completeChore = ({ data }: { data: { chore_id: string; member_id: string } }) =>
  post(`/api/chores/${encodeURIComponent(data.chore_id)}/complete`, { member_id: data.member_id });
export const recentCompletions = async () => {
  const rows = await get<any[]>("/api/completions/recent");
  return rows.map(withChoreAndMember);
};

// -----------------------------------------------------------------------------
// REWARDS
// -----------------------------------------------------------------------------
export const listRewards   = () => get<any[]>("/api/rewards");
export const addReward     = ({ data }: { data: any }) => post("/api/rewards", data);
export const deleteReward  = ({ data }: { data: { id: string } }) =>
  del(`/api/rewards/${encodeURIComponent(data.id)}`);
export const redeemReward  = ({ data }: { data: { reward_id: string; member_id: string } }) =>
  post(`/api/rewards/${encodeURIComponent(data.reward_id)}/redeem`, { member_id: data.member_id });

// -----------------------------------------------------------------------------
// SHOPPING
// -----------------------------------------------------------------------------
export const listShopping         = () => get<any[]>("/api/shopping");
export const addShopping          = ({ data }: { data: any }) => post("/api/shopping", data);
export const toggleShopping       = ({ data }: { data: { id: string; checked: boolean } }) =>
  patch(`/api/shopping/${encodeURIComponent(data.id)}`, { checked: data.checked });
export const deleteShopping       = ({ data }: { data: { id: string } }) =>
  del(`/api/shopping/${encodeURIComponent(data.id)}`);
export const clearCheckedShopping = () => post("/api/shopping/clear-checked");

// -----------------------------------------------------------------------------
// RECIPES + MEAL PLAN
// -----------------------------------------------------------------------------
export const listRecipes  = () => get<any[]>("/api/recipes");
export const addRecipe    = ({ data }: { data: any }) => post("/api/recipes", data);
export const deleteRecipe = ({ data }: { data: { id: string } }) =>
  del(`/api/recipes/${encodeURIComponent(data.id)}`);

export const listMealPlan = ({ data }: { data: { from: string; to: string } }) =>
  get<any[]>(`/api/meal-plan?from=${encodeURIComponent(data.from)}&to=${encodeURIComponent(data.to)}`);
export const setMealPlan    = ({ data }: { data: any }) => post("/api/meal-plan", data);
export const removeMealPlan = ({ data }: { data: { id: string } }) =>
  del(`/api/meal-plan/${encodeURIComponent(data.id)}`);
export const generateShoppingFromMeals = ({ data }: { data: { from: string; to: string } }) =>
  post("/api/meal-plan/build-shopping", data);

// -----------------------------------------------------------------------------
// EVENTS (the "calendar auto-updates" pipeline)
// -----------------------------------------------------------------------------
export const listEvents = async () => {
  const rows = await get<any[]>("/api/events");
  return rows.map(withMember);
};
export const upcomingEvents = async () => {
  const rows = await get<any[]>("/api/events/upcoming");
  return rows.map(withMember);
};
export const addEvent    = ({ data }: { data: any }) => post("/api/events", data);
export const deleteEvent = ({ data }: { data: { id: string } }) =>
  del(`/api/events/${encodeURIComponent(data.id)}`);
