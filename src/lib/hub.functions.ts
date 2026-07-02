import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/* -------------------- FAMILY MEMBERS -------------------- */
export const listMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("family_members")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().min(1).max(60),
        avatar_color: z.string().min(1).max(20),
        is_kid: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("family_members")
      .insert({ ...data, owner_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("family_members").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------- POINTS / LEADERBOARD -------------------- */
export const listPoints = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("member_points")
      .select("*")
      .order("balance", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/* -------------------- CHORES -------------------- */
export const listChores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("chores")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addChore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        title: z.string().min(1).max(120),
        points: z.number().int().min(1).max(1000),
        member_id: z.string().uuid().nullable().optional(),
        recurrence: z.enum(["daily", "weekly", "once"]).default("daily"),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("chores")
      .insert({
        title: data.title,
        points: data.points,
        member_id: data.member_id ?? null,
        recurrence: data.recurrence,
        owner_id: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteChore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("chores").update({ active: false }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const completeChore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ chore_id: z.string().uuid(), member_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: chore, error: e1 } = await context.supabase
      .from("chores")
      .select("points")
      .eq("id", data.chore_id)
      .single();
    if (e1 || !chore) throw new Error(e1?.message ?? "Chore not found");
    const { error } = await context.supabase.from("chore_completions").insert({
      owner_id: context.userId,
      chore_id: data.chore_id,
      member_id: data.member_id,
      points_awarded: chore.points,
    });
    if (error) throw new Error(error.message);
    return { ok: true, points: chore.points };
  });

export const recentCompletions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("chore_completions")
      .select("id, points_awarded, completed_at, chore_id, member_id, chores(title), family_members(name, avatar_color)")
      .order("completed_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/* -------------------- REWARDS -------------------- */
export const listRewards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("rewards")
      .select("*")
      .eq("active", true)
      .order("cost_points", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        title: z.string().min(1).max(120),
        cost_points: z.number().int().min(1).max(100000),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("rewards")
      .insert({ ...data, owner_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("rewards").update({ active: false }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const redeemReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ reward_id: z.string().uuid(), member_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: reward } = await context.supabase
      .from("rewards")
      .select("cost_points")
      .eq("id", data.reward_id)
      .single();
    if (!reward) throw new Error("Reward not found");
    const { data: pts } = await context.supabase
      .from("member_points")
      .select("balance")
      .eq("member_id", data.member_id)
      .single();
    if (!pts || (pts.balance ?? 0) < (reward.cost_points ?? 0)) throw new Error("Not enough points!");
    const { error } = await context.supabase.from("redemptions").insert({
      owner_id: context.userId,
      reward_id: data.reward_id,
      member_id: data.member_id,
      points_spent: reward.cost_points,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------- SHOPPING -------------------- */
export const listShopping = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("shopping_items")
      .select("*")
      .order("checked", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addShopping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().min(1).max(120),
        quantity: z.string().max(60).optional().nullable(),
        category: z.string().max(40).optional().default("general"),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("shopping_items")
      .insert({
        name: data.name,
        quantity: data.quantity ?? null,
        category: data.category ?? "general",
        owner_id: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const toggleShopping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), checked: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("shopping_items")
      .update({ checked: data.checked, checked_at: data.checked ? new Date().toISOString() : null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteShopping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("shopping_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearCheckedShopping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("shopping_items")
      .delete()
      .eq("owner_id", context.userId)
      .eq("checked", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------- RECIPES + MEAL PLAN -------------------- */
const ingredientSchema = z.object({
  name: z.string().min(1),
  quantity: z.string().optional().default(""),
});

export const listRecipes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("recipes")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().min(1).max(120),
        notes: z.string().max(2000).optional().nullable(),
        ingredients: z.array(ingredientSchema).default([]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("recipes")
      .insert({
        name: data.name,
        notes: data.notes ?? null,
        ingredients: data.ingredients,
        owner_id: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("recipes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMealPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ from: z.string(), to: z.string() }).parse(d ?? { from: "", to: "" }),
  )
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("meal_plan")
      .select("*, recipes(id, name, ingredients)")
      .gte("plan_date", data.from)
      .lte("plan_date", data.to)
      .order("plan_date", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const setMealPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        plan_date: z.string(),
        meal: z.enum(["breakfast", "lunch", "dinner"]),
        recipe_id: z.string().uuid().nullable().optional(),
        custom_name: z.string().max(120).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("meal_plan").upsert(
      {
        owner_id: context.userId,
        plan_date: data.plan_date,
        meal: data.meal,
        recipe_id: data.recipe_id ?? null,
        custom_name: data.custom_name ?? null,
      },
      { onConflict: "owner_id,plan_date,meal" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeMealPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("meal_plan").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const generateShoppingFromMeals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ from: z.string(), to: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("meal_plan")
      .select("recipes(ingredients, name)")
      .gte("plan_date", data.from)
      .lte("plan_date", data.to);
    if (error) throw new Error(error.message);
    const items: { name: string; quantity: string }[] = [];
    for (const r of rows ?? []) {
      const recipe = (r as { recipes: { ingredients: unknown; name: string } | null }).recipes;
      if (!recipe) continue;
      const list = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
      for (const ing of list as { name?: string; quantity?: string }[]) {
        if (!ing?.name) continue;
        items.push({ name: ing.name, quantity: ing.quantity ?? "" });
      }
    }
    // Dedupe by lowercased name
    const map = new Map<string, { name: string; quantity: string }>();
    for (const it of items) {
      const key = it.name.trim().toLowerCase();
      if (!key) continue;
      const existing = map.get(key);
      if (existing) {
        if (it.quantity && !existing.quantity.includes(it.quantity)) {
          existing.quantity = existing.quantity ? `${existing.quantity} + ${it.quantity}` : it.quantity;
        }
      } else {
        map.set(key, { ...it });
      }
    }
    const merged = Array.from(map.values());
    if (merged.length === 0) return { added: 0 };
    const { error: insErr } = await context.supabase.from("shopping_items").insert(
      merged.map((m) => ({
        owner_id: context.userId,
        name: m.name,
        quantity: m.quantity || null,
        category: "meal-plan",
      })),
    );
    if (insErr) throw new Error(insErr.message);
    return { added: merged.length };
  });

/* -------------------- EVENTS -------------------- */
export const listEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("events")
      .select("*, family_members(name, avatar_color)")
      .order("starts_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upcomingEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("events")
      .select("*, family_members(name, avatar_color)")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(6);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        title: z.string().min(1).max(120),
        starts_at: z.string(),
        ends_at: z.string().nullable().optional(),
        location: z.string().max(120).nullable().optional(),
        member_id: z.string().uuid().nullable().optional(),
        color: z.string().max(20).optional().default("accent"),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("events")
      .insert({
        title: data.title,
        starts_at: data.starts_at,
        ends_at: data.ends_at ?? null,
        location: data.location ?? null,
        member_id: data.member_id ?? null,
        color: data.color ?? "accent",
        owner_id: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
