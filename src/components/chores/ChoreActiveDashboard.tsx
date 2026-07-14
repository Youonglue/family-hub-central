import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck, Flame, Sword, Timer } from "lucide-react";

interface ChoreActiveDashboardProps {
  activeMember: any;
  onBack: () => void;
  isAdminView: boolean;
  setIsAdminView: (show: boolean) => void;
  canAccessAdmin: boolean;
}

export function ChoreActiveDashboard({
  activeMember,
  onBack,
  isAdminView,
  setIsAdminView,
  canAccessAdmin
}: ChoreActiveDashboardProps) {
  const qc = useQueryClient();

  // --- QUERY STATES (Cached) ---
  const chores = useQuery({ 
    queryKey: ["chores"], 
    queryFn: () => fetch('/api/chores').then(res => res.json()) 
  });
  
  const pointsData = useQuery({ 
    queryKey: ["points"], 
    queryFn: () => fetch('/api/chores/points').then(res => res.json()) 
  });

  // Calculate XP, balance, and streak dynamically
  const stats = useMemo(() => {
    const data = Array.isArray(pointsData.data) ? pointsData.data : [];
    if (!activeMember || data.length === 0) return { balance: 0, level: 1, progress: 0, xp: 0, streak_count: 0 };
    const found = data.find((p: any) => p.member_id === activeMember.id);
    if (!found) return { balance: 0, level: 1, progress: 0, xp: 0, streak_count: 0 };
    
    return { 
      balance: found.balance, 
      level: found.level || 1, 
      xp: found.xp || 0,
      streak_count: found.streak_count || 0,
      progress: (found.xp || 0) % 100
    };
  }, [activeMember, pointsData.data]);

  // --- MUTATION ---
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

  const choreList = Array.isArray(chores.data) ? chores.data : [];

  return (
    <div className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom-5 duration-300">
      
      {/* TOP KIOSK HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-white p-4 rounded-3xl shadow-sm border-4 border-slate-50">
        <button onClick={onBack} className="flex items-center justify-center sm:justify-start gap-2 font-black text-slate-400 hover:text-slate-900 transition-colors uppercase text-xs tracking-widest py-2 cursor-pointer focus:outline-none">
          <ArrowLeft size={16} /> Character Select
        </button>
        
        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
            <p className="font-black uppercase italic text-slate-800 tracking-tight text-sm sm:text-base">{activeMember.name}</p>
            {canAccessAdmin && (
              <button onClick={() => setIsAdminView(!isAdminView)} className={`px-4 py-2.5 sm:px-6 sm:py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-xl transition-all w-full sm:w-auto cursor-pointer ${isAdminView ? 'bg-slate-900 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                <ShieldCheck size={18} /> {isAdminView ? "Exit Mastery" : "Admin Panel"}
              </button>
            )}
        </div>
      </div>

      {/* HERO CHARACTER DETAILS PANEL */}
      <div className="bg-white p-6 md:p-10 rounded-[3rem] md:rounded-[4rem] shadow-2xl border-4 border-slate-50 flex flex-col md:flex-row items-center gap-6 md:gap-10 relative overflow-hidden">
         <div className="size-28 sm:size-40 rounded-[2rem] sm:rounded-[2.5rem] flex items-center justify-center text-4xl sm:text-6xl font-black text-white shadow-2xl border-4 sm:border-[10px] border-white/30 shrink-0" style={{ backgroundColor: activeMember.avatar_color }}>
           {stats.level}
         </div>
         <div className="flex-1 w-full space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h2 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase italic text-slate-900 truncate max-w-full text-center sm:text-left">{activeMember.name}</h2>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {stats.streak_count > 0 && (
                  <div className="bg-orange-500 text-white px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-black flex items-center gap-1 shadow-lg animate-bounce">
                    <Flame className="size-3.5 sm:size-4" /> {stats.streak_count}d Streak
                  </div>
                )}
                <div className="bg-slate-900 text-white px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-black flex items-center justify-center gap-1 shadow-lg"><Flame className="size-3.5 sm:size-4" /> HERO STATUS</div>
              </div>
            </div>
            <div className="space-y-1 sm:space-y-2 relative z-10">
              <div className="flex justify-between text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400">
                <span>Level {stats.level}</span>
                <span>{stats.balance} Total Points</span>
              </div>
              <div className="h-8 sm:h-10 w-full bg-slate-100 rounded-full p-1.5 sm:p-2 shadow-inner border-2 border-slate-50">
                 <div className="h-full rounded-full transition-all duration-1000 shadow-lg relative" style={{ width: `${stats.progress}%`, backgroundColor: activeMember.avatar_color }}>
                    <div className="absolute inset-0 bg-white/30 animate-pulse rounded-full" />
                 </div>
              </div>
              <p className="text-[9px] sm:text-[10px] font-black text-slate-300 uppercase text-right tracking-widest">{100 - stats.progress} XP TO LEVEL UP</p>
            </div>
         </div>
      </div>

      {/* ACTIVE QUEST CARDS GRID */}
      <div className="grid gap-4 sm:grid-cols-2">
         {choreList.map((c: any) => {
           const isBoss = c.is_boss === 1;
           const isCoop = c.is_coop === 1;

           return (
             <button 
               key={c.id} 
               onClick={() => completeChore.mutate(c.id)} 
               className={`group p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3.5rem] border-4 text-left shadow-lg hover:shadow-2xl transition-all flex flex-col justify-between min-h-[150px] aspect-auto sm:aspect-video cursor-pointer ${
                 isBoss 
                   ? 'bg-rose-50 border-rose-300 ring-4 ring-rose-500/20 hover:border-rose-500' 
                   : 'bg-white border-slate-50 hover:border-indigo-100'
               }`}
             >
                <div className="flex justify-between items-start gap-4">
                   <div className={`p-4 rounded-3xl group-hover:rotate-12 transition-transform shadow-sm ${isBoss ? 'bg-rose-100 text-rose-600' : 'bg-slate-50 text-slate-800'}`}>
                       <Sword size={32} />
                   </div>
                   <div className="flex flex-col items-end gap-2.5">
                     <div className={`px-5 py-2 rounded-2xl font-black italic shadow-lg ${isBoss ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'}`}>
                       +{isBoss ? c.points * 2 : c.points} XP
                     </div>
                     
                     {/* Game-Style Boss Badge */}
                     {isBoss && (
                       <span className="px-4 py-2 bg-rose-100 text-rose-600 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xl shadow-md border-2 border-rose-200 animate-pulse shrink-0">
                         💀 BOSS (2x Rewards)
                       </span>
                     )}

                     {/* Game-Style Co-Op Badge */}
                     {isCoop && (
                       <span className="px-4 py-2 bg-indigo-100 text-indigo-600 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xl shadow-md border-2 border-indigo-200 shrink-0">
                         👥 CO-OP (+15 XP Synergy)
                       </span>
                     )}
                   </div>
                </div>
                <div className="mt-4">
                  <h4 className="text-2xl sm:text-4xl font-black text-slate-800 leading-none mb-2 uppercase tracking-tighter truncate max-w-full">
                    {c.title}
                  </h4>
                  <p className={`font-bold uppercase text-[10px] tracking-[0.2em] group-hover:translate-x-2 transition-transform ${isBoss ? 'text-rose-500' : 'text-indigo-400'}`}>
                    Begin Quest →
                  </p>
                </div>
             </button>
           );
         })}
      </div>
    </div>
  );
}
