// src/components/calendar/CalendarHeroFilter.tsx
import React from "react";
import { Users } from "lucide-react";
import { Avatar, parseAvatarConfig } from "@/components/avatar/Avatar";

interface CalendarHeroFilterProps {
  memberList: any[];
  selectedMemberId: string | null;
  onSelectMember: (memberId: string | null) => void;
}

export function CalendarHeroFilter({
  memberList,
  selectedMemberId,
  onSelectMember
}: CalendarHeroFilterProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none max-w-full pr-4">
      {/* "All Family" Filter Pill */}
      <button
        type="button"
        onClick={() => onSelectMember(null)}
        className={`px-3.5 py-2 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap min-h-[44px] shrink-0 active:scale-95 ${
          selectedMemberId === null
            ? "bg-slate-900 text-white shadow-md"
            : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
        }`}
      >
        <div className="size-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
          <Users size={14} />
        </div>
        <span>All Heroes</span>
      </button>

      {/* Hero Avatar Filter Pills */}
      {memberList.map((m: any) => {
        const isSelected = selectedMemberId === m.id;
        const avatarConfig = parseAvatarConfig(m.avatar_config);

        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelectMember(isSelected ? null : m.id)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap min-h-[44px] shrink-0 active:scale-95 ${
              isSelected
                ? "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/40 scale-102"
                : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            <Avatar 
              config={avatarConfig} 
              className="size-6 rounded-lg shadow-sm border border-white shrink-0" 
            />
            <span>{m.name}</span>
          </button>
        );
      })}
    </div>
  );
}
