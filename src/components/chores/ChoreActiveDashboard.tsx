// src/components/chores/ChoreActiveDashboard.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck, Flame, Sword, Users, Star, Sparkles } from "lucide-react";
import { Avatar, parseAvatarConfig } from "@/components/avatar/Avatar";

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

  // DEFAULT: "mine" shows only this hero's assigned tasks (Co-Op separated into its own filter!)
  const [activeTab, setActiveTab] = useState<"mine" | "coop" | "all">("mine");

  const chores = useQuery({ 
    queryKey: ["chores", activeMember?.id], 
    queryFn: () => fetch(`/api/chores?memberId=${activeMember.id}`).then(res => res.json()) 
  });
  
  const pointsData = useQuery({ 
    queryKey: ["points"], 
    queryFn: () => fetch('/api/chores/points').then(res => res.json()) 
  });

  const memberRecord = useMemo(() => {
    const list = Array.isArray(pointsData.data) ? pointsData.data : [];
    return list.find((p: any) => (p.member_id === activeMember.id || p.id === activeMember.id)) || activeMember;
  }, [pointsData.data, activeMember]);

  const avatarConfig = useMemo(() => {
    return parseAvatarConfig(memberRecord?.avatar_config);
  }, [memberRecord]);

  const stats = useMemo(() => {
    if (!memberRecord) return { balance: 0, level: 1, progress: 0, xp: 0, streak_count: 0 };
    return { 
      balance: memberRecord.balance || 0, 
      level: memberRecord.level || 1, 
      xp: memberRecord.xp || 0,
      streak_count: memberRecord.streak_count || 0,
      progress: (memberRecord.xp || 0) % 100
    };
  }, [memberRecord]);

  const completeChore = useMutation({
    mutationFn: (id: string) => fetch(`/api/chores/${id}/complete`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ member_id: activeMember.id }) 
    }).then(res => res.json()),
    onSuccess: () => { 
        toast.success("Quest Submitted! Waiting for parent approval. ⭐"); 
        qc.invalidateQueries({ queryKey: ["pending-approvals"] }); 
    }
  });

  const rawChoreList = Array.isArray(chores.data) ? chores.data : [];

  // FILTER LOGIC: Default to personal chores only, with separate Co-Op view!
  const filteredChores = useMemo(() => {
    if (activeTab === "mine") {
      // Personal assigned chores only (not Co-Op)
      return rawChoreList.filter((c: any) => c.is_coop !== 1);
    }
    if (activeTab === "coop") {
      // Co-Op quests only
      return rawChoreList.filter((c: any) => c.is_coop === 1);
    }
    // All
    return rawChoreList;
  }, [rawChoreList, activeTab]);

  const personalCount = rawChoreList.filter((c: any) => c.is_coop !== 1).length;
  const coopCount = rawChoreList.filter((c: any) => c.is_coop === 1).length;

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 animate-in slide-in-from-bottom-5 duration-300 safe-area-inset-bottom">
      
      {/* TOP KIOSK HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-sm border-2 sm:border-4 border-slate-50">
        <button 
          onClick={onBack} 
          className="flex items-center justify-center sm:justify-start gap-2 font-black text-slate-400 hover:text-slate-900 transition-colors uppercase text-xs tracking-widest py-2 cursor-pointer min-h-[44px]"
        >
          <ArrowLeft size={16} /> Character Select
        </button>
        
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <p className="font-black uppercase italic text-slate-800 tracking-tight text-sm sm:text-base truncate max-w-[180px] sm:max-w-xs">
            {activeMember.name}
          </p>
          {canAccessAdmin && (
            <button 
              onClick={() => setIsAdminView(!isAdminView)} 
              className={`px-4 py-2.5 sm:px-6 sm:py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all w-full sm:w-auto cursor-pointer min-h-[44px] shrink-0 active:scale-95 ${
                isAdminView ? 'bg-slate-900 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
              }`}
            >
              <ShieldCheck size={18} /> {isAdminView ? "Exit Mastery" : "Admin Panel"}
            </button>
          )}
        </div>
      </div>

      {/* HERO CHARACTER DETAILS PANEL */}
      <div className="bg-white p-4 sm:p-6 md:p-8 lg:p-10 rounded-3xl sm:rounded-[3.5rem] shadow-xl border-2 sm:border-4 border-slate-50 flex flex-col md:flex-row items-center gap-4 sm:gap-6 md:gap-8 relative overflow-hidden">
         
         <div className="relative shrink-0">
           <Avatar 
             config={avatarConfig} 
             className="size-20 sm:size-32 md:size-36 lg:size-40 rounded-2xl sm:rounded-[2.5rem] border-4 sm:border-8 border-white shadow-xl" 
           />
           <span className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 bg-slate-900 text-white border-2 border-white text-xs sm:text-sm font-black size-7 sm:size-9 lg:size-10 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg select-none">
             {stats.level}
           </span>
         </div>

         <div className="flex-1 w-full min-w-0 space-y-2.5 sm:space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h2 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight uppercase italic text-slate-900 truncate max-w-full text-center sm:text-left">
                {activeMember.name}
              </h2>
              <div className="flex items-center justify-center gap-2 flex-wrap shrink-0">
                {stats.streak_count > 0 && (
                  <div className="bg-orange-500 text-white px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-black flex items-center gap-1 shadow-md animate-bounce">
                    <Flame className="size-3.5 sm:size-4" /> {stats.streak_count}d Streak
                  </div>
                )}
                <div className="bg-slate-900 text-white px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-black flex items-center justify-center gap-1 shadow-md select-none">
                  HERO STATUS
                </div>
              </div>
            </div>
            
            <div className="space-y-1 sm:space-y-1.5 relative z-10">
              <div className="flex justify-between text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400">
                <span>Level {stats.level}</span>
                <span className="text-slate-800 font-bold">{stats.balance} Total Points</span>
              </div>
              
              <div className="h-5 sm:h-7 w-full bg-slate-100 rounded-full p-1 shadow-inner border border-slate-200/60">
                 <div 
                   className="h-full rounded-full transition-all duration-1000 shadow-md relative" 
                   style={{ width: `${stats.progress}%`, backgroundColor: memberRecord.avatar_color || '#6366f1' }}
                 >
                    <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
                 </div>
              </div>
              <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase text-right tracking-widest">
                {100 - stats.progress} XP TO LEVEL UP
              </p>
            </div>
         </div>
      </div>

      {/* CO-OP SEPARATION FILTER BAR */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none select-none">
        {/* Default: Personal Quests Only */}
        <button
          type="button"
          onClick={() => setActiveTab("mine")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 min-h-[42px] ${
            activeTab === "mine"
              ? "bg-slate-900 text-white shadow-md scale-105"
              : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Star size={13} className="text-yellow-400 fill-yellow-400" /> My Quests ({personalCount})
        </button>

        {/* Co-Op Quests Toggle */}
        <button
          type="button"
          onClick={() => setActiveTab("coop")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 min-h-[42px] ${
            activeTab === "coop"
              ? "bg-indigo-600 text-white shadow-md scale-105"
              : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Users size={13} /> 👥 Co-Op Quests ({coopCount})
        </button>

        {/* View All */}
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 min-h-[42px] ${
            activeTab === "all"
              ? "bg-slate-900 text-white shadow-md scale-105"
              : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Sparkles size={13} /> All ({rawChoreList.length})
        </button>
      </div>

      {/* ACTIVE QUEST CARDS GRID */}
      <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2">
         {filteredChores.length === 0 && (
           <div className="col-span-full py-12 bg-white rounded-3xl border-2 border-dashed border-slate-100 text-center p-6">
             <p className="font-black uppercase tracking-wider text-slate-400 text-xs sm:text-sm">
               {activeTab === "coop" 
                 ? "No active Co-Op quests right now. Check back soon!" 
                 : `All personal quests complete for ${activeMember.name}! Great job, hero. 🌟`}
             </p>
           </div>
         )}

         {filteredChores.map((c: any) => {
           const isBoss = c.is_boss === 1;
           const isCoop = c.is_coop === 1;

           const basePts = c.points || 0;
           const baseXp = c.xp !== null && c.xp !== undefined ? c.xp : basePts;

           // Boss: 3x Points & 1x XP; Co-Op: 2x Points & 2x XP
           const displayPts = isBoss ? basePts * 3 : isCoop ? basePts * 2 : basePts;
           const displayXp = isBoss ? baseXp : isCoop ? baseXp * 2 : baseXp;

           return (
             <button 
               key={c.id} 
               onClick={() => completeChore.mutate(c.id)} 
               className={`group p-4 sm:p-6 lg:p-7 rounded-2xl sm:rounded-3xl lg:rounded-[3rem] border-2 sm:border-4 text-left shadow-md hover:shadow-xl transition-all flex flex-col justify-between min-h-[170px] sm:min-h-[190px] h-auto cursor-pointer select-none active:scale-[0.98] min-w-0 ${
                 isBoss 
                   ? 'bg-rose-50 border-rose-300 ring-2 sm:ring-4 ring-rose-500/10 hover:border-rose-500' 
                   : isCoop 
                   ? 'bg-indigo-50/50 border-indigo-200 ring-2 sm:ring-4 ring-indigo-500/10 hover:border-indigo-400' 
                   : 'bg-white border-slate-50 hover:border-indigo-100'
               }`}
             >
                {/* Card Header Row */}
                <div className="flex justify-between items-start gap-2.5 sm:gap-3 w-full">
                   <div className={`p-2.5 sm:p-3.5 rounded-2xl group-hover:rotate-6 transition-transform shadow-sm shrink-0 ${
                     isBoss ? 'bg-rose-100 text-rose-600' : isCoop ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-50 text-slate-800'
                   }`}>
                       <Sword size={22} className="sm:size-[26px]" />
                   </div>
                   
                   <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                     <div className={`px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-xl sm:rounded-2xl font-black text-[11px] sm:text-xs md:text-sm italic shadow-xs whitespace-nowrap ${
                       isBoss ? 'bg-rose-600 text-white' : isCoop ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-white'
                     }`}>
                       +{displayPts} PTS • +{displayXp} XP
                     </div>
                     
                     {/* Multiplier Badges */}
                     {isBoss && (
                       <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[8px] sm:text-[9px] font-black uppercase tracking-wider rounded-lg border border-rose-300 animate-pulse whitespace-nowrap">
                         💀 BOSS 3x
                       </span>
                     )}

                     {isCoop && (
                       <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[8px] sm:text-[9px] font-black uppercase tracking-wider rounded-lg border border-indigo-300 whitespace-nowrap">
                         👥 CO-OP 2x
                       </span>
                     )}
                   </div>
                </div>

                {/* Card Title & Call to Action */}
                <div className="mt-3 sm:mt-4 w-full min-w-0 flex-1 flex flex-col justify-end">
                  <h4 className="text-base sm:text-lg md:text-xl font-black text-slate-800 leading-snug mb-1 uppercase tracking-tight break-words line-clamp-2">
                    {c.title}
                  </h4>
                  <p className={`font-black uppercase text-[9px] sm:text-[10px] tracking-wider group-hover:translate-x-1.5 transition-transform mt-1 shrink-0 ${
                    isBoss ? 'text-rose-600' : isCoop ? 'text-indigo-600' : 'text-indigo-500'
                  }`}>
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
