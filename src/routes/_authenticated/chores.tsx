import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { listMembers, listChores } from "@/lib/hub-api";
import { 
  CheckCircle2, UserCircle, Timer, ArrowLeft, 
  Trophy, ShieldCheck, Zap, Flame, Sword, Sparkles, Plus, Trash2
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/chores")({
  ssr: false,
  component: ChoresKiosk,
});

function ChoresKiosk() {
  const qc = useQueryClient();
  const [activeMember, setActiveMember] = useState<any>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isAdminView, setIsAdminView] = useState(false);
  const [newChore, setNewChore] = useState({ title: "", points: 10 });

  // --- DATA FETCHING ---
  const members = useQuery({ queryKey: ["members"], queryFn: listMembers });
  const chores = useQuery({ queryKey: ["chores"], queryFn: listChores });
  
  const pointsData = useQuery({ 
    queryKey: ["points"], 
    queryFn: () => fetch('/api/points').then(res => res.json()) 
  });
  
  const pendingApprovals = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: () => fetch('/api/completions/pending').then(res => res.json()),
    enabled: !!activeMember
  });

  // --- SAFE MATH (Fixes the .find crash) ---
  const stats = useMemo(() => {
    const data = Array.isArray(pointsData.data) ? pointsData.data : [];
    if (!activeMember || data.length === 0) return { balance: 0, level: 1, progress: 0 };
    const found = data.find((p: any) => p.member_id === activeMember.id);
    if (!found) return { balance: 0, level: 1, progress: 0 };
    return { 
      balance: found.balance, 
      level: Math.floor(found.balance / 100) + 1, 
      progress: found.balance % 100 
    };
  }, [activeMember, pointsData.data]);

  // --- INACTIVITY TIMEOUT ---
  useEffect(() => {
    if (!activeMember) return;
    const interval = setInterval(() => {
      if (Date.now() - lastActivity > 60000) {
        setActiveMember(null);
        setIsAdminView(false);
        toast("Timed out for safety", { icon: <Timer className="size-4" /> });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeMember, lastActivity]);

  const recordActivity = useCallback(() => setLastActivity(Date.now()), []);

  // --- MUTATIONS ---
  const completeChore = useMutation({
    mutationFn: (id: string) => fetch(`/api/chores/${id}/complete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ member_id: activeMember.id }) }).then(res => res.json()),
    onSuccess: () => { toast.success("Quest Submitted! Wait for approval. ⭐"); qc.invalidateQueries({ queryKey: ["pending-approvals"] }); }
  });

  const approveChore = useMutation({
    mutationFn: (id: string) => fetch(`/api/completions/${id}/approve`, { method: "POST" }).then(res => res.json()),
    onSuccess: () => { toast.success("Approved!"); qc.invalidateQueries({ queryKey: ["points"] }); qc.invalidateQueries({ queryKey: ["pending-approvals"] }); }
  });

  const addChore = useMutation({
    mutationFn: (data: any) => fetch('/api/chores', { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(res => res.json()),
    onSuccess: () => { toast.success("Chore Added!"); qc.invalidateQueries({ queryKey: ["chores"] }); setNewChore({ title: "", points: 10 }); }
  });

  const deleteChore = useMutation({
    mutationFn: (id: string) => fetch(`/api/chores/${id}`, { method: "DELETE" }).then(res => res.json()),
    onSuccess: () => { toast.success("Chore Deleted!"); qc.invalidateQueries({ queryKey: ["chores"] }); }
  });

  // --- SCREEN 1: KIOSK MEMBER PICKER ---
  if (!activeMember) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[85vh] p-6">
          <Trophy className="size-16 text-yellow-500 mb-6 animate-bounce" />
          <h1 className="text-5xl font-black mb-12 uppercase italic tracking-tighter">Choose Your Hero</h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl w-full">
            {(Array.isArray(members.data) ? members.data : []).map((m: any) => (
              <button key={m.id} onClick={() => { setActiveMember(m); recordActivity(); }} className="group flex flex-col items-center gap-4">
                <div className="size-48 rounded-[3rem] shadow-2xl border-8 border-white overflow-hidden transition-transform group-hover:scale-105 flex items-center justify-center" style={{ backgroundColor: m.avatar_color }}>
                  {m.avatar_url ? <img src={m.avatar_url} className="size-full object-cover" /> : <UserCircle className="size-20 text-white/50" />}
                </div>
                <span className="text-2xl font-black text-slate-800 uppercase tracking-widest">{m.name}</span>
              </button>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  // --- SCREEN 2: ADMIN OR KID DASHBOARD ---
  return (
    <AppShell>
      <div className="max-w-5xl mx-auto p-6 space-y-8" onMouseMove={recordActivity} onClick={recordActivity}>
        
        {/* HEADER CONTROLS */}
        <div className="flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
          <button onClick={() => { setActiveMember(null); setIsAdminView(false); }} className="flex items-center gap-2 font-black text-slate-400 hover:text-slate-900 transition-colors uppercase text-xs tracking-widest">
            <ArrowLeft /> Character Select
          </button>
          {activeMember.is_parent === 1 && (
            <button onClick={() => setIsAdminView(!isAdminView)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-xl hover:bg-primary transition-all">
              <ShieldCheck /> {isAdminView ? "Exit Mastery" : "Admin Panel"}
            </button>
          )}
        </div>

        {isAdminView ? (
            // === ADMIN VIEW: APPROVALS & CHORE MANAGEMENT ===
          <div className="space-y-10 animate-in fade-in">
             <section className="bg-white p-8 rounded-[3rem] shadow-xl border-4 border-slate-50">
               <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-6 flex items-center gap-3">
                 <ShieldCheck className="text-green-500 size-8" /> Pending Approval
               </h2>
               <div className="grid gap-4">
                 {(Array.isArray(pendingApprovals.data) ? pendingApprovals.data : []).length === 0 && (
                   <p className="text-slate-400 font-bold uppercase tracking-widest text-center py-10">No chores waiting.</p>
                 )}
                 {(Array.isArray(pendingApprovals.data) ? pendingApprovals.data : []).map((p: any) => (
                   <div key={p.id} className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 flex justify-between items-center">
                     <div>
                       {/* FIXED: Using chore_title and member_name from the SQL JOIN */}
                       <p className="font-black text-2xl uppercase tracking-tighter">{p.chore_title}</p>
                       <p className="text-sm font-bold text-primary uppercase tracking-widest mt-1">Done by {p.member_name}</p>
                     </div>
                     <button onClick={() => approveChore.mutate(p.id)} className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-green-200 transition-all active:scale-95 flex items-center gap-2">
                       <CheckCircle2 className="size-6" /> APPROVE
                     </button>
                   </div>
                 ))}
               </div>
             </section>

             <section className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-xl">
               <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-6 flex items-center gap-3">
                 <Zap className="text-yellow-400 size-8" /> Manage Chore Library
               </h2>
               <form onSubmit={(e) => { e.preventDefault(); addChore.mutate(newChore); }} className="flex gap-4 mb-8">
                 <input value={newChore.title} onChange={e => setNewChore({...newChore, title: e.target.value})} placeholder="Chore name..." className="flex-1 p-5 rounded-2xl bg-white/10 border-2 border-white/20 outline-none font-bold text-white placeholder:text-white/30" required />
                 <input type="number" value={newChore.points} onChange={e => setNewChore({...newChore, points: parseInt(e.target.value)})} className="w-28 p-5 rounded-2xl bg-white/10 border-2 border-white/20 outline-none font-black text-white text-center" required />
                 <button type="submit" disabled={addChore.isPending} className="bg-primary px-8 rounded-2xl font-black shadow-lg hover:scale-105 active:scale-95 transition-all"><Plus className="size-6" /></button>
               </form>

               <div className="grid sm:grid-cols-2 gap-4">
                 {(Array.isArray(chores.data) ? chores.data : []).map((c: any) => (
                   <div key={c.id} className="bg-white/5 p-5 rounded-2xl flex justify-between items-center border border-white/10">
                      <div>
                        <p className="font-bold text-lg">{c.title}</p>
                        <p className="text-yellow-400 font-black text-xs uppercase tracking-widest">{c.points} XP</p>
                      </div>
                      <button onClick={() => deleteChore.mutate(c.id)} className="p-3 bg-rose-500/20 text-rose-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                        <Trash2 className="size-5" />
                      </button>
                   </div>
                 ))}
               </div>
             </section>
          </div>
        ) : (
          // === KID VIEW: PROGRESS & QUESTS ===
          <div className="space-y-8 animate-in slide-in-from-bottom-10">
            <div className="bg-white p-10 rounded-[4rem] shadow-2xl border-4 border-slate-50 flex flex-col md:flex-row items-center gap-10 relative overflow-hidden">
               <div className="size-40 rounded-full flex items-center justify-center text-6xl font-black text-white shadow-inner border-[12px] border-white/50" style={{ backgroundColor: activeMember.avatar_color }}>
                 {stats.level}
               </div>
               <div className="flex-1 w-full space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-5xl font-black tracking-tighter uppercase italic">{activeMember.name}</h2>
                    <div className="bg-orange-500 text-white px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-1 shadow-lg shadow-orange-200"><Flame className="size-4" /> 5 DAY STREAK</div>
                  </div>
                  <div className="space-y-2 relative z-10">
                    <div className="flex justify-between text-xs font-black uppercase tracking-widest text-slate-400">
                      <span>Level {stats.level}</span>
                      <span>{stats.balance} Total Pts</span>
                    </div>
                    <div className="h-8 w-full bg-slate-100 rounded-full p-1.5 shadow-inner">
                       <div className="h-full rounded-full transition-all duration-1000 shadow-lg relative" style={{ width: `${stats.progress}%`, backgroundColor: activeMember.avatar_color }}>
                          <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
                       </div>
                    </div>
                  </div>
               </div>
               <Sparkles className="absolute -right-10 -top-10 size-48 text-slate-50 rotate-12" />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
               {(Array.isArray(chores.data) ? chores.data : []).map((c: any) => (
                 <button key={c.id} onClick={() => completeChore.mutate(c.id)} className="group bg-white p-8 rounded-[3rem] border-4 border-slate-50 text-left shadow-lg hover:shadow-2xl hover:border-primary/40 transition-all flex flex-col justify-between aspect-video relative overflow-hidden">
                    <div className="flex justify-between items-start">
                       <div className="p-4 bg-slate-50 rounded-3xl group-hover:scale-110 transition-transform"><Sword className="text-slate-800" /></div>
                       <div className="bg-slate-900 text-white px-5 py-2 rounded-2xl font-black italic">+{c.points} XP</div>
                    </div>
                    <div>
                      <h4 className="text-3xl font-black text-slate-800 leading-none mb-2 uppercase tracking-tighter">{c.title}</h4>
                      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Click to claim quest</p>
                    </div>
                 </button>
               ))}
            </div>
          </div>
        )}
        <footer className="pt-20 text-center">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] flex items-center justify-center gap-2">
            <Timer className="size-3" /> Auto-Reset Kiosk Active
          </p>
        </footer>
      </div>
    </AppShell>
  );
}
