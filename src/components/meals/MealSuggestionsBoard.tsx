import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChefHat, Trash2 } from "lucide-react";

export function MealSuggestionsBoard({ suggestionsData, memberList, isAdmin, onRefresh }: any) {
  const [newSuggestionName, setNewStapleName] = useState("");
  const [suggestedBy, setSuggestedBy] = useState("");

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
      onRefresh();
      toast.success("Meal suggestion posted!");
    },
    onError: () => toast.error("Failed to post suggestion")
  });

  const deleteSuggestion = useMutation({
    mutationFn: (id: string) => 
      fetch(`/api/meals/suggestions/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => {
      onRefresh();
      toast.success("Suggestion dismissed successfully");
    },
    onError: () => toast.error("Failed to dismiss suggestion")
  });

  const list = Array.isArray(suggestionsData) ? suggestionsData : [];

  return (
    <section className="bg-white p-6 sm:p-8 rounded-[3rem] shadow-2xl border-8 border-slate-50 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ChefHat className="size-6 text-indigo-500 shrink-0" />
          <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">Family Suggestions Board</h2>
        </div>
        
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
        {list.length === 0 ? (
          <p className="col-span-full py-16 text-center text-xs font-black text-slate-300 uppercase tracking-wider">No suggestions logged. Put your order in!</p>
        ) : (
          list.map((s: any) => {
            const suggesterHero = memberList.find((m: any) => m.name.toLowerCase() === s.suggested_by.toLowerCase());
            return (
              <div key={s.id} className="group bg-slate-50 p-5 rounded-3xl border-2 border-slate-100 flex items-center justify-between relative shadow-sm border-r-8 transition-all hover:bg-slate-100" style={{ borderRightColor: suggesterHero?.avatar_color || '#334155' }}>
                <div className="flex items-center gap-3">
                  <div 
                    className="size-10 rounded-2xl flex items-center justify-center text-white text-base font-black uppercase shadow-inner"
                    style={{ backgroundColor: suggesterHero?.avatar_color || '#334155' }}
                  >
                    {s.suggested_by[0]}
                  </div>
                  <div>
                    <p className="font-black text-lg text-slate-800 uppercase tracking-tight leading-tight">{s.recipe_name}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">By {s.suggested_by}</p>
                  </div>
                </div>

                {/* Always visible Trash bin icon, instant tap dismissal */}
                {isAdmin && (
                  <button 
                    onClick={() => deleteSuggestion.mutate(s.id)}
                    disabled={deleteSuggestion.isPending}
                    className="p-2.5 bg-white text-rose-500 rounded-xl hover:bg-rose-50 border border-slate-200 transition-all shadow-sm cursor-pointer z-10 shrink-0 ml-1 hover:scale-105 active:scale-95"
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
  );
}
