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
} from "@/lib/hub.functions";
import { ChefHat, Plus, ShoppingBasket, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/meals")({
  ssr: false,
  component: MealsPage,
});

const MEALS = ["breakfast", "lunch", "dinner"] as const;
type MealSlot = (typeof MEALS)[number];

function startOfWeek(d = new Date()) {
  const day = d.getDay(); // 0=Sun
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

  const recipes = useQuery({ queryKey: ["recipes"], queryFn: () => listRecipes() });
  const plan = useQuery({
    queryKey: ["meal-plan", from, toEnd],
    queryFn: () => listMealPlan({ data: { from, to: toEnd } }),
  });

  const [rName, setRName] = useState("");
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
    mutationFn: (v: { plan_date: string; meal: MealSlot; recipe_id: string | null; custom_name: string | null }) =>
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
    onSuccess: (res) => {
      inv();
      toast.success(res.added > 0 ? `Added ${res.added} items to shopping` : "No recipes to source ingredients from");
    },
    onError: (e) => toast.error(e.message),
  });

  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * 86400000));
  const planMap = new Map<string, { id: string; recipe_id: string | null; custom_name: string | null; recipes: { name: string } | null }>();
  for (const p of plan.data ?? []) {
    const pp = p as unknown as {
      id: string;
      plan_date: string;
      meal: MealSlot;
      recipe_id: string | null;
      custom_name: string | null;
      recipes: { name: string } | null;
    };
    planMap.set(`${pp.plan_date}:${pp.meal}`, pp);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">This week</p>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Meals</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * 86400000))}
              className="rounded-xl border border-border bg-panel px-3 py-2 text-sm font-semibold"
            >
              ‹ Prev
            </button>
            <button
              onClick={() => setWeekStart(startOfWeek())}
              className="rounded-xl border border-border bg-panel px-3 py-2 text-sm font-semibold"
            >
              This week
            </button>
            <button
              onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * 86400000))}
              className="rounded-xl border border-border bg-panel px-3 py-2 text-sm font-semibold"
            >
              Next ›
            </button>
            <button
              onClick={() => genShop.mutate()}
              disabled={genShop.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              <ShoppingBasket className="size-4" /> Build shopping list
            </button>
          </div>
        </header>

        <section className="mb-6 overflow-x-auto rounded-3xl border border-border bg-panel p-4">
          <div className="grid min-w-[700px] grid-cols-8 gap-2">
            <div />
            {days.map((d) => (
              <div key={toISO(d)} className="text-center">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {d.toLocaleDateString(undefined, { weekday: "short" })}
                </p>
                <p className="font-display text-lg font-bold">{d.getDate()}</p>
              </div>
            ))}
            {MEALS.map((m) => (
              <Fragment key={m}>
                <div key={`label-${m}`} className="flex items-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground capitalize">
                  {m}
                </div>
                {days.map((d) => {
                  const key = `${toISO(d)}:${m}`;
                  const entry = planMap.get(key);
                  return (
                    <div key={key} className="rounded-2xl bg-canvas p-2">
                      {entry ? (
                        <div className="group flex items-start justify-between gap-1">
                          <p className="text-xs font-medium leading-tight">
                            {entry.recipes?.name ?? entry.custom_name ?? "Meal"}
                          </p>
                          <button
                            onClick={() => clearSlot.mutate(entry.id)}
                            className="opacity-0 transition-opacity group-hover:opacity-100"
                            aria-label="Clear"
                          >
                            <X className="size-3 text-muted-foreground" />
                          </button>
                        </div>
                      ) : (
                        <select
                          className="w-full bg-transparent text-xs text-muted-foreground outline-none"
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) return;
                            setSlot.mutate({
                              plan_date: toISO(d),
                              meal: m,
                              recipe_id: val,
                              custom_name: null,
                            });
                          }}
                          defaultValue=""
                        >
                          <option value="">＋ pick</option>
                          {(recipes.data ?? []).map((r) => (
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

        <div className="grid gap-4 md:grid-cols-5">
          <section className="rounded-3xl border border-border bg-panel p-6 md:col-span-2">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
              <ChefHat className="size-5" /> New recipe
            </h2>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!rName.trim()) return;
                addR.mutate();
              }}
            >
              <input
                value={rName}
                onChange={(e) => setRName(e.target.value)}
                placeholder="Recipe name"
                className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm outline-none"
              />
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ingredients</p>
                {rIngs.map((ing, i) => (
                  <div key={i} className="grid grid-cols-[1fr_100px_auto] gap-2">
                    <input
                      value={ing.name}
                      onChange={(e) => {
                        const next = [...rIngs];
                        next[i] = { ...next[i], name: e.target.value };
                        setRIngs(next);
                      }}
                      placeholder="e.g. Onions"
                      className="rounded-xl border border-border bg-canvas px-3 py-2 text-sm outline-none"
                    />
                    <input
                      value={ing.quantity}
                      onChange={(e) => {
                        const next = [...rIngs];
                        next[i] = { ...next[i], quantity: e.target.value };
                        setRIngs(next);
                      }}
                      placeholder="qty"
                      className="rounded-xl border border-border bg-canvas px-3 py-2 text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setRIngs(rIngs.filter((_, idx) => idx !== i))}
                      className="rounded-xl p-2 text-muted-foreground hover:text-foreground"
                      aria-label="Remove"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setRIngs([...rIngs, { name: "", quantity: "" }])}
                  className="inline-flex items-center gap-1 rounded-xl border border-dashed border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  <Plus className="size-3" /> Ingredient
                </button>
              </div>
              <textarea
                value={rNotes}
                onChange={(e) => setRNotes(e.target.value)}
                placeholder="Notes / method (optional)"
                rows={3}
                className="w-full rounded-xl border border-border bg-canvas px-3 py-2 text-sm outline-none"
              />
              <button
                type="submit"
                disabled={!rName.trim() || addR.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-50"
              >
                <Plus className="size-4" /> Save recipe
              </button>
            </form>
          </section>
          <section className="rounded-3xl border border-border bg-panel p-6 md:col-span-3">
            <h2 className="mb-4 font-display text-lg font-bold">Recipes</h2>
            {(recipes.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No recipes yet.</p>
            ) : (
              <ul className="space-y-2">
                {(recipes.data ?? []).map((r) => {
                  const ings = Array.isArray(r.ingredients) ? (r.ingredients as { name?: string; quantity?: string }[]) : [];
                  return (
                    <li key={r.id} className="rounded-2xl bg-canvas p-4">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <p className="font-semibold">{r.name}</p>
                        <button
                          onClick={() => delR.mutate(r.id)}
                          className="rounded-xl p-1.5 text-muted-foreground hover:text-foreground"
                          aria-label="Delete"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      {ings.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {ings
                            .map((ing) => (ing.quantity ? `${ing.quantity} ${ing.name}` : ing.name))
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                      {r.notes && <p className="mt-1 text-xs text-muted-foreground">{r.notes}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
