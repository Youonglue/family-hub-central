import { useQuery } from "@tanstack/react-query";
import { listMembers } from "@/lib/hub-api";
import { getMe } from "@/lib/auth-client";
import { Trophy, ShieldCheck, UserCircle, Flame } from "lucide-react";

// HERO ICON MAP
const ICONS: Record<string, any> = { UserCircle }; // Icons will fallback safely

interface ChoreCharacterSelectProps {
  onSelectMember: (member: any) => void;
  onOpenAdmin: () => void;
}

export function ChoreCharacterSelect({ onSelectMember, onOpenAdmin }: ChoreCharacterSelectProps) {
  // --- QUERY STATES (Cached) ---
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const members = useQuery({ queryKey: ["members"], queryFn: listMembers });
  
  const pointsData = useQuery({ 
    queryKey: ["points"], 
    queryFn: () => fetch('/api/chores/points').then(res => res.json()) 
  });

  const isSystemAdmin = me.data?.role?.toLowerCase() === "admin";
  const memberList = Array.isArray(members.data) ? members.data : [];

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] p-4 md:p-6 relative animate-in fade-in duration-300">
      
      {/* Admin-Only Access Button on Selection Screen */}
      {isSystemAdmin && (
        <button 
          onClick={onOpenAdmin}
          className="absolute top-4 right-4 bg-indigo-50 border-2 border-indigo-200 text-indigo-600 px-4 py-2.5 sm:px-6 sm:py-3 rounded-2xl font-black text-[10px] sm:text-xs uppercase flex items-center gap-2 shadow-sm hover:bg-indigo-600 hover:text-white transition-all cursor-pointer z-10"
        >
          <ShieldCheck size={16} /> Manage Library
        </button>
      )}

      <Trophy className="size-12 sm:size-16 text-yellow-500 mb-4 sm:mb-6 animate-bounce" />
      <h1 className="text-3xl sm:text-5xl font-black mb-8 sm:mb-12 uppercase italic tracking-tighter text-slate-900 text-center">Choose Your Hero</h1>
      
      {/* Responsive character cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 max-w-5xl w-full">
        {memberList.map((m: any) => {
          const HeroIcon = ICONS[m.avatar_icon] || UserCircle;
          
          // Fetch active consecutive-day streaks from leaderboard query cache
          const rosterMember = (Array.isArray(pointsData.data) ? pointsData.data : [])?.find((p: any) => p.member_id === m.id);
          const streak = rosterMember?.streak_count || 0;

          return (
            <button 
              key={m.id} 
              onClick={() => onSelectMember(m)} 
              className="group flex flex-col items-center gap-3 sm:gap-4 cursor-pointer focus:outline-none"
            >
              <div className="size-32 sm:size-48 rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl border-4 sm:border-8 border-white transition-all group-hover:scale-105 group-hover:rotate-3 flex items-center justify-center text-white" style={{ backgroundColor: m.avatar_color }}>
                <HeroIcon className="size-16 sm:size-20" />
              </div>
              <span className="text-lg sm:text-2xl font-black text-slate-800 uppercase tracking-widest text-center truncate max-w-full">{m.name}</span>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>Level {m.level || 1}</span>
                {streak > 0 && (
                  <span className="text-orange-500 font-bold flex items-center gap-0.5 bg-orange-50 px-1.5 py-0.5 rounded-full shadow-inner animate-pulse shrink-0">
                    <Flame className="size-2.5 shrink-0" /> {streak}d
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
