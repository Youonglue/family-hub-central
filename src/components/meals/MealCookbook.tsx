// src/components/meals/MealCookbook.tsx
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  ChefHat, 
  Plus, 
  Utensils, 
  Info, 
  Trash2, 
  Eye, 
  CheckSquare, 
  Square, 
  Check, 
  X, 
  AlertTriangle,
  Layers
} from "lucide-react";

export function MealCookbook({ 
  recipesData, 
  isAdmin, 
  showCookbook, 
  onToggleCookbook, 
  onOpenRecipeDetails, 
  onOpenAddRecipe, 
  onRefresh 
}: any) {
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const list = Array.isArray(recipesData) ? recipesData : [];

  // Single Recipe Removal
  const removeRecipe = useMutation({
    mutationFn: (id: string) => 
      fetch(`/api/meals/recipes/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => {
      onRefresh();
      toast.success("Recipe removed from Cookbook successfully");
    },
    onError: () => toast.error("Failed to remove recipe")
  });

  // Bulk Recipes Removal
  const bulkRemoveRecipes = useMutation({
    mutationFn: (ids: string[]) =>
      fetch("/api/meals/recipes/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      }).then(r => {
        if (!r.ok) throw new Error("Bulk delete failed");
        return r.json();
      }),
    onSuccess: (data: any) => {
      onRefresh();
      toast.success(`Successfully removed ${data.count || selectedIds.length} recipes`);
      setSelectedIds([]);
      setIsSelectMode(false);
      setShowConfirmModal(false);
    },
    onError: () => {
      toast.error("Failed to delete selected recipes");
      setShowConfirmModal(false);
    }
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === list.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(list.map((r: any) => r.id));
    }
  };

  const handleExitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedIds([]);
    setShowConfirmModal(false);
  };

  return (
    <section className="space-y-6 relative">
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-8">
        <div className="flex items-center gap-2">
          <Utensils className="text-indigo-500 size-8 animate-pulse" />
          <div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">Family Cookbook</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {list.length} {list.length === 1 ? 'Recipe' : 'Recipes'} Available
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && showCookbook && (
            <>
              {isSelectMode ? (
                <button 
                  onClick={handleExitSelectMode}
                  className="px-4 sm:px-6 py-3 rounded-2xl bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-300 transition-all cursor-pointer"
                >
                  <X size={16} /> Cancel Selection
                </button>
              ) : (
                <button 
                  onClick={() => setIsSelectMode(true)}
                  className="px-4 sm:px-6 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-amber-100 transition-all cursor-pointer"
                >
                  <Layers size={16} /> Select Multiple
                </button>
              )}

              <button 
                onClick={onOpenAddRecipe}
                className="px-4 sm:px-6 py-3 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-md hover:bg-indigo-500 transition-all cursor-pointer animate-in fade-in duration-200"
              >
                <Plus size={16} /> Add Recipe
              </button>
            </>
          )}
          
          <button 
            onClick={() => {
              if (showCookbook) handleExitSelectMode();
              onToggleCookbook();
            }}
            className={`px-4 sm:px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-md transition-all cursor-pointer ${
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
        <>
          {/* MULTI-SELECT STATUS BAR (When in Selection Mode) */}
          {isSelectMode && (
            <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-lg border border-slate-800 animate-in fade-in slide-in-from-top-4 duration-200">
              <div className="flex items-center gap-3">
                <span className="bg-indigo-500 text-white text-xs font-black px-3 py-1.5 rounded-xl uppercase tracking-widest">
                  {selectedIds.length} Selected
                </span>
                <p className="text-xs font-bold text-slate-300 hidden sm:inline">
                  Tap recipes or checkboxes to select/deselect
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
                >
                  {selectedIds.length === list.length ? (
                    <>
                      <Square size={14} className="text-slate-400" /> Deselect All
                    </>
                  ) : (
                    <>
                      <CheckSquare size={14} className="text-indigo-400" /> Select All ({list.length})
                    </>
                  )}
                </button>

                {selectedIds.length > 0 && (
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
                  >
                    <Trash2 size={14} /> Delete Selected ({selectedIds.length})
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6 animate-in fade-in zoom-in-95 duration-200">
            {list.map((r: any) => {
              const isSelected = selectedIds.includes(r.id);

              return (
                <div 
                  key={r.id} 
                  className={`group bg-white rounded-3xl sm:rounded-[2.5rem] overflow-hidden border-2 sm:border-4 transition-all cursor-pointer flex flex-col relative select-none ${
                    isSelected 
                      ? 'border-indigo-600 ring-4 ring-indigo-500/20 shadow-2xl scale-[0.98]' 
                      : 'border-slate-50 shadow-md sm:shadow-xl hover:shadow-2xl hover:scale-105'
                  }`}
                  onClick={() => {
                    if (isSelectMode) {
                      toggleSelect(r.id);
                    } else {
                      onOpenRecipeDetails(r);
                    }
                  }}
                >
                  <div className="h-32 sm:h-52 bg-slate-100 relative overflow-hidden">
                    <img 
                      src={r.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'} 
                      alt={r.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                    />
                    
                    <div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-white/95 backdrop-blur px-2.5 py-1 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-indigo-600 shadow-sm flex items-center gap-1 sm:gap-2">
                      <Info size={10} /> {r.category}
                    </div>

                    {/* MULTI-SELECT CHECKBOX (Top Right) */}
                    {isSelectMode ? (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect(r.id);
                        }}
                        className={`absolute top-2 right-2 sm:top-4 sm:right-4 size-8 sm:size-10 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all cursor-pointer z-10 shadow-lg ${
                          isSelected 
                            ? 'bg-indigo-600 text-white scale-110' 
                            : 'bg-white/95 text-slate-400 hover:text-slate-700 border border-slate-200'
                        }`}
                      >
                        {isSelected ? <Check size={18} className="stroke-[3]" /> : <Square size={18} />}
                      </div>
                    ) : (
                      /* SINGLE DELETE BUTTON (When not in multi-select mode) */
                      isAdmin && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeRecipe.mutate(r.id);
                          }}
                          className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-400 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl transition-all shadow-md opacity-0 group-hover:opacity-100 cursor-pointer border border-slate-100 z-10 hover:scale-105 active:scale-95"
                          title="Delete from Cookbook"
                        >
                          <Trash2 size={14} />
                        </button>
                      )
                    )}
                  </div>

                  <div className="p-4 sm:p-6 text-center flex-1 flex flex-col justify-between">
                    <h3 className="font-black text-sm sm:text-lg leading-tight text-slate-900 uppercase tracking-tighter line-clamp-2">
                      {r.name}
                    </h3>
                    
                    <p className={`mt-2 text-[8px] sm:text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1 transition-colors ${
                      isSelected ? 'text-indigo-600' : 'text-slate-300 group-hover:text-indigo-500'
                    }`}>
                      {isSelectMode ? (
                        isSelected ? "✓ SELECTED" : "TAP TO SELECT"
                      ) : (
                        <>
                          <Eye size={12} /> VIEW RECIPE
                        </>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* TABLET/MOBILE FIXED BOTTOM ACTION BAR (When Items are Selected) */}
          {isSelectMode && selectedIds.length > 0 && (
            <div className="fixed bottom-6 inset-x-4 sm:inset-x-auto sm:right-8 sm:w-auto z-40 animate-in slide-in-from-bottom-6 duration-200">
              <div className="bg-slate-900 text-white px-6 py-4 rounded-3xl shadow-2xl border-2 border-slate-700 flex items-center justify-between sm:justify-start gap-4">
                <div>
                  <span className="font-black text-sm uppercase tracking-tight block">
                    {selectedIds.length} {selectedIds.length === 1 ? 'Recipe' : 'Recipes'} Selected
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Ready for batch action
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                  >
                    <Trash2 size={16} /> Delete Selected
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="p-12 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-100">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Cookbook is hidden to save space</p>
          <button 
            onClick={onToggleCookbook}
            className="mt-3 text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:underline cursor-pointer"
          >
            Open Cookbook Library →
          </button>
        </div>
      )}

      {/* MULTI-DELETE CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full shadow-2xl border-4 border-slate-100 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="size-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle size={32} />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-black uppercase italic tracking-tight text-slate-900">
                Delete {selectedIds.length} Recipes?
              </h3>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">
                This will permanently delete the selected recipes from the family cookbook and remove them from any scheduled meal plan slots.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="w-full py-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-widest transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={bulkRemoveRecipes.isPending}
                onClick={() => bulkRemoveRecipes.mutate(selectedIds)}
                className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-200 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {bulkRemoveRecipes.isPending ? "Deleting..." : "Yes, Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
