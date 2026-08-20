// src/components/calendar/CalendarLegendKey.tsx
import React from "react";
import { Layers, Calendar } from "lucide-react";
import { Avatar, parseAvatarConfig } from "@/components/avatar/Avatar";

interface RoutineItem {
  title: string;
  color: string;
  category: string;
  memberId?: string;
}

interface CalendarLegendKeyProps {
  recurringRoutines: RoutineItem[];
  memberList: any[];
}

export function CalendarLegendKey({ recurringRoutines, memberList }: CalendarLegendKeyProps) {
  if (!recurringRoutines || recurringRoutines.length === 0) {
    return (
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border-2 sm:border-4 border-slate-50 shadow-sm flex items-center justify-between gap-3 text-slate-400">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
          <Layers size={16} className="text-indigo-600" />
          <span>Routine Legend Key:</span>
          <span className="text-[10px] text-slate-400 font-normal">No active recurring tinted shifts</span>
        </div>
        <span className="text-[9px] font-bold uppercase text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl">
          💡 Tint days in New Quest
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 sm:border-4 border-slate-50 shadow-sm space-y-2.5 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
          <Layers size={14} className="text-indigo-600" /> Active Recurring Shifts & Routines (Tinted Days):
        </span>
        <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider hidden sm:inline bg-indigo-50 px-2 py-0.5 rounded-lg">
          {recurringRoutines.length} Active {recurringRoutines.length === 1 ? "Routine" : "Routines"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 pt-0.5">
        {recurringRoutines.map((item, index) => {
          const hero = memberList.find(m => m.id === item.memberId);
          const avatarConfig = parseAvatarConfig(hero?.avatar_config);

          return (
            <div
              key={`${item.title}-${index}`}
              className="px-3 py-1.5 rounded-xl border flex items-center gap-2 shadow-xs transition-all"
              style={{
                backgroundColor: item.color ? `${item.color}20` : "#e0e7ff",
                borderColor: item.color || "#6366f1"
              }}
            >
              <span
                className="size-3 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: item.color || "#6366f1" }}
              />
              <span className="text-[10px] font-black uppercase text-slate-900 tracking-tight">
                {item.title}
              </span>

              {hero && (
                <div className="flex items-center gap-1 bg-white/90 px-1.5 py-0.5 rounded-md border border-slate-200/60 shadow-xs">
                  <Avatar config={avatarConfig} className="size-3.5 rounded-full" />
                  <span className="text-[8px] font-bold uppercase text-slate-700">{hero.name}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
