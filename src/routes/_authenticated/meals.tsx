import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { listMembers } from "@/lib/hub-api";
import { getMe } from "@/lib/auth-client";
import { Loader2, ShoppingBasket } from "lucide-react";

// Sub-Component Imports (Compartmentalized)
import { MealWeeklyPlanner } from "@/components/meals/MealWeeklyPlanner";
import { MealSuggestionsBoard } from "@/components/meals/MealSuggestionsBoard";
import { MealCookbook } from "@/components/meals/MealCookbook";
import { MealAddRecipeModal } from "@/components/meals/MealAddRecipeModal";
import { MealDetailModal } from "@/components/meals/MealDetailModal";

export const Route = createFileRoute("/_authenticated/meals")({
  ssr: false,
  component: MealsPage,
});

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
  
  // Customization/Modal States
  const [showCookbook, setShowCookbook] = useState(false);
  const [showAddRecipeModal, setShowAddRecipeModal] = useState(false);

  const from = toISO(weekStart);
  const toEnd = toISO(new Date(weekStart.getTime() + 6 * 86400000));

  // --- DATA FETCHING ---
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const members = useQuery({ queryKey: ["members"], queryFn: listMembers });
  
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

        {/* --- 1. WEEKLY PLANNER GRID --- */}
        <MealWeeklyPlanner
          weekStart={weekStart}
          planData={plan.data}
          recipesData={recipes.data}
          isAdmin={isAdmin}
          onSetSlot={(v) => setSlot.mutate(v)}
          onClearSlot={(id) => clearSlot.mutate(id)}
        />

        {/* --- 2. DYNAMIC FAMILY SUGGESTIONS BOARD --- */}
        <MealSuggestionsBoard
          suggestionsData={suggestions.data}
          memberList={Array.isArray(members.data) ? members.data : []}
          isAdmin={isAdmin}
          onRefresh={inv}
        />

        {/* --- 3. FAMILY COOKBOOK VISUAL GRID (Collapsible) --- */}
        <MealCookbook
          recipesData={recipes.data}
          isAdmin={isAdmin}
          showCookbook={showCookbook}
          onToggleCookbook={() => setShowCookbook(!showCookbook)}
          onOpenRecipeDetails={(r) => setSelectedRecipe(r)}
          onOpenAddRecipe={() => setShowAddRecipeModal(true)}
          onRefresh={inv}
        />

        {/* --- 4. ADD RECIPE MODAL --- */}
        {showAddRecipeModal && (
          <MealAddRecipeModal
            onClose={() => setShowAddRecipeModal(false)}
            onRefresh={inv}
          />
        )}

        {/* --- 5. RECIPE DETAIL & EDIT MODAL --- */}
        {selectedRecipe && (
          <MealDetailModal
            recipe={selectedRecipe}
            isAdmin={isAdmin}
            onClose={() => setSelectedRecipe(null)}
            onRefresh={inv}
          />
        )}

      </div>
    </AppShell>
  );
}
