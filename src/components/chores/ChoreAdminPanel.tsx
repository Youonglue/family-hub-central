import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck, CheckCircle2, Zap, Plus, Trash2 } from "lucide-react";

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

  // State to handle new quest parameters during creation
  const [newChore, setNewChore] = useState({ title: "", points: 10, is_boss: false, is_coop: false });

  // --- QUERY STATES (Cached) ---
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

  // --- MUTATIONS ---
  const approveChore = useMutation({
    mutationFn: (id: string) => fetch(`/api/chores/completions/${id}/approve`, { method: "POST" }).then(res => res.json()),
    onSuccess: () => { 
        toast.success("Reward Points & XP Granted!"); 
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
        setNewChore({ title: "", points: 10, is_boss: false, is_coop: false }); 
        inv();
    }
  });

  const deleteChore = useMutation({
    mutationFn: (id: string) => fetch(`/api/chores/${id}`, { method: "DELETE" }).then(res => res.json()),
    onSuccess: () => { 
        toast.success("Quest Removed"); 
        inv();
    }
  });

  const pendingList = Array.isArray(pendingApprovals.data) ? pendingApprovals.data : [];
  const choreList = Array.isArray(chores.data) ? chores.data : [];

  return (
    <div className="space-y-6 md:space-y-8 animate-in zoom-in-95 duration-200">
      
      {/* TOP KIOSK HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-white p-4 rounded-3xl shadow-sm border-4 border-slate-50">
        <button onClick={onBack} className="flex items-center justify-center sm:justify-start gap-2 font-black text-slate-400 hover:text-slate-900 transition-colors uppercase text-xs tracking-widest py-2 cursor-pointer focus:outline-none">
          <ArrowLeft size={16} /> {activeMember ? "Exit Admin" : "Character Select"}
        </button>
        
        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
            <p className="font-black uppercase italic text-slate-800 tracking-tight text-sm sm:text-base">{activeMember ? activeMember.name : "System Admin"}</p>
            <button onClick={() => setIsAdminView(false)} className="px-4 py-2.5 sm:px-6 sm:py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-xl transition-all w-full sm:w-auto cursor-pointer bg-slate-900 text-white">
              <ShieldCheck size={18} /> Exit Mastery
            </button>
        </div>
      </div>

      {/* 1. PENDING APPROVALS LIST */}
      <section className="bg-white p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] shadow-xl border-4 border-slate-50">
        <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter mb-4 md:mb-6 flex items-center gap-3 text-slate-900">
          <ShieldCheck className="text-green-500 size-7 md:size-8" /> Pending Approval
        </h2>
        <div className="grid gap-3 md:gap-4">
          {pendingList.length === 0 && (
            <p className="text-slate-400 font-bold uppercase tracking-widest text-center py-10 text-xs sm:text-sm">All quests are verified.</p>
          )}
          {pendingList.map((p: any) => (
            <div key={p.id} className="bg-slate-50 p-4 md:p-6 rounded-[2rem] border-2 border-slate-100 flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-black text-xl md:text-2xl uppercase tracking-tighter text-slate-800 truncate">{p.chore_title}</p>
                  {p.is_boss === 1 && <span className="px-2 py-0.5 bg-rose-100 border border-rose-200 text-rose-600 font-black text-[9px] uppercase rounded">BOSS</span>}
                  {p.is_coop === 1 && <span className="px-2 py-0.5 bg-indigo-100 border border-indigo-200 text-indigo-600 font-black text-[9px] uppercase rounded">CO-OP</span>}
                </div>
                <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mt-1">Claimed by {p.member_name}</p>
              </div>
              <button onClick={() => approveChore.mutate(p.id)} className="bg-green-500 hover:bg-green-600 text-white px-6 py-3.5 rounded-2xl font-black shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-xs sm:text-sm w-full sm:w-auto cursor-pointer">
                <CheckCircle2 size={20} /> APPROVE
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 2. QUEST LIBRARY CREATION & VIEW */}
      <section className="bg-slate-900 text-white p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] shadow-xl">
        <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter mb-4 md:mb-6 flex items-center gap-3">
          <Zap className="text-yellow-400 size-7 md:size-8" /> Quest Library & Creation
        </h2>
        
        {/* Responsive creation form */}
        <form 
          onSubmit={(e) => { 
            e.preventDefault(); 
            addChore.mutate(newChore); 
          }} 
          className="space-y-4 mb-6 md:mb-8 bg-white/5 p-4 md:p-6 rounded-[2rem] border border-white/10"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <input value={newChore.title} onChange={e => setNewChore({...newChore, title: e.target.value})} placeholder="New Quest Title..." className="flex-1 p-4 rounded-xl bg-white/10 border-4 border-transparent focus:border-indigo-500 outline-none font-bold text-white placeholder:text-white/30 text-sm sm:text-base" required />
            <div className="flex gap-3">
              <input type="number" value={newChore.points} onChange={e => setNewChore({...newChore, points: parseInt(e.target.value) || 0})} className="w-24 p-4 rounded-xl bg-white/10 border-4 border-transparent focus:border-indigo-500 outline-none font-black text-white text-center text-sm sm:text-base" required />
              <button type="submit" disabled={addChore.isPending || !newChore.title.trim()} className="flex-1 bg-indigo-500 px-6 py-4 rounded-xl font-black shadow-lg hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm">
                <Plus size={18} /> ADD
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-1">
            {/* Boss Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={newChore.is_boss}
                onChange={(e) => setNewChore({...newChore, is_boss: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
              <span className="ml-3 text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-wider">
                💀 Boss Battle (2x Rewards)
              </span>
            </label>

            {/* Co-Op Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={newChore.is_coop}
                onChange={(e) => setNewChore({...newChore, is_coop: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
              <span className="ml-3 text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-wider">
                👥 Co-Op Quest (+15 XP)
              </span>
            </label>
          </div>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          {choreList.map((c: any) => (
            <div key={c.id} className="bg-white/5 p-4 md:p-5 rounded-2xl flex justify-between items-center border border-white/10 group animate-in fade-in">
               <div className="min-w-0">
                 <div className="flex items-center gap-2 flex-wrap">
                   <p className="font-bold text-sm md:text-lg uppercase tracking-tight truncate">{c.title}</p>
                   {c.is_boss === 1 && <span className="px-1.5 py-0.5 bg-rose-600/30 text-rose-400 font-black text-[8px] uppercase rounded">BOSS</span>}
                   {c.is_coop === 1 && <span className="px-1.5 py-0.5 bg-indigo-600/30 text-indigo-400 font-black text-[8px] uppercase rounded">CO-OP</span>}
                 </div>
                 <p className="text-indigo-400 font-black text-[9px] sm:text-[10px] uppercase tracking-widest">{c.points} XP</p>
               </div>
               <button onClick={() => deleteChore.mutate(c.id)} className="p-2 bg-rose-500/20 text-rose-400 rounded-xl hover:bg-rose-50 hover:text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer">
                 <Trash2 size={16} />
               </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
