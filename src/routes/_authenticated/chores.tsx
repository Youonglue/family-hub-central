import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { listMembers } from "@/lib/hub-api";
import { 
  CheckCircle2, UserCircle, Timer, ArrowLeft, 
  Trophy, ShieldCheck, Zap, Flame, Sword, Plus, Trash2,
  Ghost, Cat, Dog, Rabbit, Shield
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/chores")({
  ssr: false,
  component: ChoresKiosk,
});

// HERO ICON MAP
const ICONS: Record<string, any> = { Ghost, Cat, Dog, Rabbit, Shield, UserCircle };

function ChoresKiosk() {
  const qc = useQueryClient();
  const [activeMember, setActiveMember] = useState<any>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isAdminView, setIsAdminView] = useState(false);
  const [newChore, setNewChore] = useState({ title: "", points: 10 });

  // --- DATA FETCHING (Aligned with Modular Paths) ---
  const members = useQuery({ queryKey: ["members"], queryFn: listMembers });
  
  // Directly fetching from /api/chores to ensure visibility
  const chores = useQuery({ 
    queryKey: ["chores"], 
    queryFn: () => fetch('/api/chores').then(res => res.json()) 
  });
  
  const pointsData = useQuery({ 
    queryKey: ["points"], 
    queryFn: () => fetch('/api/chores/points').then(res => res.json()) 
  });
  
  const pendingApprovals = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: () => fetch('/api/chores/completions/pending').then(res => res.json()),
    enabled: !!activeMember
  });

  // --- MUSCLE STATS: Using XP and Level from DB ---
  const stats = useMemo(() => {
    const data = Array.isArray(pointsData.data) ? pointsData.data : [];
    if (!activeMember || data.length === 0) return { balance: 0, level: 1, progress: 0, xp: 0 };
    const found = data.find((p: any) => p.member_id === activeMember.id);
    if (!found) return { balance: 0, level: 1, progress: 0, xp: 0 };
    
    return { 
      balance: found.balance, 
      level: found.level || 1, 
      xp: found.xp || 0,
      progress: (found.xp || 0) % 100 // Progress towards next level
    };
  }, [activeMember, pointsData.data]);

  // --- INACTIVITY TIMEOUT ---
  useEffect(() => {
    if (!activeMember) return;
    const interval = setInterval(() => {
      if (Date.now() - lastActivity > 60000) {
        setActiveMember(null);
        setIsAdminView(false);
        toast("Hub Reset for Safety", { icon: <Timer className="size-4" /> });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeMember, lastActivity]);

  const recordActivity = useCallback(() => setLastActivity(Date.now()), []);

  // --- MUTATIONS ---
  const completeChore = useMutation({
    mutationFn: (id: string) => fetch(`/api/chores/${id}/complete`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ member_id: activeMember.id }) 
    }).then(res => res.json()),
    onSuccess: () => { 
        toast.success("Quest Submitted! Wait for approval. ⭐"); 
        qc.invalidateQueries({ queryKey: ["pending-approvals"] }); 
    }
  });

  const approveChore = useMutation({
    mutationFn: (id: string) => fetch(`/api/chores/completions/${id}/approve`, { method: "POST" }).then(res => res.json()),
    onSuccess: () => { 
        toast.success("Reward Points & XP Granted!"); 
        qc.invalidateQueries({ queryKey: ["points"] }); 
        qc.invalidateQueries({ queryKey: ["pending-approvals"] }); 
        qc.invalidateQueries({ queryKey: ["members"] });
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
        qc.invalidateQueries({ queryKey: ["chores"] }); 
        setNewChore({ title: "", points: 10 }); 
    }
  });

  const deleteChore = useMutation({
    mutationFn: (id: string) => fetch(`/api/chores/${id}`, { method: "DELETE" }).then(res => res.json()),
    onSuccess: () => { 
        toast.success("Quest Removed"); 
        qc.invalidateQueries({ queryKey: ["chores"] }); 
    }
  });

  // --- SCREEN 1: KIOSK CHARACTER SELECT ---
  if (!activeMember) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[85vh] p-6">
          <Trophy className="size-16 text-yellow-500 mb-6 animate-bounce" />
          <h1 className="text-5xl font-black mb-12 uppercase italic tracking-tighter text-slate-900">Choose Your Hero</h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl w-full">
            {(Array.isArray(members.data) ? members.data : []).map((m: any) => {
              const HeroIcon = ICONS[m.avatar_icon] || UserCircle;
              return (
                <button key={m.id} onClick={() => { setActiveMember(m); recordActivity(); }} className="group flex flex-col items-center gap-4">
                  <div className="size-48 rounded-[3rem] shadow-2xl border-8 border-white transition-all group-hover:scale-105 group-hover:rotate-3 flex items-center justify-center text-white" style={{ backgroundColor: m.avatar_color }}>
                    <HeroIcon size={80} />
                  </div>
                  <span className="text-2xl font-black text-slate-800 uppercase tracking-widest">{m.name}</span>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Level {m.level || 1}</p>
                </button>
              );
            })}
          </div>
        </div>
      </AppShell>
    );
  }

  // --- SCREEN 2: ACTIVE KIOSK DASHBOARD ---
  return (
    <AppShell>
      <div className="max-w-5xl mx-auto p-6 space-y-8" onMouseMove={recordActivity} onClick={recordActivity}>
        
        {/* TOP CONTROLS */}
        <div className="flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm border-4 border-slate-50">
          <button onClick={() => { setActiveMember(null); setIsAdminView(false); }} className="flex items-center gap-2 font-black text-slate-400 hover:text-slate-900 transition-colors uppercase text-xs tracking-widest px-4">
            <ArrowLeft size={16} /> Character Select
          </button>
          
          <div className="flex items-center gap-4">
              <p className="font-black uppercase italic text-slate-800">{activeMember.name}</p>
              {activeMember.is_parent === 1 && (
                <button onClick={() => setIsAdminView(!isAdminView)} className={`px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-xl transition-all ${isAdminView ? 'bg-slate-900 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                  <ShieldCheck size={18} /> {isAdminView ? "Exit Mastery" : "Admin Panel"}
                </button>
              )}
          </div>
        </div>

        {isAdminView ? (
            // === ADMIN VIEW: APPROVALS & MANAGEMENT ===
          <div className="space-y-10 animate-in zoom-in-95 duration-200">
             <section className="bg-white p-8 rounded-[3rem] shadow-xl border-4 border-slate-50">
               <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-6 flex items-center gap-3 text-slate-900">
                 <ShieldCheck className="text-green-500 size-8" /> Pending Approval
               </h2>
               <div className="grid gap-4">
                 {(Array.isArray(pendingApprovals.data) ? pendingApprovals.data : []).length === 0 && (
                   <p className="text-slate-400 font-bold uppercase tracking-widest text-center py-10">All quests are verified.</p>
                 )}
                 {(Array.isArray(pendingApprovals.data) ? pendingApprovals.data : []).map((p: any) => (
                   <div key={p.id} className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 flex justify-between items-center">
                     <div>
                       <p className="font-black text-2xl uppercase tracking-tighter text-slate-800">{p.chore_title}</p>
                       <p className="text-sm font-bold text-indigo-500 uppercase tracking-widest mt-1">Claimed by {p.member_name}</p>
                     </div>
                     <button onClick={() => approveChore.mutate(p.id)} className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl transition-all active:scale-95 flex items-center gap-2">
                       <CheckCircle2 size={24} /> APPROVE
                     </button>
                   </div>
                 ))}
               </div>
             </section>

             <section className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-xl">
               <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-6 flex items-center gap-3">
                 <Zap className="text-yellow-400 size-8" /> Quest Library
               </h2>
               <form onSubmit={(e) => { e.preventDefault(); addChore.mutate(newChore); }} className="flex gap-4 mb-8">
                 <input value={newChore.title} onChange={e => setNewChore({...newChore, title: e.target.value})} placeholder="New Quest Title..." className="flex-1 p-5 rounded-2xl bg-white/10 border-4 border-transparent focus:border-indigo-500 outline-none font-bold text-white placeholder:text-white/30" required />
                 <input type="number" value={newChore.points} onChange={e => setNewChore({...newChore, points: parseInt(e.target.value)})} className="w-28 p-5 rounded-2xl bg-white/10 border-4 border-transparent focus:border-indigo-500 outline-none font-black text-white text-center" required />
                 <button type="submit" disabled={addChore.isPending} className="bg-indigo-500 px-8 rounded-2xl font-black shadow-lg hover:bg-indigo-600 transition-all"><Plus size={28} /></button>
               </form>

               <div className="grid sm:grid-cols-2 gap-4">
                 {(Array.isArray(chores.data) ? chores.data : []).map((c: any) => (
                   <div key={c.id} className="bg-white/5 p-5 rounded-2xl flex justify-between items-center border border-white/10 group">
                      <div>
                        <p className="font-bold text-lg uppercase tracking-tight">{c.title}</p>
                        <p className="text-indigo-400 font-black text-[10px] uppercase tracking-widest">{c.points} XP</p>
                      </div>
                      <button onClick={() => deleteChore.mutate(c.id)} className="p-3 bg-rose-500/20 text-rose-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 size={18} />
                      </button>
                   </div>
                 ))}
               </div>
             </section>
          </div>
        ) : (
          // === KID VIEW: PROGRESS & ACTIVE QUESTS ===
          <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-300">
            <div className="bg-white p-10 rounded-[4rem] shadow-2xl border-4 border-slate-50 flex flex-col md:flex-row items-center gap-10 relative overflow-hidden">
               <div className="size-40 rounded-[2.5rem] flex items-center justify-center text-6xl font-black text-white shadow-2xl border-[10px] border-white/30 animate-in zoom-in-50 duration-500" style={{ backgroundColor: activeMember.avatar_color }}>
                 {stats.level}
               </div>
               <div className="flex-1 w-full space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-5xl font-black tracking-tighter uppercase italic text-slate-900">{activeMember.name}</h2>
                    <div className="bg-orange-500 text-white px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-1 shadow-lg"><Flame className="size-4" /> HERO STATUS</div>
                  </div>
                  <div className="space-y-2 relative z-10">
                    <div className="flex justify-between text-xs font-black uppercase tracking-widest text-slate-400">
                      <span>Level {stats.level}</span>
                      <span>{stats.balance} Total Points</span>
                    </div>
                    <div className="h-10 w-full bg-slate-100 rounded-full p-2 shadow-inner border-2 border-slate-50">
                       <div className="h-full rounded-full transition-all duration-1000 shadow-lg relative" style={{ width: `${stats.progress}%`, backgroundColor: activeMember.avatar_color }}>
                          <div className="absolute inset-0 bg-white/30 animate-pulse rounded-full" />
                       </div>
                    </div>
                    <p className="text-[10px] font-black text-slate-300 uppercase text-right tracking-widest">{100 - stats.progress} XP TO LEVEL UP</p>
                  </div>
               </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
               {(Array.isArray(chores.data) ? chores.data : []).map((c: any) => (
                 <button key={c.id} onClick={() => completeChore.mutate(c.id)} className="group bg-white p-8 rounded-[3.5rem] border-4 border-slate-50 text-left shadow-lg hover:shadow-2xl hover:border-indigo-100 transition-all flex flex-col justify-between aspect-video relative overflow-hidden">
                    <div className="flex justify-between items-start">
                       <div className="p-4 bg-slate-50 rounded-3xl group-hover:rotate-12 transition-transform shadow-sm text-slate-800">
                           <Sword size={32} />
                       </div>
                       <div className="bg-slate-900 text-white px-5 py-2 rounded-2xl font-black italic shadow-lg">+{c.points} XP</div>
                    </div>
                    <div>
                      <h4 className="text-4xl font-black text-slate-800 leading-none mb-2 uppercase tracking-tighter">{c.title}</h4>
                      <p className="text-indigo-400 font-bold uppercase text-[10px] tracking-[0.2em] group-hover:translate-x-2 transition-transform">Begin Quest →</p>
                    </div>
                 </button>
               ))}
            </div>
          </div>
        )}
        
        <footer className="pt-20 text-center">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] flex items-center justify-center gap-2 opacity-50">
            <Timer className="size-3" /> Auto-Reset Kiosk Engaged
          </p>
        </footer>
      </div>
    </AppShell>
  );
}
