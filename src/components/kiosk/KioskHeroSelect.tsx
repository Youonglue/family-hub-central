// src/components/kiosk/KioskHeroSelect.tsx
import React from "react";
import { Trophy, ShieldCheck, X } from "lucide-react";
import { Avatar, parseAvatarConfig } from "@/components/avatar/Avatar";

interface KioskHeroSelectProps {
  heroes: any[];
  onSelectHero: (hero: any) => void;
  onOpenAdmin: () => void;
  onClose?: () => void;
}

export function KioskHeroSelect({ 
  heroes = [], 
  onSelectHero, 
  onOpenAdmin,
  onClose
}: KioskHeroSelectProps) {
  const safeHeroes = Array.isArray(heroes) ? heroes : [];

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 overflow-y-auto pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)] select-none">
      
      {/* Ambient Animated Nebula Glows */}
      <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] bg-indigo-600 rounded-full blur-[140px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[50vw] h-[50vw] bg-rose-600 rounded-full blur-[140px]" />
      </div>

      {/* TOP HEADER: Dynamic Island / Notch Safe Action Bar */}
      <header className="relative z-20 flex items-center justify-between gap-3 bg-slate-900/80 backdrop-blur-xl px-4 py-3 rounded-2xl sm:rounded-3xl border border-white/10 shadow-xl shrink-0 w-full max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md">
            H
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-slate-300">
            Select Profile
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={onOpenAdmin}
            className="bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 text-white px-3.5 sm:px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all min-h-[40px]"
          >
            <ShieldCheck size={16} /> Admin Login
          </button>

          {onClose && (
            <button 
              type="button"
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-rose-500 hover:text-white rounded-xl transition-all cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-300 active:scale-95"
              title="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </header>

      {/* CENTER: RESPONSIVE CHARACTER GRID */}
      <main className="relative z-10 my-auto py-6 w-full max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
        <div>
          <Trophy className="size-12 sm:size-16 text-yellow-400 mb-2 animate-bounce mx-auto" />
          <h1 className="text-3xl sm:text-5xl font-black uppercase italic tracking-tight text-white">
            Which Hero Are You?
          </h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
            Tap your avatar to start your adventure
          </p>
        </div>

        {safeHeroes.length === 0 ? (
          <div className="py-12 bg-slate-900/60 rounded-3xl border border-dashed border-slate-800 p-8 max-w-md mx-auto">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No family heroes found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-6 px-2">
            {safeHeroes.map((m: any) => {
              const avatarConfig = parseAvatarConfig(m.avatar_config);

              return (
                <button 
                  key={m.id} 
                  type="button"
                  onClick={() => onSelectHero(m)} 
                  className="group p-4 bg-slate-900/80 hover:bg-slate-800/90 border-2 border-white/10 hover:border-indigo-400/80 rounded-3xl sm:rounded-[2.5rem] flex flex-col items-center gap-3 transition-all cursor-pointer focus:outline-none active:scale-95 shadow-xl hover:shadow-indigo-500/20"
                >
                  <Avatar 
                    config={avatarConfig} 
                    className="size-24 sm:size-32 rounded-2xl sm:rounded-[2rem] shadow-xl border-2 sm:border-4 border-white/20 transition-all group-hover:scale-105 group-hover:rotate-2 shrink-0" 
                  />
                  <div className="min-w-0 w-full text-center">
                    <span className="text-base sm:text-xl font-black text-white uppercase tracking-wider leading-tight block truncate">
                      {m.name}
                    </span>
                    <p className="text-[9px] sm:text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">
                      Level {m.level || 1}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

    </div>
  );
}
