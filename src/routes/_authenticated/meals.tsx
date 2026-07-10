import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ChefHat, ShoppingBasket, X, Utensils, Info, Eye } from "lucide-react";
import { getMe } from "@/lib/auth-client";

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
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  
  const from = toISO(weekStart);
  const toEnd = toISO(new Date(weekStart.getTime() + 6 * 86400000));

  // 1. Fetch Data & User Role
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const recipes = useQuery({ queryKey: ["recipes"], queryFn: () => fetch('/api/meals/recipes').then(r => r.json()) });
  const plan = useQuery({
    queryKey: ["meal-plan", from, toEnd],
    queryFn: () => fetch('/api/meals/plan').then(r => r.json()),
  });

  const isAdmin = me.data && "role" in me.data && me.data.role === "admin";

  const inv = () => {
    qc.invalidateQueries({ queryKey: ["meal-plan"] });
  };

  // 2. Mutations
  const setSlot = useMutation({
    mutationFn: (v: any) => fetch('/api/meals/plan', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(v) }),
    onSuccess: () => { toast.success("Meal Added"); inv(); },
    onError: () => toast.error("Admin Privileges Required")
  });

  const clearSlot = useMutation({
    mutationFn: (id: string) => fetch(`/api/meals/plan/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success("Meal Removed"); inv(); },
    onError: () => toast.error("Admin Privileges Required")
  });

  const genShop = useMutation({
    mutationFn: () => fetch('/api/meals/build-shopping', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({from, to: toEnd}) }).then(r=>r.json()),
    onSuccess: (res: any) => toast.success(`Shopping list updated with ${res.added} items!`),
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
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">The Great Family Feast Schedule</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-white rounded-2xl shadow-sm border border-slate-100 p-1">
              <button onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * 86400000))} className="p-3 hover:bg-slate-50 rounded-xl transition-all">‹</button>
              <span className="font-black uppercase tracking-widest text-[10px] flex items-center px-4">{new Date(from).toLocaleDateString()}</span>
              <button onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * 86400000))} className="p-3 hover:bg-slate-50 rounded-xl transition-all">›</button>
            </div>
            
            {isAdmin && (
              <button onClick={() => genShop.mutate()} className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-indigo-600 transition-all">
                <ShoppingBasket size={18} /> BUILD SHOPPING LIST
              </button>
            )}
          </div>
        </header>

        {/* --- WEEKLY PLANNER GRID --- */}
        <section className="mb-12 overflow-x-auto bg-white rounded-[3rem] p-8 shadow-2xl border-4 border-slate-50">
          <div className="grid min-w-[800px] grid-cols-8 gap-4">
            <div className="flex items-end pb-4 font-black text-slate-300 uppercase tracking-widest text-[10px]">Quest Type</div>
            {days.map((d) => (
              <div key={toISO(d)} className="text-center pb-4 border-b-4 border-slate-100">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{d.toLocaleDateString(undefined, { weekday: "short" })}</p>
                <p className="text-3xl font-black text-slate-800">{d.getDate()}</p>
              </div>
            ))}

            {MEALS.map((m) => (
              <Fragment key={m}>
                <div className="flex items-center font-black text-xs text-indigo-500 uppercase tracking-widest">{m}</div>
                {days.map((d) => {
                  const key = `${toISO(d)}:${m}`;
                  const entry = planMap.get(key);
                  return (
                    <div key={key} className="relative bg-slate-50 rounded-3xl p-3 min-h-[120px] border-2 border-transparent hover:border-indigo-200 transition-all flex flex-col items-center justify-center text-center group shadow-sm overflow-hidden">
                      {entry ? (
                        <>
                          {entry.image_url && <img src={entry.image_url} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-opacity" />}
                          <p className="relative z-10 text-[10px] font-black leading-tight text-slate-900 uppercase px-2">{entry.recipe_name}</p>
                          
                          {isAdmin && (
                            <button onClick={() => clearSlot.mutate(entry.id)} className="absolute z-20 top-2 right-2 bg-rose-500 text-white rounded-xl p-2 opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110">
                              <X className="size-4" />
                            </button>
                          )}
                        </>
                      ) : (
                        isAdmin ? (
                          <select
                            className="w-full bg-transparent text-[10px] font-black text-slate-300 uppercase tracking-widest outline-none cursor-pointer hover:text-indigo-600 transition-colors appearance-none text-center"
                            onChange={(e) => { if (e.target.value) setSlot.mutate({ plan_date: toISO(d), meal: m, recipe_id: e.target.value }); }}
                            value=""
                          >
                            <option value="">+ {m}</option>
                            {(Array.isArray(recipes.data) ? recipes.data : [])
                              .filter((r: any) => r.category === m)
                              .map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                        ) : (
                          <p className="text-[10px] font-black text-slate-200 uppercase tracking-widest italic">No Feasts Logged</p>
                        )
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
            <Utensils className="text-indigo-500 size-8" /> Family Cookbook
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {(Array.isArray(recipes.data) ? recipes.data : []).map((r: any) => (
              <div 
                key={r.id} 
                className="group bg-white rounded-[2.5rem] overflow-hidden border-4 border-slate-50 shadow-xl hover:shadow-2xl hover:scale-105 transition-all cursor-pointer flex flex-col"
                onClick={() => setSelectedRecipe(r)}
              >
                <div className="h-52 bg-slate-100 relative overflow-hidden">
                  <img src={r.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'} alt={r.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute top-4 left-4 bg-white/95 backdrop-blur px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest text-indigo-600 shadow-sm flex items-center gap-2">
                    <Info size={12} /> {r.category}
                  </div>
                </div>
                <div className="p-6 text-center">
                  <h3 className="font-black text-lg leading-tight text-slate-900 uppercase tracking-tighter">{r.name}</h3>
                  <p className="mt-3 text-[10px] font-black text-slate-300 uppercase tracking-widest group-hover:text-indigo-500 transition-colors flex items-center justify-center gap-2">
                    <Eye size={14} /> VIEW RECIPE
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* --- RECIPE MODAL (The detailed view for ingredients & steps) --- */}
        {selectedRecipe && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setSelectedRecipe(null)}>
            <div className="bg-white w-full max-w-2xl rounded-[4rem] p-10 shadow-2xl border-[12px] border-slate-50 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">{selectedRecipe.name}</h2>
                  <p className="text-indigo-500 font-black text-xs uppercase tracking-widest mt-2">{selectedRecipe.category} Masterclass</p>
                </div>
                <button onClick={() => setSelectedRecipe(null)} className="p-4 bg-slate-100 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-all"><X /></button>
              </div>

              <div className="overflow-y-auto pr-4 space-y-8 custom-scrollbar">
                <img src={selectedRecipe.image_url} alt={selectedRecipe.name} className="w-full h-64 object-cover rounded-[3rem] shadow-2xl" />
                
                <div className="grid grid-cols-1 gap-8">
                  <div className="bg-slate-50 p-8 rounded-[3rem]">
                    <h4 className="font-black text-indigo-500 uppercase text-xs tracking-widest mb-4">Ingredients (The Loot)</h4>
                    <p className="text-slate-800 font-bold leading-relaxed whitespace-pre-line">{selectedRecipe.ingredients || "No ingredients listed."}</p>
                  </div>

                  <div className="p-2">
                    <h4 className="font-black text-indigo-500 uppercase text-xs tracking-widest mb-4">Cooking Steps (The Quest)</h4>
                    <p className="text-slate-600 leading-relaxed font-medium whitespace-pre-line">{selectedRecipe.instructions || "No instructions listed."}</p>
                  </div>
                </div>
              </div>

              <button onClick={() => setSelectedRecipe(null)} className="mt-8 w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xl shadow-xl hover:bg-indigo-600 transition-all">
                CLOSE RECIPE
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
