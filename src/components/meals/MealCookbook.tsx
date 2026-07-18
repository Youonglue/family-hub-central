import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChefHat, Plus, Utensils, Info, Trash2, Eye } from "lucide-react";

export function MealCookbook({ recipesData, isAdmin, showCookbook, onToggleCookbook, onOpenRecipeDetails, onOpenAddRecipe, onRefresh }: any) {
  const removeRecipe = useMutation({
    mutationFn: (id: string) => 
      fetch(`/api/meals/recipes/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => {
      onRefresh();
      toast.success("Recipe removed from Cookbook successfully");
    },
    onError: () => toast.error("Failed to remove recipe")
  });

  const list = Array.isArray(recipesData) ? recipesData : [];

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between border-t border-slate-100 pt-8">
        <div className="flex items-center gap-2">
          <Utensils className="text-indigo-500 size-8 animate-pulse" />
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">Family Cookbook</h2>
        </div>
        
        <div className="flex gap-2">
          {isAdmin && (
            <button 
              onClick={onOpenAddRecipe}
              className="px-6 py-3 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-md hover:bg-indigo-500 transition-all cursor-pointer animate-in fade-in duration-200"
            >
              <Plus size={16} /> Add Recipe
            </button>
          )}
          
          <button 
            onClick={onToggleCookbook}
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
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6 animate-in fade-in zoom-in-95 duration-200">
          {list.map((r: any) => (
            <div 
              key={r.id} 
              className="group bg-white rounded-3xl sm:rounded-[2.5rem] overflow-hidden border-2 sm:border-4 border-slate-50 shadow-md sm:shadow-xl hover:shadow-2xl hover:scale-105 transition-all cursor-pointer flex flex-col relative"
              onClick={() => onOpenRecipeDetails(r)}
            >
              <div className="h-32 sm:h-52 bg-slate-100 relative overflow-hidden">
                <img src={r.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'} alt={r.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-white/95 backdrop-blur px-2.5 py-1 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-indigo-600 shadow-sm flex items-center gap-1 sm:gap-2">
                  <Info size={10} /> {r.category}
                </div>

                {/* Admin Deletion Button: Prompt-free instant delete on click */}
                {isAdmin && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      // Instant deletion without browser popups
                      removeRecipe.mutate(r.id);
                    }}
                    className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-400 p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all shadow-md opacity-0 group-hover:opacity-100 cursor-pointer border border-slate-100 z-10 hover:scale-105 active:scale-95"
                    title="Delete from Cookbook"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              <div className="p-4 sm:p-6 text-center flex-1 flex flex-col justify-between">
                <h3 className="font-black text-sm sm:text-lg leading-tight text-slate-900 uppercase tracking-tighter line-clamp-2">{r.name}</h3>
                <p className="mt-2 text-[8px] sm:text-[10px] font-black text-slate-300 uppercase tracking-widest group-hover:text-indigo-500 transition-colors flex items-center justify-center gap-1">
                  <Eye size={12} /> VIEW RECIPE
                </p>
              </div>
            </div>
          ))}
        </div>
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
    </section>
  );
}
