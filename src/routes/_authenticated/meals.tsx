import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { listMembers } from "@/lib/hub-api";
import { ChefHat, ShoppingBasket, X, Utensils, Info, Eye, Loader2, Sparkles, Plus, Trash2, Globe, FileText, Check } from "lucide-react";
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
  
  // Customization States
  const [showCookbook, setShowCookbook] = useState(false);
  const [showAddRecipeModal, setShowAddRecipeModal] = useState(false);
  const [addRecipeTab, setAddRecipeTab] = useState<"manual" | "url">("manual");

  // Manual Recipe Form States
  const [mName, setMName] = useState("");
  const [mCategory, setMCategory] = useState("Dinner");
  const [mIngredients, setMIngredients] = useState("");
  const [mInstructions, setMInstructions] = useState("");
  const [mImageUrl, setMImageUrl] = useState("");

  // URL Import State
  const [importUrl, setImportUrl] = useState("");
  const [importCategory, setImportCategory] = useState("Dinner");

  // Suggestion input states
  const [newSuggestionName, setNewStapleName] = useState("");
  const [suggestedBy, setSuggestedBy] = useState("");

  const from = toISO(weekStart);
  const toEnd = toISO(new Date(weekStart.getTime() + 6 * 86400000));

  // --- DATA FETCHING ---
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const members = useQuery({ queryKey: ["members"], queryFn: () => listMembers() });
  
  const recipes = useQuery({ 
    queryKey: ["recipes"], 
    queryFn: () => fetch('/api/meals/recipes').then(r => r.json()) 
  });

  const plan = useQuery({
    queryKey: ["meal-plan", from, toEnd],
    queryFn: () => fetch('/api/meals/plan').then(r => r.json()),
  });

  const suggestions = useQuery({
    queryKey: ["meal-suggestions"],
    queryFn: () => fetch('/api/meals/suggestions').then(r => r.json()),
  });

  const isAdmin = me.data?.role?.toLowerCase() === "admin";

  const inv = () => {
    qc.invalidateQueries({ queryKey: ["meal-plan"] });
    qc.invalidateQueries({ queryKey: ["meal-suggestions"] });
    qc.invalidateQueries({ queryKey: ["recipes"] });
  };

  // --- MUTATIONS ---
  const setSlot = useMutation({
    mutationFn: (v: any) => fetch('/api/meals/plan', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(v) }),
    onSuccess: () => { toast.success("Meal Added to Plan"); inv(); },
    onError: () => toast.error("Only Admins can alter the feast!")
  });

  const clearSlot = useMutation({
    mutationFn: (id: string) => fetch(`/api/meals/plan/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success("Slot Cleared"); inv(); },
    onError: () => toast.error("Only Admins can remove meals!")
  });

  const genShop = useMutation({
    mutationFn: () => fetch('/api/meals/build-shopping', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({from, to: toEnd}) }).then(r=>r.json()),
    onSuccess: (res: any) => toast.success(`Shopping list updated with ${res.added} items!`),
  });

  // Suggestion Mutations
  const addSuggestion = useMutation({
    mutationFn: (data: { recipe_name: string; suggested_by: string }) => 
      fetch('/api/meals/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(r => r.json()),
    onSuccess: () => {
      setNewStapleName("");
      setSuggestedBy("");
      inv();
      toast.success("Meal suggestion posted!");
    },
    onError: () => toast.error("Failed to post suggestion")
  });

  const deleteSuggestion = useMutation({
    mutationFn: (id: string) => 
      fetch(`/api/meals/suggestions/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => {
      inv();
      toast.success("Suggestion dismissed");
    },
    onError: () => toast.error("Failed to dismiss suggestion")
  });

  // Cookbook Customization Mutations (Admin Only)
  const addRecipeManually = useMutation({
    mutationFn: (data: any) => 
      fetch('/api/meals/recipes', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then(r => r.json()),
    onSuccess: () => {
      setMName("");
      setMIngredients("");
      setMInstructions("");
      setMImageUrl("");
      setShowAddRecipeModal(false);
      inv();
      toast.success("New recipe saved!");
    },
    onError: () => toast.error("Failed to save recipe")
  });

  const importRecipeFromUrl = useMutation({
    mutationFn: (data: { url: string; category: string }) => 
      fetch('/api/meals/recipes/import-url', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then(async r => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.error || "Web import failed");
        }
        return r.json();
      }),
    onSuccess: (res: any) => {
      setImportUrl("");
      setShowAddRecipeModal(false);
      inv();
      toast.success(`Imported "${res.name}" successfully! 🌱`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to import web recipe");
    }
  });

  const removeRecipe = useMutation({
    mutationFn: (id: string) => 
      fetch(`/api/meals/recipes/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => {
      inv();
      toast.success("Recipe removed from Cookbook");
    },
    onError: () => toast.error("Failed to remove recipe")
  });

  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * 86400000));
  const planMap = new Map<string, any>();
  
  const planData = Array.isArray(plan.data) ? plan.data : [];
  for (const p of planData) {
    planMap.set(`${p.plan_date}:${p.meal}`, p);
  }

  const memberList = Array.isArray(members.data) ? members.data : [];
  const suggestionList = Array.isArray(suggestions.data) ? suggestions.data : [];

  if (me.isLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 space-y-8">
        
        {/* --- HEADER --- */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-black tracking-tight text-slate-900 uppercase italic">Meal Planner</h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest italic">The Weekly Feast Protocol</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-white rounded-2xl shadow-sm border-4 border-slate-50 p-1">
              <button onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * 86400000))} className="p-3 hover:bg-slate-100 rounded-xl transition-all cursor-pointer">‹</button>
              <span className="font-black uppercase tracking-widest text-[10px] flex items-center px-4">{new Date(from).toLocaleDateString()}</span>
              <button onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * 86400000))} className="p-3 hover:bg-slate-100 rounded-xl transition-all cursor-pointer">›</button>
            </div>
            
            {isAdmin && (
              <button onClick={() => genShop.mutate()} className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-indigo-600 transition-all active:scale-95 cursor-pointer">
                <ShoppingBasket size={18} /> BUILD SHOPPING LIST
              </button>
            )}
          </div>
        </header>

        {/* --- WEEKLY PLANNER GRID --- */}
        <section className="overflow-x-auto bg-white rounded-[3rem] p-8 shadow-2xl border-8 border-slate-50">
          <div className="grid min-w-[800px] grid-cols-8 gap-4">
            <div className="flex items-end pb-4 font-black text-slate-200 uppercase tracking-widest text-[10px]">Quest Type</div>
            {days.map((d) => (
              <div key={toISO(d)} className="text-center pb-4 border-b-4 border-slate-50">
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
                    <div key={key} className="relative bg-slate-50 rounded-3xl p-3 min-h-[120px] border-2 border-transparent hover:border-indigo-100 transition-all flex flex-col items-center justify-center text-center group shadow-inner overflow-hidden">
                      {entry ? (
                        <>
                          {entry.image_url && <img src={entry.image_url} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity" />}
                          <p className="relative z-10 text-[10px] font-black leading-tight text-slate-900 uppercase px-2">{entry.recipe_name}</p>
                          
                          {isAdmin && (
                            <button onClick={() => clearSlot.mutate(entry.id)} className="absolute z-20 top-2 right-2 bg-rose-500 text-white rounded-xl p-2 opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110 cursor-pointer">
                              <X size={14} />
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
                          <p className="text-[9px] font-black text-slate-200 uppercase tracking-widest italic">Not Set</p>
                        )
                      )}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </section>

        {/* --- DYNAMIC FAMILY SUGGESTIONS BOARD --- */}
        <section className="bg-white p-6 sm:p-8 rounded-[3rem] shadow-2xl border-8 border-slate-50 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ChefHat className="size-6 text-indigo-500 shrink-0" />
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">Family Suggestions Board</h2>
            </div>
            
            {/* Create suggestion Form (Tablet optimized) */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!newSuggestionName.trim() || !suggestedBy) return;
                addSuggestion.mutate({ recipe_name: newSuggestionName.trim(), suggested_by: suggestedBy });
              }}
              className="flex flex-col sm:flex-row gap-2 bg-slate-50 p-2.5 rounded-2xl border-2 border-slate-100"
            >
              <input
                value={newSuggestionName}
                onChange={(e) => setNewStapleName(e.target.value)}
                placeholder="What are you craving?..."
                required
                className="p-3 bg-white text-sm font-bold rounded-xl border border-slate-100 outline-none focus:border-indigo-500"
              />
              <div className="flex gap-2">
                <select
                  value={suggestedBy}
                  onChange={(e) => setSuggestedBy(e.target.value)}
                  required
                  className="bg-white border border-slate-100 text-xs font-black uppercase rounded-xl p-3 cursor-pointer"
                >
                  <option value="">Choose Hero</option>
                  {memberList.map((m: any) => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
                <button type="submit" disabled={addSuggestion.isPending} className="px-5 py-3 bg-slate-900 text-white rounded-xl hover:bg-indigo-600 transition-all font-black text-xs uppercase cursor-pointer min-h-[44px]">
                  Suggest
                </button>
              </div>
            </form>
          </div>

          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Craving requests from your family adventurers</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {suggestionList.length === 0 ? (
              <p className="col-span-full py-16 text-center text-xs font-black text-slate-300 uppercase tracking-wider">No suggestions logged. Put your order in!</p>
            ) : (
              suggestionList.map((s: any) => {
                const suggesterHero = memberList.find((m: any) => m.name.toLowerCase() === s.suggested_by.toLowerCase());
                return (
                  <div key={s.id} className="group bg-slate-50 p-5 rounded-3xl border-2 border-slate-100 flex items-center justify-between relative shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      {/* Hero Initials Badge */}
                      <div 
                        className="size-10 rounded-2xl flex items-center justify-center text-white text-base font-black uppercase shadow-inner"
                        style={{ backgroundColor: suggesterHero?.avatar_color || '#334155' }}
                        title={`Suggested by ${s.suggested_by}`}
                      >
                        {s.suggested_by[0]}
                      </div>
                      <div>
                        <p className="font-black text-lg text-slate-800 uppercase tracking-tight leading-tight">{s.recipe_name}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">By {s.suggested_by}</p>
                      </div>
                    </div>

                    {/* Admin Delete Action */}
                    {isAdmin && (
                      <button 
                        onClick={() => {
                          if (confirm(`Dismiss suggestion "${s.recipe_name}"?`)) {
                            deleteSuggestion.mutate(s.id);
                          }
                        }}
                        disabled={deleteSuggestion.isPending}
                        className="p-2 bg-white text-rose-500 rounded-xl hover:bg-rose-50 border border-slate-200 transition-all shadow-sm opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Dismiss Request"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* --- FAMILY COOKBOOK VISUAL GRID (Collapsible) --- */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-t border-slate-100 pt-8">
            <div className="flex items-center gap-2">
              <Utensils className="text-indigo-500 size-8 animate-pulse" />
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">Family Cookbook</h2>
            </div>
            
            <div className="flex gap-2">
              {/* Add Recipe Button (Admin Only) */}
              {isAdmin && (
                <button 
                  onClick={() => setShowAddRecipeModal(true)}
                  className="px-6 py-3 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-md hover:bg-indigo-500 transition-all cursor-pointer"
                >
                  <Plus size={16} /> Add Recipe
                </button>
              )}
              
              <button 
                onClick={() => setShowCookbook(!showCookbook)}
                className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-md transition-all cursor-pointer ${
                  showCookbook 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-indigo-50 text-indigo-600 border-2 border-indigo-100'
                }`}
              >
                <ChefHat size={16} /> {showCookbook ? "Hide Cookbook" : "Browse Cookbook"}
              </button>
            </div>
          </div>
          
          {showCookbook ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 animate-in fade-in zoom-in-95 duration-200">
              {(Array.isArray(recipes.data) ? recipes.data : []).map((r: any) => (
                <div 
                  key={r.id} 
                  className="group bg-white rounded-[2.5rem] overflow-hidden border-4 border-slate-50 shadow-xl hover:shadow-2xl hover:scale-105 transition-all cursor-pointer flex flex-col relative"
                  onClick={() => setSelectedRecipe(r)}
                >
                  <div className="h-52 bg-slate-100 relative overflow-hidden">
                    <img src={r.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'} alt={r.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute top-4 left-4 bg-white/95 backdrop-blur px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest text-indigo-600 shadow-sm flex items-center gap-2">
                      <Info size={12} /> {r.category}
                    </div>

                    {/* Admin Deletion Button (Floats in top-right on card hover) */}
                    {isAdmin && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to permanently delete "${r.name}" from the Cookbook?`)) {
                            removeRecipe.mutate(r.id);
                          }
                        }}
                        className="absolute top-4 right-4 bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-400 p-2 rounded-xl transition-all shadow-md opacity-0 group-hover:opacity-100 cursor-pointer border border-slate-100 z-10"
                        title="Delete from Cookbook"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
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
          ) : (
            <div className="p-12 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-100">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Cookbook is hidden to save space</p>
              <button 
                onClick={() => setShowCookbook(true)}
                className="mt-3 text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:underline cursor-pointer"
              >
                Open Cookbook Library →
              </button>
            </div>
          )}
        </section>

        {/* --- ADD RECIPE MODAL (Admin Only: Supports Manual & Web-Import) --- */}
        {showAddRecipeModal && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowAddRecipeModal(false)}>
            <div className="bg-white w-full max-w-xl rounded-[4rem] p-10 shadow-2xl border-[12px] border-slate-50 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
              
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">Add New Recipe</h2>
                <button onClick={() => setShowAddRecipeModal(false)} className="p-3 bg-slate-100 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-all cursor-pointer"><X /></button>
              </div>

              {/* Tabs for Add Method */}
              <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl mb-6">
                <button 
                  onClick={() => setAddRecipeTab("manual")}
                  className={`flex-1 py-3 rounded-xl font-black uppercase text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${addRecipeTab === "manual" ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <FileText size={14} /> Manual Add
                </button>
                <button 
                  onClick={() => setAddRecipeTab("url")}
                  className={`flex-1 py-3 rounded-xl font-black uppercase text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${addRecipeTab === "url" ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <Globe size={14} /> Import from Web
                </button>
              </div>

              {/* Tab Content area */}
              <div className="overflow-y-auto pr-2 space-y-6 flex-1 custom-scrollbar">
                {addRecipeTab === "manual" ? (
                  <form 
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!mName.trim()) return;
                      addRecipeManually.mutate({
                        name: mName.trim(),
                        category: mCategory,
                        ingredients: mIngredients.trim(),
                        instructions: mInstructions.trim(),
                        image_url: mImageUrl.trim()
                      });
                    }}
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Recipe Name</span>
                      <input value={mName} onChange={e => setMName(e.target.value)} required className="w-full rounded-2xl border-4 border-slate-50 bg-slate-50 p-4 font-bold text-slate-800 outline-none focus:border-indigo-500" placeholder="e.g. Grandma's Spaghetti" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Meal Category</span>
                        <select value={mCategory} onChange={e => setMCategory(e.target.value)} className="w-full rounded-2xl border-4 border-slate-50 bg-slate-50 p-4 font-black uppercase text-xs cursor-pointer">
                          {MEALS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Plated Photo URL (Optional)</span>
                        <input value={mImageUrl} onChange={e => setMImageUrl(e.target.value)} className="w-full rounded-2xl border-4 border-slate-50 bg-slate-50 p-4 font-bold text-slate-800 outline-none focus:border-indigo-500" placeholder="https://..." />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Ingredients (One per line)</span>
                      <textarea value={mIngredients} onChange={e => setMIngredients(e.target.value)} rows={4} className="w-full rounded-2xl border-4 border-slate-50 bg-slate-50 p-4 font-bold text-slate-800 outline-none focus:border-indigo-500 resize-none" placeholder="1 lb Spaghetti&#10;2 cans Tomato Sauce&#10;1 lb Ground Beef" />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Cooking Instructions</span>
                      <textarea value={mInstructions} onChange={e => setMInstructions(e.target.value)} rows={4} className="w-full rounded-2xl border-4 border-slate-50 bg-slate-50 p-4 font-bold text-slate-800 outline-none focus:border-indigo-500 resize-none" placeholder="1. Boil pasta&#10;2. Brown ground beef&#10;3. Simmer sauce" />
                    </div>

                    <button type="submit" disabled={addRecipeManually.isPending} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-sm tracking-wider shadow-lg hover:bg-indigo-600 transition-all cursor-pointer min-h-[48px]">
                      {addRecipeManually.isPending ? "Saving..." : "Save Recipe to Cookbook"}
                    </button>
                  </form>
                ) : (
                  <form 
                    className="space-y-6"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!importUrl.trim()) return;
                      importRecipeFromUrl.mutate({ url: importUrl.trim(), category: importCategory });
                    }}
                  >
                    <div className="p-4 bg-indigo-50 border-2 border-indigo-100 rounded-3xl text-center space-y-2">
                      <Sparkles className="size-6 text-indigo-600 animate-pulse mx-auto" />
                      <p className="text-xs font-black text-indigo-900 uppercase tracking-wide">Web Scraper Active</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">Paste any recipe URL (e.g. Serious Eats, Food Network). The system will automatically parse out ingredients and instructions!</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Recipe Web Link (URL)</span>
                      <input value={importUrl} onChange={e => setImportUrl(e.target.value)} required className="w-full rounded-2xl border-4 border-slate-50 bg-slate-50 p-4 font-bold text-slate-800 outline-none focus:border-indigo-500" placeholder="https://www.seriouseats.com/..." />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Meal Category Assignment</span>
                      <select value={importCategory} onChange={e => setImportCategory(e.target.value)} className="w-full rounded-2xl border-4 border-slate-50 bg-slate-50 p-4 font-black uppercase text-xs cursor-pointer">
                        {MEALS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>

                    <button type="submit" disabled={importRecipeFromUrl.isPending} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-sm tracking-wider shadow-lg hover:bg-indigo-600 transition-all cursor-pointer min-h-[48px]">
                      {importRecipeFromUrl.isPending ? "Scraping & Importing..." : "Auto-Import Recipe"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- RECIPE DETAIL MODAL --- */}
        {selectedRecipe && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setSelectedRecipe(null)}>
            <div className="bg-white w-full max-w-2xl rounded-[4rem] p-10 shadow-2xl border-[12px] border-slate-50 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">{selectedRecipe.name}</h2>
                  <p className="text-indigo-500 font-black text-xs uppercase tracking-widest mt-2">{selectedRecipe.category} Masterclass</p>
                </div>
                <button onClick={() => setSelectedRecipe(null)} className="p-4 bg-slate-100 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-all cursor-pointer"><X /></button>
              </div>

              <div className="overflow-y-auto pr-4 space-y-8 custom-scrollbar">
                <img src={selectedRecipe.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'} alt={selectedRecipe.name} className="w-full h-64 object-cover rounded-[3rem] shadow-2xl" />
                
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
