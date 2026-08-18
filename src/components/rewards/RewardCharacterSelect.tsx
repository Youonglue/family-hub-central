// src/components/rewards/RewardCharacterSelect.tsx
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { listMembers } from "@/lib/hub-api";
import { getMe } from "@/lib/auth-client";
import { Gem, ShieldCheck } from "lucide-react";
import { Avatar, parseAvatarConfig } from "@/components/avatar/Avatar";

interface RewardCharacterSelectProps {
  onSelectMember: (member: any) => void;
  onOpenAdmin: () => void;
}

export function RewardCharacterSelect({ onSelectMember, onOpenAdmin }: RewardCharacterSelectProps) {
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const members = useQuery({ queryKey: ["members"], queryFn: listMembers });
  
  const pointsData = useQuery({ 
    queryKey: ["points"], 
    queryFn: () => fetch('/api/chores/points').then(res => res.json()) 
  });

  const isSystemAdmin = me.data?.role?.toLowerCase() === "admin";
  const memberList = Array.isArray(members.data) ? members.data : [];

  // FILTER: Only show heroes configured to be visible in the Reward Shop
  const visibleRewardHeroes = useMemo(() => {
    return memberList.filter((m: any) => m.show_on_rewards !== 0);
  }, [memberList]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] md:min-h-[85vh] p-3 sm:p-6 relative animate-in fade-in duration-300">
      
      {/* Admin Reward Customization Entry */}
      {isSystemAdmin && (
        <button 
          onClick={onOpenAdmin}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-indigo-50 border-2 border-indigo-200 text-indigo-600 px-3.5 py-2 sm:px-6 sm:py-3 rounded-2xl font-black text-[10px] sm:text-xs uppercase flex items-center gap-1.5 sm:gap-2 shadow-sm hover:bg-indigo-600 hover:text-white transition-all cursor-pointer z-10 active:scale-95 min-h-[44px]"
        >
          <ShieldCheck size={16} /> Customize Shop
        </button>
      )}

      <Gem className="size-10 sm:size-16 text-indigo-500 mb-3 sm:mb-6 animate-pulse" />
      <h1 className="text-2xl sm:text-5xl font-black mb-6 sm:mb-12 uppercase italic tracking-tighter text-slate-900 text-center px-2">
        Enter Vault
      </h1>
      
      {/* Responsive cards grid */}
      {visibleRewardHeroes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl p-8 border-2 border-dashed border-slate-200 max-w-md w-full">
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No heroes available for rewards</p>
          <p className="text-xs font-bold text-slate-400 uppercase mt-1">Enable visibility in Settings → Hero Visibility</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 md:gap-8 max-w-5xl w-full px-2">
          {visibleRewardHeroes.map((m: any) => {
            const pointsRecord = (Array.isArray(pointsData.data) ? pointsData.data : [])?.find((p: any) => (p.member_id === m.id || p.id === m.id));
            const balance = pointsRecord?.balance || 0;
            const avatarConfig = parseAvatarConfig(m.avatar_config);

            return (
              <button 
                key={m.id} 
                onClick={() => onSelectMember(m)} 
                className="group flex flex-col items-center gap-2 sm:gap-4 cursor-pointer focus:outline-none transition-transform active:scale-95 select-none"
              >
                <Avatar 
                  config={avatarConfig} 
                  className="size-28 sm:size-36 md:size-48 rounded-3xl sm:rounded-[2.5rem] md:rounded-[3rem] shadow-xl sm:shadow-2xl border-4 sm:border-8 border-white transition-all group-hover:scale-105 group-hover:rotate-2 shrink-0" 
                />
                <span className="text-base sm:text-xl md:text-2xl font-black text-slate-800 uppercase tracking-wider text-center truncate max-w-full px-1">
                  {m.name}
                </span>
                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                  {balance} Points
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
