import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import {
  addRecipe,
  deleteRecipe,
  generateShoppingFromMeals,
  listMealPlan,
  listRecipes,
  removeMealPlan,
  setMealPlan,
} from "@/lib/hub-api";
import { ChefHat, Plus, ShoppingBasket, Trash2, X, Utensils } from "lucide-react";

export const Route = createFileRoute("/_authenticated/meals")({
  ssr: false,
  component: MealsPage,
});

// Normalized categories to match your Seed script
const MEALS = ["Breakfast", "Lunch", "Dinner"] as const;
type MealSlot = (typeof MEALS)[number];

function startOfWeek(d = new Date()) {
  const day = d.getDay();
  const diff = (day + 6) % 7; // Monday start
  const monday = new Date(d);
  monday.setDate(d.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function MealsPage() {
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeek());
  const from = toISO(weekStart);
  const toEnd = toISO(new Date(weekStart.getTime() + 6 * 86400000));

  // Queries
  const recipes = useQuery({ queryKey: ["recipes"], queryFn: () => listRecipes() });
  const plan = useQuery({
    queryKey: ["meal-plan", from, toEnd],
    queryFn: () => listMealPlan({ data: { from, to: toEnd } }),
  });

  // Form State
  const [rName, setRName] = useState("");
  const [rCategory, setRCategory] = useState<MealSlot>("Dinner");
  const [rIngs, setRIngs] = useState<{ name: string; quantity: string }[]>([{ name: "", quantity: "" }]);
  const [rNotes, setRNotes] = useState("");

  const inv = () => {
    qc.invalidateQueries({ queryKey: ["meal-plan"] });
    qc.invalidateQueries({ queryKey: ["recipes"] });
    qc.invalidateQueries({ queryKey: ["shopping"] });
  };

  const addR = useMutation({
    mutationFn: () =>
      addRecipe({
        data: {
          name: rName.trim(),
          category: rCategory,
          notes: rNotes.trim() || null,
          ingredients: rIngs.filter((i) => i.name.trim()).map((i) => ({ name: i.name.trim(), quantity: i.quantity.trim() })),
        },
      }),
    onSuccess: () => {
      setRName("");
      setRIngs([{ name: "", quantity: "" }]);
      setRNotes("");
      inv();
      toast.success("Recipe saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const delR = useMutation({
    mutationFn: (id: string) => deleteRecipe({ data: { id } }),
    onSuccess: inv,
  });

  const setSlot = useMutation({
    mutationFn: (v: { plan_date: string; meal: string; recipe_id: string | null }) =>
      setMealPlan({ data: v }),
    onSuccess: inv,
    onError: (e) => toast.error(e.message),
  });

  const clearSlot = useMutation({
    mutationFn: (id: string) => removeMealPlan({ data: { id } }),
    onSuccess: inv,
  });

  const genShop = useMutation({
    mutationFn: () => generateShoppingFromMeals({ data: { from, to: toEnd } }),
    onSuccess: (res: any) => {
      inv();
      toast.success(res.added > 0 ? `Added ${res.added} items to shopping` : "No recipes to source from for these dates.");
    },
    onError: (e) => toast.error(e.message),
  });

  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * 86400000));
  
  const planMap = new Map<string, any>();
  for (const p of (plan.data as any[]) ?? []) {
    planMap.set(`${p.plan_date}:${p.meal}`, p);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Meal Planner</h1>
            <p className="text-sm text-muted-foreground mt-1">Plan your family week and auto-generate your shopping list.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * 86400000))} className="p-2 hover:bg-muted rounded-lg border border-border">‹</button>
            <span className="text-sm font-semibold px-2">{new Date(from).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(toEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            <button onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * 86400000))} className="p-2 hover:bg-muted rounded-lg border border-border">›</button>
            
            <button
              onClick={() => genShop.mutate()}
              disabled={genShop.isPending}
              className="ml-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <ShoppingBasket className="size-4" /> 
              {genShop.isPending ? "Building..." : "Build shopping list"}
            </button>
          </div>
        </header>

        {/* Weekly Grid */}
        <section className="mb-10 overflow-x-auto rounded-3xl border border-border bg-panel shadow-sm">
          <div className="grid min-w-[800px] grid-cols-8 p-4 gap-3">
            <div className="flex items-end pb-2 font-mono text-[10px] uppercase text-muted-foreground">Meal</div>
            {days.map((d) => (
              <div key={toISO(d)} className="text-center pb-2 border-b border-border/50">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {d.toLocaleDateString(undefined, { weekday: "short" })}
                </p>
                <p className="font-display text-lg font-bold">{d.getDate()}</p>
              </div>
            ))}

            {MEALS.map((m) => (
              <Fragment key={m}>
                <div className="flex items-center font-semibold text-xs text-primary bg-primary/5 rounded-lg px-2 py-4">
                  {m}
                </div>
                {days.map((d) => {
                  const key = `${toISO(d)}:${m}`;
                  const entry = planMap.get(key);
                  return (
                    <div key={key} className="rounded-2xl border border-dashed border-border/60 hover:border-primary/50 transition-colors p-2 bg-canvas/50 min-h-[80px] flex flex-col justify-center">
                      {entry ? (
                        <div className="group relative flex flex-col items-center text-center gap-1">
                          <p className="text-[11px] font-bold leading-tight line-clamp-2">
                            {entry.recipe_name ?? "Selected Meal"}
                          </p>
                          <button
                            onClick={() => clearSlot.mutate(entry.id)}
                            className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ) : (
                        <select
                          className="w-full bg-transparent text-[11px] text-muted-foreground cursor-pointer focus:text-primary transition-colors"
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) return;
                            setSlot.mutate({
                              plan_date: toISO(d),
                              meal: m,
                              recipe_id: val,
                            });
                          }}
                          defaultValue=""
                        >
                          <option value="">＋ add {m.toLowerCase()}</option>
                          {/* STRICT FILTERING BY CATEGORY */}
                          {(recipes.data ?? [])
                            .filter((r: any) => r.category === m)
                            .map((r: any) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                        </select>
                      )}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-5">
          {/* New Recipe Form */}
          <section className="rounded-3xl border border-border bg-panel p-6 md:col-span-2 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
              <ChefHat className="size-5 text-primary" /> New Family Recipe
            </h2>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!rName.trim()) return; addR.mutate(); }}>
              <input
                value={rName}
                onChange={(e) => setRName(e.target.value)}
                placeholder="Dish name..."
                className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm ring-primary/20 focus:ring-2 outline-none"
              />
              
              <select
                value={rCategory}
                onChange={(e) => setRCategory(e.target.value as MealSlot)}
                className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm outline-none"
              >
                {MEALS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ingredients</p>
                {rIngs.map((ing, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={ing.name}
                      onChange={(e) => {
                        const next = [...rIngs];
                        next[i].name = e.target.value;
                        setRIngs(next);
                      }}
                      placeholder="Item"
                      className="flex-1 rounded-xl border border-border bg-canvas px-3 py-2 text-xs outline-none"
                    />
                    <button type="button" onClick={() => setRIngs(rIngs.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="size-4" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => setRIngs([...rIngs, { name: "", quantity: "" }])} className="w-full py-2 border-2 border-dashed border-border rounded-xl text-[10px] font-bold uppercase text-muted-foreground hover:bg-muted transition-colors">
                  + Add Ingredient
                </button>
              </div>

              <textarea
                value={rNotes}
                onChange={(e) => setRNotes(e.target.value)}
                placeholder="Cooking instructions..."
                rows={3}
                className="w-full rounded-xl border border-border bg-canvas px-3 py-2 text-sm outline-none"
              />
              <button
                type="submit"
                disabled={!rName.trim() || addR.isPending}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              >
                Save to Cookbook
              </button>
            </form>
          </section>

          {/* Recipe List */}
          <section className="rounded-3xl border border-border bg-panel p-6 md:col-span-3 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold">Family Cookbook</h2>
              <Utensils className="size-5 text-muted-foreground" />
            </div>
            {(recipes.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No recipes yet. Start adding your favorites!</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {(recipes.data ?? []).map((r: any) => (
                  <div key={r.id} className="group relative rounded-2xl bg-canvas p-4 border border-border/40 hover:shadow-md transition-all">
                    <span className="text-[9px] font-bold uppercase tracking-tighter text-primary bg-primary/10 px-2 py-0.5 rounded-full mb-1 inline-block">
                      {r.category}
                    </span>
                    <h3 className="font-bold text-sm line-clamp-1 pr-6">{r.name}</h3>
                    <button
                      onClick={() => delR.mutate(r.id)}
                      className="absolute top-4 right-4 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
