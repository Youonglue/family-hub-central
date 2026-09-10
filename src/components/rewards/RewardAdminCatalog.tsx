// src/components/rewards/RewardAdminCatalog.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck, Gift, Plus, Trash2, Users } from "lucide-react";
import { listMembers } from "@/lib/hub-api";

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

  // State handles target hero and clean number deletion
  const [newReward, setNewReward] = useState<{
    title: string;
    points: number | string;
    member_id: string | null;
  }>({ 
    title: "", 
    points: 100,
    member_id: null // null = All / Shared
  });

  const members = useQuery({ queryKey: ["members"], queryFn: listMembers });
  const memberList = Array.isArray(members.data) ? members.data.filter((m: any) => m.is_kid !== 0) : [];

  const rewards = useQuery({ 
    queryKey: ["rewards"], 
    queryFn: () => fetch('/api/rewards').then(res => res.json()) 
  });

  const inv = () => {
    qc.invalidateQueries({ queryKey: ["rewards"] });
    qc.invalidateQueries({ queryKey: ["points"] });
  };

  const addReward = useMutation({
    mutationFn: (data: any) => 
      fetch('/api/rewards', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          points: Number(data.points) || 50
        })
      }).then(res => res.json()),
    onSuccess: () => {
      toast.success("Reward Added to Shop Catalog!");
      setNewReward({ title: "", points: 100, member_id: null });
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
    <div className="space-y-6 md:space-y-8 animate-in zoom-in-95 duration-200 safe-area-inset-bottom">
      
      {/* TOP HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-sm border-2 sm:border-4 border-slate-50">
        <button 
          onClick={onBack} 
          className="flex items-center justify-center sm:justify-start gap-2 font-black text-slate-400 hover:text-slate-900 transition-colors uppercase text-xs tracking-widest py-2 cursor-pointer min-h-[44px]"
        >
          <ArrowLeft size={16} /> {activeMember ? "Exit Admin" : "Character Select"}
        </button>
        
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <p className="font-black uppercase italic text-slate-800 tracking-tight text-sm sm:text-base truncate max-w-[180px] sm:max-w-xs">
            {activeMember ? activeMember.name : "System Admin"}
          </p>
          <button 
            onClick={() => setIsAdminView(false)} 
            className="px-4 py-2.5 sm:px-6 sm:py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all w-full sm:w-auto cursor-pointer bg-slate-900 text-white min-h-[44px] active:scale-95 shrink-0"
          >
            <ShieldCheck size={18} /> Exit Customization
          </button>
        </div>
      </div>

      {/* REWARD CUSTOMIZATION CATALOG BOARD */}
      <section className="bg-slate-900 text-white p-4 sm:p-6 md:p-8 rounded-3xl sm:rounded-[3rem] shadow-xl">
        <h2 className="text-lg sm:text-2xl md:text-3xl font-black uppercase italic tracking-tight mb-4 sm:mb-6 flex items-center gap-2.5 sm:gap-3">
          <Gift className="text-indigo-400 size-6 sm:size-8 shrink-0" /> Reward Catalog & Customization
        </h2>
        
        {/* Creator Form with Hero Assignment */}
        <form 
          onSubmit={(e) => { 
            e.preventDefault(); 
            addReward.mutate(newReward); 
          }} 
          className="space-y-4 mb-6 sm:mb-8 bg-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-white/10"
        >
          {/* Target Hero Selector Pills */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
              Make Reward Available To:
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setNewReward({ ...newReward, member_id: null })}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                  newReward.member_id === null 
                    ? "bg-indigo-600 text-white shadow-md scale-105" 
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                <Users size={13} /> 👥 All Heroes / Shared
              </button>

              {memberList.map((m: any) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setNewReward({ ...newReward, member_id: m.id })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer min-h-[36px] ${
                    newReward.member_id === m.id 
                      ? "bg-indigo-600 text-white shadow-md scale-105" 
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              value={newReward.title} 
              onChange={e => setNewReward({...newReward, title: e.target.value})} 
              placeholder="New Reward Title (e.g. 🍕 Family Pizza Night or ☕ Starbucks)..." 
              className="flex-1 p-3.5 sm:p-4 rounded-xl bg-white/10 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-white placeholder:text-white/30 text-sm min-h-[44px]" 
              required 
            />

            <div className="flex gap-2.5">
              {/* Backspace-friendly Number Input */}
              <input 
                type="number" 
                min="1"
                value={newReward.points} 
                onChange={e => {
                  const val = e.target.value;
                  setNewReward({
                    ...newReward, 
                    points: val === "" ? "" : Math.max(1, parseInt(val, 10) || 1)
                  });
                }} 
                placeholder="100"
                className="w-24 sm:w-28 p-3.5 sm:p-4 rounded-xl bg-white/10 border-2 border-transparent focus:border-indigo-500 outline-none font-black text-white text-center text-sm min-h-[44px]" 
                required 
              />
              
              <button 
                type="submit" 
                disabled={addReward.isPending || !newReward.title.trim()} 
                className="bg-indigo-500 hover:bg-indigo-600 active:scale-95 px-5 sm:px-6 py-3.5 rounded-xl font-black shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider min-h-[44px] disabled:opacity-40 shrink-0"
              >
                <Plus size={16} /> ADD
              </button>
            </div>
          </div>
        </form>

        {/* Existing Rewards List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {rewardList.map((r: any) => (
            <div 
              key={r.id} 
              className="bg-white/5 p-4 rounded-2xl flex justify-between items-center gap-3 border border-white/10 group animate-in fade-in min-w-0"
            >
               <div className="min-w-0 flex-1">
                 <div className="flex items-center gap-1.5 flex-wrap">
                   <p className="font-bold text-sm sm:text-base uppercase tracking-tight text-white break-words line-clamp-2">
                     {r.title}
                   </p>
                   {r.assigned_member_name ? (
                     <span className="px-1.5 py-0.5 bg-indigo-500/30 text-indigo-300 font-black text-[8px] uppercase rounded border border-indigo-400/30 shrink-0">
                       {r.assigned_member_name}
                     </span>
                   ) : (
                     <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 font-black text-[8px] uppercase rounded border border-emerald-400/30 shrink-0">
                       Shared
                     </span>
                   )}
                 </div>
                 <p className="text-indigo-400 font-black text-[9px] sm:text-[10px] uppercase tracking-widest mt-1">
                   {r.points} Points Cost
                 </p>
               </div>

               {/* Touchscreen-Friendly Visible Delete Button */}
               <button 
                 onClick={() => {
                   if (confirm(`Remove "${r.title}" from the shop?`)) {
                     deleteReward.mutate(r.id);
                   }
                 }} 
                 className="p-2.5 bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl transition-all cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0 active:scale-95"
                 title="Delete Reward"
               >
                 <Trash2 size={16} />
               </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
