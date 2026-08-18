// src/components/chores/ChoreAdminPanel.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck, CheckCircle2, Zap, Plus, Trash2, X } from "lucide-react";

interface ChoreAdminPanelProps {
  activeMember: any;
  onBack: () => void;
  isAdminView: boolean;
  setIsAdminView: (show: boolean) => void;
}

export function ChoreAdminPanel({
  activeMember,
  onBack,
  isAdminView,
  setIsAdminView
}: ChoreAdminPanelProps) {
  const qc = useQueryClient();

  const [newChore, setNewChore] = useState({ 
    title: "", 
    points: 10, 
    xp: 10, 
    is_boss: false, 
    is_coop: false 
  });

  const chores = useQuery({ 
    queryKey: ["chores"], 
    queryFn: () => fetch('/api/chores').then(res => res.json()) 
  });

  const pendingApprovals = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: () => fetch('/api/chores/completions/pending').then(res => res.json())
  });

  const inv = () => {
    qc.invalidateQueries({ queryKey: ["chores"] });
    qc.invalidateQueries({ queryKey: ["pending-approvals"] });
    qc.invalidateQueries({ queryKey: ["points"] });
    qc.invalidateQueries({ queryKey: ["members"] });
  };

  const approveChore = useMutation({
    mutationFn: (id: string) => fetch(`/api/chores/completions/${id}/approve`, { method: "POST" }).then(res => res.json()),
    onSuccess: (res: any) => { 
      toast.success(`Approved! Granted +${res.pointsAwarded || 0} PTS and +${res.xpAwarded || 0} XP ⭐`); 
      inv();
    }
  });

  const declineChore = useMutation({
    mutationFn: (id: string) => fetch(`/api/chores/completions/${id}/reject`, { method: "POST" }).then(res => res.json()),
    onSuccess: () => {
      toast.info("Quest submission declined");
      inv();
    }
  });

  const addChore = useMutation({
    mutationFn: (data: any) => fetch('/api/chores', { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(data) 
    }).then(res => res.json()),
    onSuccess: () => { 
        toast.success("Quest Added to Library!"); 
        setNewChore({ title: "", points: 10, xp: 10, is_boss: false, is_coop: false }); 
        inv();
    }
  });

  const deleteChore = useMutation({
    mutationFn: (id: string) => fetch(`/api/chores/${id}`, { method: "DELETE" }).then(res => res.json()),
    onSuccess: () => { 
        toast.success("Quest Removed from Library"); 
        inv();
    }
  });

  const pendingList = Array.isArray(pendingApprovals.data) ? pendingApprovals.data : [];
  const choreList = Array.isArray(chores.data) ? chores.data : [];

  return (
    <div className="space-y-6 md:space-y-8 animate-in zoom-in-95 duration-200">
      
      {/* TOP KIOSK HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-sm border-2 sm:border-4 border-slate-50">
        <button 
          onClick={onBack} 
          className="flex items-center justify-center sm:justify-start gap-2 font-black text-slate-400 hover:text-slate-900 transition-colors uppercase text-xs tracking-widest py-2 cursor-pointer min-h-[44px]"
        >
          <ArrowLeft size={16} /> {activeMember ? "Exit Admin" : "Character Select"}
        </button>
        
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <p className="font-black uppercase italic text-slate-800 tracking-tight text-sm sm:text-base">
            {activeMember ? activeMember.name : "System Admin"}
          </p>
          <button 
            onClick={() => setIsAdminView(false)} 
            className="px-4 py-2.5 sm:px-6 sm:py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all w-full sm:w-auto cursor-pointer bg-slate-900 text-white min-h-[44px] active:scale-95"
          >
            <ShieldCheck size={18} /> Exit Mastery
          </button>
        </div>
      </div>

      {/* 1. PENDING APPROVALS LIST */}
      <section className="bg-white p-5 sm:p-8 rounded-3xl sm:rounded-[3rem] shadow-xl border-2 sm:border-4 border-slate-50">
        <h2 className="text-xl sm:text-3xl font-black uppercase italic tracking-tighter mb-4 sm:mb-6 flex items-center gap-2.5 sm:gap-3 text-slate-900">
          <ShieldCheck className="text-green-500 size-6 sm:size-8" /> Pending Quest Approvals
        </h2>

        <div className="grid gap-3 sm:gap-4">
          {pendingList.length === 0 && (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs sm:text-sm">All quests are verified.</p>
            </div>
          )}

          {pendingList.map((p: any) => {
            const basePts = p.base_points !== undefined ? p.base_points : (p.points_awarded || 0);
            const baseXp = p.base_xp !== null && p.base_xp !== undefined ? p.base_xp : basePts;

            // Boss = 3x Points & 1x XP; Co-Op = 2x Points & 2x XP
            const finalPts = p.is_boss === 1 ? basePts * 3 : p.is_coop === 1 ? basePts * 2 : basePts;
            const finalXp = p.is_boss === 1 ? baseXp : p.is_coop === 1 ? baseXp * 2 : baseXp;

            return (
              <div 
                key={p.id} 
                className="bg-slate-50 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-slate-200 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-between sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-lg sm:text-2xl uppercase tracking-tighter text-slate-800 truncate">{p.chore_title}</p>
                    {p.is_boss === 1 && (
                      <span className="px-2 py-0.5 bg-rose-100 border border-rose-200 text-rose-600 font-black text-[9px] uppercase rounded">
                        BOSS 3x PTS
                      </span>
                    )}
                    {p.is_coop === 1 && (
                      <span className="px-2 py-0.5 bg-indigo-100 border border-indigo-200 text-indigo-600 font-black text-[9px] uppercase rounded">
                        CO-OP 2x
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs font-bold text-slate-500 uppercase tracking-wider flex-wrap">
                    <span className="text-indigo-600 font-black">Claimed by {p.member_name}</span>
                    <span>•</span>
                    <span className="text-emerald-600 font-black">+{finalPts} PTS</span>
                    <span>•</span>
                    <span className="text-purple-600 font-black">+{finalXp} XP</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-auto pt-2 sm:pt-0">
                  <button 
                    onClick={() => declineChore.mutate(p.id)}
                    className="p-3 bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-400 border border-slate-200 rounded-xl transition-all active:scale-95 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Decline Quest"
                  >
                    <X size={18} />
                  </button>

                  <button 
                    onClick={() => approveChore.mutate(p.id)} 
                    className="flex-1 sm:flex-none bg-green-500 hover:bg-green-600 active:scale-95 text-white px-5 sm:px-6 py-3 rounded-2xl font-black shadow-md transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer min-h-[44px]"
                  >
                    <CheckCircle2 size={18} /> APPROVE (+{finalPts} PTS)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. QUEST LIBRARY CREATION & VIEW */}
      <section className="bg-slate-900 text-white p-5 sm:p-8 rounded-3xl sm:rounded-[3rem] shadow-xl">
        <h2 className="text-xl sm:text-3xl font-black uppercase italic tracking-tighter mb-4 sm:mb-6 flex items-center gap-2.5 sm:gap-3">
          <Zap className="text-yellow-400 size-6 sm:size-8" /> Quest Library & Creation
        </h2>
        
        <form 
          onSubmit={(e) => { 
            e.preventDefault(); 
            addChore.mutate(newChore); 
          }} 
          className="space-y-4 mb-6 sm:mb-8 bg-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-white/10"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6">
              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Quest Title</label>
              <input 
                value={newChore.title} 
                onChange={e => setNewChore({...newChore, title: e.target.value})} 
                placeholder="e.g. 🧹 Clean Bedroom & Organize Books" 
                className="w-full p-3.5 rounded-xl bg-white/10 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-white placeholder:text-white/30 text-sm min-h-[44px]" 
                required 
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-[9px] font-black uppercase tracking-wider text-emerald-400 block mb-1">Reward Points (Shop)</label>
              <input 
                type="number" 
                value={newChore.points} 
                onChange={e => {
                  const pts = parseInt(e.target.value) || 0;
                  setNewChore({
                    ...newChore, 
                    points: pts,
                    xp: newChore.xp === newChore.points ? pts : newChore.xp
                  });
                }} 
                className="w-full p-3.5 rounded-xl bg-white/10 border-2 border-transparent focus:border-emerald-500 outline-none font-black text-white text-center text-sm min-h-[44px]" 
                required 
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-[9px] font-black uppercase tracking-wider text-purple-400 block mb-1">Experience XP (Level Up)</label>
              <input 
                type="number" 
                value={newChore.xp} 
                onChange={e => setNewChore({...newChore, xp: parseInt(e.target.value) || 0})} 
                className="w-full p-3.5 rounded-xl bg-white/10 border-2 border-transparent focus:border-purple-500 outline-none font-black text-white text-center text-sm min-h-[44px]" 
                required 
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-white/10">
            <div className="flex flex-wrap items-center gap-4">
              {/* Boss Toggle Switch (3x Reward Points) */}
              <label className="relative inline-flex items-center cursor-pointer select-none min-h-[44px]">
                <input
                  type="checkbox"
                  checked={newChore.is_boss}
                  onChange={(e) => setNewChore({
                    ...newChore, 
                    is_boss: e.target.checked, 
                    is_coop: e.target.checked ? false : newChore.is_coop 
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                <span className="ml-3 text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-wider">
                  💀 Boss Battle (3x Reward Points)
                </span>
              </label>

              {/* Co-Op Toggle Switch (2x Double Rewards & XP) */}
              <label className="relative inline-flex items-center cursor-pointer select-none min-h-[44px]">
                <input
                  type="checkbox"
                  checked={newChore.is_coop}
                  onChange={(e) => setNewChore({
                    ...newChore, 
                    is_coop: e.target.checked, 
                    is_boss: e.target.checked ? false : newChore.is_boss 
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                <span className="ml-3 text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-wider">
                  👥 Co-Op Quest (2x Double Rewards & XP)
                </span>
              </label>
            </div>

            <button 
              type="submit" 
              disabled={addChore.isPending || !newChore.title.trim()} 
              className="w-full sm:w-auto bg-indigo-500 hover:bg-indigo-600 active:scale-95 px-6 py-3.5 rounded-xl font-black shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider min-h-[44px] disabled:opacity-40"
            >
              <Plus size={16} /> ADD QUEST TO LIBRARY
            </button>
          </div>
        </form>

        {/* Existing Quest Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {choreList.map((c: any) => {
            const basePts = c.points || 0;
            const baseXp = c.xp !== null && c.xp !== undefined ? c.xp : basePts;

            const finalPts = c.is_boss === 1 ? basePts * 3 : c.is_coop === 1 ? basePts * 2 : basePts;
            const finalXp = c.is_boss === 1 ? baseXp : c.is_coop === 1 ? baseXp * 2 : baseXp;

            return (
              <div 
                key={c.id} 
                className="bg-white/5 p-4 rounded-2xl flex justify-between items-center border border-white/10 group animate-in fade-in"
              >
                 <div className="min-w-0 flex-1 pr-2">
                   <div className="flex items-center gap-2 flex-wrap">
                     <p className="font-bold text-sm sm:text-base uppercase tracking-tight truncate text-white">{c.title}</p>
                     {c.is_boss === 1 && <span className="px-1.5 py-0.5 bg-rose-600/30 text-rose-400 font-black text-[8px] uppercase rounded">BOSS 3x PTS</span>}
                     {c.is_coop === 1 && <span className="px-1.5 py-0.5 bg-indigo-600/30 text-indigo-400 font-black text-[8px] uppercase rounded">CO-OP 2x</span>}
                   </div>
                   
                   <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-black uppercase tracking-widest mt-1">
                     <span className="text-emerald-400">+{finalPts} PTS</span>
                     <span className="text-slate-500">•</span>
                     <span className="text-purple-400">+{finalXp} XP</span>
                   </div>
                 </div>

                 <button 
                   onClick={() => deleteChore.mutate(c.id)} 
                   className="p-2.5 bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 active:scale-95"
                   title="Delete Quest"
                 >
                   <Trash2 size={16} />
                 </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
