// src/components/kiosk/KioskHeroSelect.tsx
import React from "react";
import { Trophy, ShieldCheck } from "lucide-react";
import { Avatar, parseAvatarConfig } from "@/components/avatar/Avatar";

interface KioskHeroSelectProps {
  heroes: any[];
  onSelectHero: (hero: any) => void;
  onOpenAdmin: () => void;
}

export function KioskHeroSelect({ heroes, onSelectHero, onOpenAdmin }: KioskHeroSelectProps) {
  return (
    <div className="fixed inset-0 z-[9998] bg-slate-900 flex flex-col items-center justify-start p-4 sm:p-6 overflow-y-auto scrollbar-thin py-12 sm:py-16">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-500 rounded-full blur-[120px]" />
      </div>

      <button 
        onClick={onOpenAdmin}
        className="absolute top-4 right-4 bg-white/10 border border-white/20 hover:bg-white/20 text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all z-50 min-h-[44px]"
      >
        <ShieldCheck size={16} /> Admin Login
      </button>

      <div className="relative text-center max-w-5xl w-full space-y-6 sm:space-y-10 animate-in zoom-in-95 duration-500 my-auto">
        <Trophy className="size-12 sm:size-16 md:size-20 text-yellow-500 mb-2 animate-bounce mx-auto" />
        <h1 className="text-3xl sm:text-5xl md:text-7xl font-black uppercase italic tracking-tighter text-white px-2">
          Which Hero Are You?
        </h1>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 md:gap-8 w-full max-w-4xl mx-auto px-2">
          {heroes.map((m: any) => {
            const avatarConfig = parseAvatarConfig(m.avatar_config);
            return (
              <button 
                key={m.id} 
                onClick={() => onSelectHero(m)} 
                className="group flex flex-col items-center gap-2 sm:gap-3 cursor-pointer focus:outline-none active:scale-95 transition-transform select-none"
              >
                <Avatar 
                  config={avatarConfig} 
                  className="size-24 sm:size-36 md:size-44 rounded-3xl sm:rounded-[2.5rem] md:rounded-[3rem] shadow-2xl border-4 sm:border-8 md:border-[10px] border-white/15 transition-all group-hover:scale-105 group-hover:rotate-2 shrink-0" 
                />
                <span className="text-base sm:text-xl md:text-2xl font-black text-white uppercase tracking-wider leading-none mt-1 truncate max-w-full px-1">
                  {m.name}
                </span>
                <p className="text-[8px] sm:text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">
                  Level {m.level || 1}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
