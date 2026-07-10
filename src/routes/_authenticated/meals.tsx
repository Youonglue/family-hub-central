import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ChefHat, ShoppingBasket, X, Utensils } from "lucide-react";

export const Route = createFileRoute("/_authenticated/meals")({
  ssr: false,
  component: MealsPage,
});

const MEALS = ["Breakfast", "Lunch", "Dinner"] as const;

function startOfWeek(d = new Date()) {
  const day = d.getDay();
  const diff = (day + 6) % 7; 
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

  // 1. Fetch Data
  const recipes = useQuery({ queryKey: ["recipes"], queryFn: () => fetch('/api/recipes').then(r => r.json()) });
  const plan = useQuery({
    queryKey: ["meal-plan", from, toEnd],
    queryFn: () => fetch('/api/meal-plan').then(r => r.json()),
  });

  const inv = () => {
    qc.invalidateQueries({ queryKey: ["meal-plan"] });
    qc.invalidateQueries({ queryKey: ["recipes"] });
  };

  // 2. Mutations
  const setSlot = useMutation({
    mutationFn: (v: any) => fetch('/api/meal-plan', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(v) }),
    onSuccess: inv,
    onError: (e) => toast.error("Failed to add meal")
  });

  const clearSlot = useMutation({
    mutationFn: (id: string) => fetch(`/api/meal-plan/${id}`, { method: 'DELETE' }),
    onSuccess: inv,
  });

  const genShop = useMutation({
    mutationFn: () => fetch('/api/meal-plan/build-shopping', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({from, to: toEnd}) }).then(r=>r.json()),
    onSuccess: (res: any) => toast.success(`Shopping list updated!`),
  });

  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * 86400000));
  const planMap = new Map<string, any>();
  for (const p of (Array.isArray(plan.data) ? plan.data : [])) {
    planMap.set(`${p.plan_date}:${p.meal}`, p);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        
        {/* --- HEADER --- */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-black tracking-tight text-slate-900 uppercase italic">Meal Planner</h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Plan your week & build shopping lists</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * 86400000))} className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 hover:bg-slate-50 font-black">‹</button>
            <span className="font-black uppercase tracking-widest text-xs px-2">{new Date(from).toLocaleDateString()}</span>
            <button onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * 86400000))} className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 hover:bg-slate-50 font-black">›</button>
            <button onClick={() => genShop.mutate()} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-xl hover:bg-primary transition-all ml-2">
              <ShoppingBasket className="size-5" /> BUILD SHOPPING LIST
            </button>
          </div>
        </header>

        {/* --- WEEKLY PLANNER GRID --- */}
        <section className="mb-12 overflow-x-auto bg-white rounded-[3rem] p-8 shadow-2xl border-4 border-slate-50">
          <div className="grid min-w-[800px] grid-cols-8 gap-4">
            <div className="flex items-end pb-4 font-black text-slate-300 uppercase tracking-widest text-xs">Meal</div>
            {days.map((d) => (
              <div key={toISO(d)} className="text-center pb-4 border-b-4 border-slate-100">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{d.toLocaleDateString(undefined, { weekday: "short" })}</p>
                <p className="text-3xl font-black text-slate-800">{d.getDate()}</p>
              </div>
            ))}

            {MEALS.map((m) => (
              <Fragment key={m}>
                <div className="flex items-center font-black text-sm text-primary uppercase tracking-tighter">{m}</div>
                {days.map((d) => {
                  const key = `${toISO(d)}:${m}`;
                  const entry = planMap.get(key);
                  return (
                    <div key={key} className="relative bg-slate-50 rounded-3xl p-3 min-h-[100px] border-2 border-transparent hover:border-primary/30 transition-all flex flex-col items-center justify-center text-center group shadow-sm">
                      {entry ? (
                        <>
                          <p className="text-xs font-black leading-tight text-slate-800 uppercase">{entry.recipe_name}</p>
                          <button onClick={() => clearSlot.mutate(entry.id)} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:scale-110">
                            <X className="size-3" />
                          </button>
                        </>
                      ) : (
                        <select
                          className="w-full bg-transparent text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] outline-none cursor-pointer hover:text-primary transition-colors appearance-none text-center"
                          onChange={(e) => { if (e.target.value) setSlot.mutate({ plan_date: toISO(d), meal: m, recipe_id: e.target.value }); }}
                          value=""
                        >
                          <option value="">+ ADD {m}</option>
                          {/* DROPDOWN FILTERING HAPPENS HERE */}
                          {(Array.isArray(recipes.data) ? recipes.data : [])
                            .filter((r: any) => r.category === m)
                            .map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      )}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </section>

        {/* --- FAMILY COOKBOOK VISUAL GRID --- */}
        <section>
          <h2 className="text-3xl font-black mb-8 flex items-center gap-3 uppercase italic tracking-tighter text-slate-900">
            <Utensils className="text-orange-500 size-8" /> The Cookbook
          </h2>
          
          {(Array.isArray(recipes.data) ? recipes.data : []).length === 0 ? (
             <div className="p-16 text-center bg-white rounded-[3rem] border-4 border-slate-50 shadow-sm flex flex-col items-center">
               <ChefHat className="size-20 text-slate-200 mb-4" />
               <p className="text-slate-400 font-bold uppercase tracking-widest">Your cookbook is empty.<br/>Run the seed script in your terminal!</p>
             </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {(Array.isArray(recipes.data) ? recipes.data : []).map((r: any) => (
                <div 
                  key={r.id} 
                  className="group bg-white rounded-[2rem] overflow-hidden border-4 border-slate-50 shadow-lg hover:shadow-2xl hover:scale-105 transition-all cursor-pointer flex flex-col"
                  onClick={() => {
                    // THE POPUP: Shows the instructions and the image
                    toast(r.name, {
                      description: (
                        <div className="space-y-4 mt-3">
                          {r.image_url && <img src={r.image_url} alt={r.name} className="w-full h-48 object-cover rounded-2xl shadow-inner" />}
                          <div className="bg-slate-50 p-4 rounded-2xl">
                            <span className="font-black text-[10px] uppercase text-slate-400 tracking-widest">Ingredients:</span>
                            <p className="text-sm font-bold text-slate-800 mt-1">{r.ingredients}</p>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-2xl">
                            <span className="font-black text-[10px] uppercase text-slate-400 tracking-widest">Instructions:</span>
                            <p className="text-sm font-bold text-slate-800 mt-1">{r.instructions}</p>
                          </div>
                        </div>
                      ),
                      duration: 20000, // Stays on screen for 20 seconds so you can read it
                    });
                  }}
                >
                  <div className="h-40 bg-slate-100 relative overflow-hidden">
                    {r.image_url ? (
                      <img src={r.image_url} alt={r.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><ChefHat className="text-slate-300 size-12" /></div>
                    )}
                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-primary shadow-sm">
                      {r.category}
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-center text-center bg-white z-10 relative">
                    <h3 className="font-black leading-tight text-slate-900 uppercase tracking-tighter">{r.name}</h3>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
