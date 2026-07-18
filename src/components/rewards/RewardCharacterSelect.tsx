import { useQuery } from "@tanstack/react-query";
import { listMembers } from "@/lib/hub-api";
import { getMe } from "@/lib/auth-client";
import { Gem, ShieldCheck } from "lucide-react";

// Offline Avatar Renderer Imports
import { Avatar, parseAvatarConfig } from "@/components/avatar/Avatar";

interface RewardCharacterSelectProps {
  onSelectMember: (member: any) => void;
  onOpenAdmin: () => void;
}

export function RewardCharacterSelect({ onSelectMember, onOpenAdmin }: RewardCharacterSelectProps) {
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
    <div className="flex flex-col items-center justify-center min-h-[75vh] md:min-h-[85vh] p-4 md:p-6 relative animate-in fade-in duration-300">
      
      {/* Admin Reward Customization Entry (Mobile-Optimized Padding) */}
      {isSystemAdmin && (
        <button 
          onClick={onOpenAdmin}
          className="absolute top-4 right-4 bg-indigo-50 border-2 border-indigo-200 text-indigo-600 px-4 py-2.5 sm:px-6 sm:py-3 rounded-2xl font-black text-[10px] sm:text-xs uppercase flex items-center gap-2 shadow-sm hover:bg-indigo-600 hover:text-white transition-all cursor-pointer z-10 active:scale-95"
        >
          <ShieldCheck size={16} /> Customize Shop
        </button>
      )}

      <Gem className="size-10 sm:size-16 text-indigo-500 mb-4 sm:mb-6 animate-pulse" />
      <h1 className="text-2xl sm:text-5xl font-black mb-8 sm:mb-12 uppercase italic tracking-tighter text-slate-900 text-center">Enter Vault</h1>
      
      {/* Responsive cards grid (Optimized for Portrait Mobile & Landscape Tablets) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 max-w-5xl w-full">
        {memberList.map((m: any) => {
          // Resolve active points balance for card view
          const pointsRecord = (Array.isArray(pointsData.data) ? pointsData.data : [])?.find((p: any) => p.member_id === m.id);
          const balance = pointsRecord?.balance || 0;
          const avatarConfig = parseAvatarConfig(m.avatar_config);

          return (
            <button 
              key={m.id} 
              onClick={() => onSelectMember(m)} 
              className="group flex flex-col items-center gap-2 sm:gap-4 cursor-pointer focus:outline-none transition-transform active:scale-95"
            >
              {/* Fluid, High-Fidelity Custom Avatar */}
              <Avatar 
                config={avatarConfig} 
                className="size-28 sm:size-48 rounded-[2rem] sm:rounded-[3rem] shadow-2xl border-4 sm:border-8 border-white transition-all group-hover:scale-105 group-hover:rotate-3" 
              />
              <span className="text-base sm:text-2xl font-black text-slate-800 uppercase tracking-wider text-center truncate max-w-full">{m.name}</span>
              <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{balance} Points</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
