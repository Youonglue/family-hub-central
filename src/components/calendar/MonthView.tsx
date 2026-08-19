// src/components/calendar/MonthView.tsx
import React from "react";
import { Sword } from "lucide-react";
import { Avatar, parseAvatarConfig } from "@/components/avatar/Avatar";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDaysL = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d: Date) => { const s = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const dow = (s.getDay() + 6) % 7; return addDaysL(s, -dow); };
const startOfMonthGrid = (d: Date) => startOfWeek(new Date(d.getFullYear(), d.getMonth(), 1));

export function MonthView({ anchor, byDay, onPickDay, onToggleDate, onSelectDate, selectedDates, memberList }: any) {
  const gridStart = startOfMonthGrid(anchor);
  const days = Array.from({ length: 42 }, (_, i) => addDaysL(gridStart, i));

  return (
    <div className="bg-white rounded-3xl sm:rounded-[3rem] border-2 sm:border-4 border-slate-50 p-2 md:p-6 shadow-xl">
      <div className="grid grid-cols-7 gap-1 md:gap-3">
        {days.map(d => {
          const key = ymd(d);
          const evs = byDay.get(key) ?? [];
          const isSelected = selectedDates.includes(key);
          const isToday = key === ymd(new Date());

          return (
            <div
              key={key}
              onClick={() => {
                onToggleDate(key);
                onSelectDate(d);
              }}
              className={`min-h-[85px] sm:min-h-[105px] md:min-h-[135px] p-1.5 sm:p-2.5 rounded-2xl md:rounded-[2rem] border-2 md:border-4 transition-all cursor-pointer flex flex-col select-none ${
                isSelected ? "border-indigo-500 bg-indigo-50 scale-95 shadow-inner" : 
                isToday ? "border-slate-900 bg-slate-50 shadow-sm" : "border-slate-50 bg-white hover:border-slate-200"
              } ${d.getMonth() !== anchor.getMonth() ? "opacity-25" : ""}`}
            >
              <div className="flex justify-between items-center mb-1 shrink-0">
                <span 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    onPickDay(d); 
                    onSelectDate(d); 
                  }} 
                  className={`text-[10px] sm:text-xs md:text-sm font-black px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg sm:rounded-xl transition-all ${
                    isToday ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {d.getDate()}
                </span>
                
                {evs.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPickDay(d);
                      onSelectDate(d);
                    }}
                    className="p-1 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 hover:bg-indigo-100 cursor-pointer shrink-0 flex items-center justify-center min-h-[24px] min-w-[24px]"
                    title="View Daily Quests"
                  >
                    <Sword size={11} />
                  </button>
                )}
              </div>

              <div className="space-y-0.5 sm:space-y-1 flex-1 overflow-hidden">
                {evs.slice(0, 3).map((e: any) => {
                  const assignedHero = memberList.find((m: any) => m.id === e.member_id);
                  const avatarConfig = parseAvatarConfig(assignedHero?.avatar_config);

                  return (
                    <div 
                      key={e.id} 
                      className="text-[7px] sm:text-[8px] md:text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs text-slate-900 truncate flex items-center justify-between gap-1" 
                      style={{ 
                        backgroundColor: e.color || '#6366f1',
                        textShadow: '0px 0px 3px rgba(255,255,255,1)' 
                      }}
                    >
                      <span className="truncate">
                        {e.time_from ? `[${e.time_from}] ` : ""}{e.title}
                      </span>
                      {assignedHero && (
                        <Avatar config={avatarConfig} className="size-2.5 rounded-full shrink-0" />
                      )}
                    </div>
                  );
                })}
                {evs.length > 3 && <p className="text-[7px] font-black text-slate-400">+{evs.length - 3} more</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
