// src/components/calendar/WeekView.tsx
import React from "react";
import { Clock } from "lucide-react";
import { Avatar, parseAvatarConfig } from "@/components/avatar/Avatar";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDaysL = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d: Date) => { const s = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const dow = (s.getDay() + 6) % 7; return addDaysL(s, -dow); };

export function WeekView({ anchor, byDay, onPickDay, onSelectDate, memberList }: any) {
  const start = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDaysL(start, i));

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-3 sm:gap-4">
      {days.map(d => {
        const key = ymd(d);
        const evs = byDay.get(key) ?? [];
        const isToday = key === ymd(new Date());

        return (
          <div 
            key={key} 
            className={`bg-white rounded-3xl sm:rounded-[2.5rem] border-2 sm:border-4 p-4 sm:p-5 min-h-[140px] md:min-h-[380px] shadow-md cursor-pointer hover:border-indigo-200 transition-all select-none ${
              isToday ? 'border-slate-900 bg-slate-50/50 shadow-lg' : 'border-slate-50'
            }`} 
            onClick={() => { onPickDay(d); onSelectDate(d); }}
          >
             <div className="flex items-center justify-between mb-3 md:mb-6">
               <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                 {d.toLocaleDateString(undefined, { weekday: "short" })}
               </span>
               <p className={`text-2xl sm:text-3xl font-black ${isToday ? 'text-indigo-600' : 'text-slate-900'}`}>
                 {d.getDate()}
               </p>
             </div>

             <div className="space-y-2">
               {evs.map((e: any) => {
                 const assignedHero = memberList.find((m: any) => m.id === e.member_id);
                 const avatarConfig = parseAvatarConfig(assignedHero?.avatar_config);

                 return (
                   <div 
                      key={e.id} 
                      className="p-3 rounded-2xl bg-slate-50 border-l-4 shadow-xs flex flex-col gap-0.5" 
                      style={{ borderLeftColor: e.color || '#6366f1' }}
                   >
                      <div className="flex items-center justify-between gap-1.5">
                        <p className="font-black text-xs sm:text-sm leading-tight text-slate-900 flex-1 truncate">
                            {e.title}
                        </p>
                        {assignedHero && (
                          <Avatar config={avatarConfig} className="size-4 rounded-md shrink-0 shadow-xs" />
                        )}
                      </div>
                      {e.time_from && (
                        <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                          <Clock size={8} /> {e.time_from} {e.time_to ? ` - ${e.time_to}` : ""}
                        </div>
                      )}
                   </div>
                 );
               })}
             </div>
          </div>
        );
      })}
    </div>
  );
}
