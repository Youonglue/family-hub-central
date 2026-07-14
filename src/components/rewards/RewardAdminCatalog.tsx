import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck, Gift, Plus, Trash2 } from "lucide-react";

interface RewardAdminCatalogProps {
  activeMember: any;
  onBack: () => void;
  isAdminView: boolean;
  setIsAdminView: (show: boolean) => void;
}

export function RewardAdminCatalog({
  activeMember,
  onBack,
  isAdminView,
  setIsAdminView
}: RewardAdminCatalogProps) {
  const qc = useQueryClient();

  // State to handle new reward parameters
  const [newReward, setNewReward] = useState({ title: "", points: 100 });

  // --- QUERY STATES (Cached) ---
  const rewards = useQuery({ 
    queryKey: ["rewards"], 
    queryFn: () => fetch('/api/rewards').then(res => res.json()) 
  });

  const inv = () => {
    qc.invalidateQueries({ queryKey: ["rewards"] });
    qc.invalidateQueries({ queryKey: ["points"] });
  };

  // --- MUTATIONS ---
  const addReward = useMutation({
    mutationFn: (data: any) => 
      fetch('/api/rewards', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then(res => res.json()),
    onSuccess: () => {
      toast.success("Reward Added to Shop Catalog!");
      setNewReward({ title: "", points: 100 });
      inv();
    }
  });

  const deleteReward = useMutation({
    mutationFn: (id: string) => 
      fetch(`/api/rewards/${id}`, { method: "DELETE" }).then(res => res.json()),
    onSuccess: () => {
      toast.success("Reward Removed from Catalog");
      inv();
    }
  });

  const rewardList = Array.isArray(rewards.data) ? rewards.data : [];

  return (
    <div className="space-y-6 md:space-y-8 animate-in zoom-in-95 duration-200">
      
      {/* TOP HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-white p-4 rounded-3xl shadow-sm border-4 border-slate-50">
        <button onClick={onBack} className="flex items-center justify-center sm:justify-start gap-2 font-black text-slate-400 hover:text-slate-900 transition-colors uppercase text-xs tracking-widest py-2 cursor-pointer focus:outline-none">
          <ArrowLeft size={16} /> {activeMember ? "Exit Admin" : "Character Select"}
        </button>
        
        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
            <p className="font-black uppercase italic text-slate-800">{activeMember ? activeMember.name : "System Admin"}</p>
            <button onClick={() => setIsAdminView(false)} className="px-4 py-2.5 sm:px-6 sm:py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-xl transition-all w-full sm:w-auto cursor-pointer bg-slate-900 text-white">
              <ShieldCheck size={18} /> Exit Customization
            </button>
        </div>
      </div>

      {/* REWARD CUSTOMIZATION CATALOG BOARD */}
      <section className="bg-slate-900 text-white p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] shadow-xl">
        <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter mb-4 md:mb-6 flex items-center gap-3">
          <Gift className="text-indigo-400 size-7 md:size-8" /> Reward Catalog & Customization
        </h2>
        
        {/* Mobile-Friendly Stacking Creator Form */}
        <form 
          onSubmit={(e) => { 
            e.preventDefault(); 
            addReward.mutate(newReward); 
          }} 
          className="space-y-4 mb-6 md:mb-8 bg-white/5 p-4 md:p-6 rounded-[2rem] border border-white/10"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <input value={newReward.title} onChange={e => setNewReward({...newReward, title: e.target.value})} placeholder="New Reward Title (e.g. 1hr Video Games)..." className="flex-1 p-4 rounded-xl bg-white/10 border-4 border-transparent focus:border-indigo-500 outline-none font-bold text-white placeholder:text-white/30 text-sm sm:text-base" required />
            <div className="flex gap-3">
              <input type="number" value={newReward.points} onChange={e => setNewReward({...newReward, points: parseInt(e.target.value) || 0})} className="w-24 p-4 rounded-xl bg-white/10 border-4 border-transparent focus:border-indigo-500 outline-none font-black text-white text-center text-sm sm:text-base" required />
              <button type="submit" disabled={addReward.isPending || !newReward.title.trim()} className="flex-1 bg-indigo-500 px-6 py-4 rounded-xl font-black shadow-lg hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm">
                <Plus size={18} /> ADD
              </button>
            </div>
          </div>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          {rewardList.map((r: any) => (
            <div key={r.id} className="bg-white/5 p-4 md:p-5 rounded-2xl flex justify-between items-center border border-white/10 group animate-in fade-in">
               <div className="min-w-0">
                 <p className="font-bold text-sm md:text-lg uppercase tracking-tight truncate">{r.title}</p>
                 <p className="text-indigo-400 font-black text-[9px] sm:text-[10px] uppercase tracking-widest">{r.points} Points Cost</p>
               </div>
               <button onClick={() => deleteReward.mutate(r.id)} className="p-2 bg-rose-500/20 text-rose-400 rounded-xl hover:bg-rose-50 hover:text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer">
                 <Trash2 size={16} />
               </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
