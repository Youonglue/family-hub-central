// src/components/kiosk/PortraitHeroSwitcher.tsx
import React from "react";
import { ChevronDown, UserCircle } from "lucide-react";
import { Avatar, parseAvatarConfig } from "@/components/avatar/Avatar";

interface PortraitHeroSwitcherProps {
  kioskMember: any;
  onOpenDrawer: () => void;
}

export function PortraitHeroSwitcher({
  kioskMember,
  onOpenDrawer
}: PortraitHeroSwitcherProps) {
  return (
    <div className="flex items-center gap-2">
      {kioskMember ? (
        <button
          type="button"
          onClick={onOpenDrawer}
          className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 active:scale-95 border border-slate-200 px-3 py-1.5 rounded-2xl cursor-pointer transition-all min-h-[40px] shadow-xs"
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
          type="button"
          onClick={onOpenDrawer}
          className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-600 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-wider cursor-pointer active:scale-95 min-h-[40px]"
        >
          <UserCircle size={16} /> Select Hero
        </button>
      )}
    </div>
  );
}
