import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Edit2, Save } from "lucide-react";

const MEALS = ["Breakfast", "Lunch", "Dinner"] as const;

export function MealDetailModal({ recipe, isAdmin, onClose, onRefresh }: any) {
  const [isEditingRecipe, setIsEditingRecipe] = useState(false);
  const [editName, setEditName] = useState(recipe.name);
  const [editCategory, setEditCategory] = useState(recipe.category);
  const [editIngredients, setEditIngredients] = useState(recipe.ingredients || "");
  const [editInstructions, setEditInstructions] = useState(recipe.instructions || "");
  const [editImageUrl, setEditImageUrl] = useState(recipe.image_url || "");

  const updateRecipeDetails = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      fetch(`/api/meals/recipes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then(r => r.json()),
    onSuccess: () => {
      setIsEditingRecipe(false);
      onRefresh();
      toast.success("Recipe edits saved!");
      onClose();
    },
    onError: () => toast.error("Failed to update recipe")
  });

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl rounded-[4rem] p-10 shadow-2xl border-[12px] border-slate-50 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            {isEditingRecipe ? (
              <input 
                value={editName} 
                onChange={e => setEditName(e.target.value)} 
                className="w-full p-2 bg-slate-50 border-2 border-slate-200 rounded-xl font-black text-2xl uppercase italic outline-none focus:border-indigo-500"
              />
            ) : (
              <h2 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">{recipe.name}</h2>
            )}
            
            {isEditingRecipe ? (
              <select 
                value={editCategory} 
                onChange={e => setEditCategory(e.target.value)} 
                className="p-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest mt-2 outline-none cursor-pointer"
              >
                {MEALS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            ) : (
              <p className="text-indigo-500 font-black text-xs uppercase tracking-widest mt-2">{recipe.category} Masterclass</p>
            )}
          </div>
          
          <div className="flex gap-2 shrink-0">
            {isAdmin && (
              <button 
                onClick={() => setIsEditingRecipe(!isEditingRecipe)} 
                className={`p-4 rounded-full shadow-sm transition-all border ${isEditingRecipe ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 border-slate-200'}`}
              >
                <Edit2 size={16} />
              </button>
            )}
            <button onClick={onClose} className="p-4 bg-slate-100 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-all"><X /></button>
          </div>
        </div>

        <div className="overflow-y-auto pr-4 space-y-8 custom-scrollbar flex-1">
          {isEditingRecipe ? (
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Photo Image Link</span>
              <input 
                value={editImageUrl} 
                onChange={e => setEditImageUrl(e.target.value)} 
                className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500 text-xs"
              />
            </div>
          ) : (
            <img src={recipe.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'} alt={recipe.name} className="w-full h-64 object-cover rounded-[3rem] shadow-2xl" />
          )}
          
          <div className="grid grid-cols-1 gap-8">
            <div className="bg-slate-50 p-8 rounded-[3rem]">
              <h4 className="font-black text-indigo-500 uppercase text-xs tracking-widest mb-4">Ingredients (The Loot)</h4>
              {isEditingRecipe ? (
                <textarea 
                  value={editIngredients} 
                  onChange={e => setEditIngredients(e.target.value)} 
                  rows={6}
                  className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500 resize-none text-sm"
                />
              ) : (
                <p className="text-slate-800 font-bold leading-relaxed whitespace-pre-line">{recipe.ingredients || "No ingredients listed."}</p>
              )}
            </div>

            <div className="p-2">
              <h4 className="font-black text-indigo-500 uppercase text-xs tracking-widest mb-4">Cooking Steps (The Quest)</h4>
              {isEditingRecipe ? (
                <textarea 
                  value={editInstructions} 
                  onChange={e => setEditInstructions(e.target.value)} 
                  rows={6}
                  className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500 resize-none text-sm"
                />
              ) : (
                <p className="text-slate-600 leading-relaxed font-medium whitespace-pre-line">{recipe.instructions || "No instructions listed."}</p>
              )}
            </div>
          </div>
        </div>

        {isEditingRecipe ? (
          <button 
            onClick={() => updateRecipeDetails.mutate({
              id: recipe.id,
              data: {
                name: editName,
                category: editCategory,
                ingredients: editIngredients,
                instructions: editInstructions,
                image_url: editImageUrl
              }
            })}
            disabled={updateRecipeDetails.isPending}
            className="mt-8 w-full py-6 bg-green-500 hover:bg-green-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xl shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            <Save size={20} /> {updateRecipeDetails.isPending ? "Saving Edits..." : "SAVE RECIPE CHANGES"}
          </button>
        ) : (
          <button onClick={onClose} className="mt-8 w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xl shadow-xl hover:bg-indigo-600 transition-all cursor-pointer">
            CLOSE RECIPE
          </button>
        )}
      </div>
    </div>
  );
}
