import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, FileText, Globe, Plus, Sparkles } from "lucide-react";

const MEALS = ["Breakfast", "Lunch", "Dinner"] as const;

export function MealAddRecipeModal({ onClose, onRefresh }: any) {
  const [addRecipeTab, setAddRecipeTab] = useState<"manual" | "url">("manual");

  // Manual Form States
  const [mName, setMName] = useState("");
  const [mCategory, setMCategory] = useState("Dinner");
  const [mIngredients, setMIngredients] = useState("");
  const [mInstructions, setMInstructions] = useState("");
  const [mImageUrl, setMImageUrl] = useState("");

  // URL Import States
  const [importUrl, setImportUrl] = useState("");
  const [importCategory, setImportCategory] = useState("Dinner");

  const addRecipeManually = useMutation({
    mutationFn: (data: any) => 
      fetch('/api/meals/recipes', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then(r => r.json()),
    onSuccess: () => {
      onClose();
      onRefresh();
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
      onClose();
      onRefresh();
      toast.success(`Imported "${res.name}" successfully! 🌱`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to import web recipe");
    }
  });

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-xl rounded-[4rem] p-10 shadow-2xl border-[12px] border-slate-50 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">Add New Recipe</h2>
          <button onClick={onClose} className="p-3 bg-slate-100 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-all cursor-pointer"><X /></button>
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
  );
}
