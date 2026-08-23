// src/components/kiosk/PortraitHeroSwitcher.tsx
import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, UserCircle, X, ShieldCheck, LogOut } from "lucide-react";
import { Avatar, parseAvatarConfig } from "@/components/avatar/Avatar";

interface PortraitHeroSwitcherProps {
  kioskMember: any;
  visibleHeroes: any[];
  onSelectHero: (hero: any) => void;
  onOpenAdmin: () => void;
  onSignOut: () => void;
}

export function PortraitHeroSwitcher({
  kioskMember,
  visibleHeroes,
  onSelectHero,
  onOpenAdmin,
  onSignOut
}: PortraitHeroSwitcherProps) {
  const [showDrawer, setShowDrawer] = useState(false);

  return (
    <>
      {/* Sticky Top-Bar Pill on Mobile / Portrait Devices */}
      <div className="flex items-center gap-2">
        {kioskMember ? (
          <button
            onClick={() => setShowDrawer(true)}
            className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl cursor-pointer active:scale-95 transition-all min-h-[40px] shadow-xs"
          >
            <Avatar 
              config={parseAvatarConfig(kioskMember.avatar_config)} 
              className="size-7 rounded-lg shadow-xs shrink-0" 
            />
            <div className="text-left">
              <span className="text-xs font-black uppercase text-slate-800 leading-none block truncate max-w-[85px]">
                {kioskMember.name}
              </span>
              <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest leading-none block mt-0.5">
                Lv.{kioskMember.level || 1}
              </span>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>
        ) : (
          <button
            onClick={() => setShowDrawer(true)}
            className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-600 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-wider cursor-pointer active:scale-95 min-h-[40px]"
          >
            <UserCircle size={16} /> Select Hero
          </button>
        )}
      </div>

      {/* Slide-Up Hero Switcher Drawer (Elevated to z-[9999] so nothing can block it) */}
      {showDrawer && (
        <div 
          className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200" 
          onClick={() => setShowDrawer(false)}
        >
          <div 
            className="bg-white w-full sm:max-w-lg rounded-t-[2.5rem] sm:rounded-[3rem] p-6 sm:p-8 shadow-2xl border-t-4 sm:border-4 border-slate-100 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-6 duration-200 flex flex-col pb-28 sm:pb-8" 
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-2xl font-black uppercase italic tracking-tight text-slate-900">Switch Hero</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tap your avatar to switch profile</p>
              </div>
              <button 
                onClick={() => setShowDrawer(false)}
                className="p-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-full transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            {/* Heroes Grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 flex-1 overflow-y-auto pr-1 scrollbar-thin">
              {visibleHeroes.map((m: any) => {
                const isCurrent = kioskMember?.id === m.id;
                const avatarConfig = parseAvatarConfig(m.avatar_config);

                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      onSelectHero(m);
                      setShowDrawer(false);
                    }}
                    className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-2.5 transition-all cursor-pointer active:scale-95 ${
                      isCurrent 
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20' 
                        : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <Avatar 
                      config={avatarConfig} 
                      className="size-16 rounded-2xl shadow-sm border-2 border-white" 
                    />
                    <span className="text-sm font-black uppercase text-slate-800 truncate max-w-full">{m.name}</span>
                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Level {m.level || 1}</span>
                  </button>
                );
              })}
            </div>

            {/* Action Buttons: Positioned comfortably above the bottom navigation bar */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 shrink-0 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowDrawer(false);
                  onOpenAdmin();
                }}
                className="w-full sm:flex-1 py-4 bg-slate-900 hover:bg-indigo-600 active:scale-95 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer min-h-[48px] transition-all"
              >
                <ShieldCheck size={18} /> Admin Login
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowDrawer(false);
                  onSignOut();
                }}
                className="w-full sm:w-auto px-6 py-4 bg-rose-50 hover:bg-rose-100 text-rose-600 active:scale-95 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 border border-rose-200 cursor-pointer min-h-[48px] transition-all"
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
