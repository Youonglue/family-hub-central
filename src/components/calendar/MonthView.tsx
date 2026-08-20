// src/components/calendar/MonthView.tsx
import React from "react";
import { Sword } from "lucide-react";
import { Avatar, parseAvatarConfig } from "@/components/avatar/Avatar";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDaysL = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d: Date) => { const s = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const dow = (s.getDay() + 6) % 7; return addDaysL(s, -dow); };
const startOfMonthGrid = (d: Date) => startOfWeek(new Date(d.getFullYear(), d.getMonth(), 1));

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function resolveTileColor(colorStr?: string): { background: string; border: string } {
  if (!colorStr) return { background: "transparent", border: "transparent" };

  const namedMap: Record<string, string> = {
    sky: "#0284c7",
    rose: "#e11d48",
    amber: "#d97706",
    emerald: "#059669",
    violet: "#7c3aed",
    indigo: "#4f46e5",
    orange: "#ea580c",
    teal: "#0d9488",
    pink: "#ec4899",
    cyan: "#06b6d4"
  };

  const rawHex = colorStr.startsWith("#") 
    ? colorStr 
    : namedMap[colorStr.toLowerCase()] || colorStr.replace(/var\(--kid-(.*?)\)/, (_, p) => namedMap[p] || "#6366f1");

  const validHex = rawHex.startsWith("#") ? rawHex : "#4f46e5";

  return {
    background: `${validHex}25`,
    border: `${validHex}90`
  };
}

export function MonthView({ 
  anchor, 
  byDay, 
  onPickDay, 
  onToggleDate, 
  onSelectDate, 
  selectedDates, 
  memberList,
  selectedHeroId
}: any) {
  const gridStart = startOfMonthGrid(anchor);
  const days = Array.from({ length: 42 }, (_, i) => addDaysL(gridStart, i));

  return (
    <div className="bg-white rounded-3xl sm:rounded-[2.5rem] border-2 sm:border-4 border-slate-50 p-3 sm:p-5 shadow-xl space-y-2">
      
      {/* Weekday Header Row */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 pb-1">
        {WEEKDAYS.map(w => (
          <span key={w}>{w}</span>
        ))}
      </div>

      {/* 7x6 Calendar Grid (Locked Proportional Heights to Stop Desktop Stretching) */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map(d => {
          const key = ymd(d);
          const evs = byDay.get(key) ?? [];
          const isSelected = selectedDates.includes(key);
          const isToday = key === ymd(new Date());

          const tintedEvent = evs.find((e: any) => e.tile_color || e.is_recurring === 1);
          const tileStyles = tintedEvent ? resolveTileColor(tintedEvent.tile_color || tintedEvent.color) : null;
          const nonTintedEvents = evs.filter((e: any) => !e.tile_color && e.is_recurring !== 1);

          const hasHeroActivity = evs.length > 0;
          const isHeroFocusFaded = selectedHeroId && !hasHeroActivity;

          return (
            <div
              key={key}
              onClick={() => {
                onToggleDate(key);
                onSelectDate(d);
              }}
              style={{
                backgroundColor: isSelected 
                  ? "#eef2ff" 
                  : tileStyles 
                  ? tileStyles.background 
                  : undefined,
                borderColor: isSelected
                  ? "#6366f1"
                  : tileStyles
                  ? tileStyles.border
                  : undefined
              }}
              className={`h-20 sm:h-24 md:h-28 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer flex flex-col select-none relative overflow-hidden ${
                isSelected 
                  ? "scale-95 shadow-inner" 
                  : isToday 
                  ? "border-slate-900 bg-slate-50 shadow-xs" 
                  : !tileStyles 
                  ? "border-slate-100/80 bg-white hover:border-slate-300" 
                  : "shadow-xs"
              } ${d.getMonth() !== anchor.getMonth() ? "opacity-20" : ""} ${isHeroFocusFaded ? "opacity-20 grayscale" : ""}`}
            >
              <div className="flex justify-between items-center mb-0.5 shrink-0">
                <span 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    onPickDay(d); 
                    onSelectDate(d); 
                  }} 
                  className={`text-[9px] sm:text-xs font-black px-1.5 py-0.5 rounded-md sm:rounded-lg transition-all ${
                    isToday ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
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
                    className="p-1 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 cursor-pointer shrink-0 flex items-center justify-center min-h-[20px] min-w-[20px]"
                    title="View Day Details"
                  >
                    <Sword size={10} />
                  </button>
                )}
              </div>

              {/* Day Badges */}
              <div className="space-y-0.5 flex-1 overflow-hidden">
                {nonTintedEvents.slice(0, 2).map((e: any) => {
                  const assignedHero = memberList.find((m: any) => m.id === e.member_id);
                  const avatarConfig = parseAvatarConfig(assignedHero?.avatar_config);

                  return (
                    <div 
                      key={e.id} 
                      className="text-[7px] sm:text-[8px] font-black px-1 py-0.5 rounded shadow-2xs text-slate-900 truncate flex items-center justify-between gap-0.5" 
                      style={{ 
                        backgroundColor: e.color || '#6366f1',
                        textShadow: '0px 0px 3px rgba(255,255,255,1)' 
                      }}
                    >
                      <span className="truncate">
                        {e.time_from ? `${e.time_from} ` : ""}{e.title}
                      </span>
                      {assignedHero && (
                        <Avatar config={avatarConfig} className="size-2 rounded-full shrink-0" />
                      )}
                    </div>
                  );
                })}
                {nonTintedEvents.length > 2 && (
                  <p className="text-[7px] font-black text-slate-500 leading-none">
                    +{nonTintedEvents.length - 2} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
