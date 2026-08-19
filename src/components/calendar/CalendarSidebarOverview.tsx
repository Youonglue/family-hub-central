// src/components/calendar/CalendarSidebarOverview.tsx
import React from "react";
import { Target, Trash2, Clock } from "lucide-react";
import { Avatar, parseAvatarConfig } from "@/components/avatar/Avatar";

export function CalendarSidebarOverview({ focusedDate, dailyAgenda, memberList, onDelete }: any) {
  return (
    <section className="bg-white p-5 sm:p-8 rounded-3xl sm:rounded-[3rem] border-2 sm:border-4 border-slate-50 shadow-xl min-h-[360px]">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg sm:text-xl font-black uppercase italic tracking-tight flex items-center gap-2 text-slate-900">
          <Target className="text-indigo-500 animate-pulse size-5" /> Day Overview
        </h3>
        <span className="px-3 py-1 bg-slate-100 text-[10px] font-black uppercase rounded-xl text-slate-600 font-mono">
          {focusedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
      </div>
      
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-4 sm:mb-6">
        Quests scheduled for selected date
      </p>
      
      <div className="space-y-3">
        {dailyAgenda.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-xs font-black text-slate-300 uppercase tracking-wider">No quests scheduled</p>
          </div>
        ) : (
          dailyAgenda.map((e: any) => {
            const assignedHero = memberList.find((m: any) => m.id === e.member_id);
            const avatarConfig = parseAvatarConfig(assignedHero?.avatar_config);

            return (
              <div key={e.id} className="group flex gap-2 items-start relative">
                 <div 
                   className="flex-1 bg-slate-50 p-3.5 rounded-2xl border-l-4 relative flex items-center justify-between gap-3 shadow-sm" 
                   style={{ borderLeftColor: e.color || '#6366f1' }}
                 >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        {assignedHero ? (
                          <Avatar 
                            config={avatarConfig} 
                            className="size-6 rounded-lg shadow-sm shrink-0" 
                          />
                        ) : (
                          <div className="size-6 rounded-lg bg-slate-800 text-white flex items-center justify-center text-[8px] font-black shrink-0 shadow-sm" title="Whole Family">
                            ALL
                          </div>
                        )}
                        <p className="font-black text-xs sm:text-sm text-slate-900 leading-tight truncate">
                          {e.title}
                        </p>
                      </div>

                      {e.time_from && (
                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-8">
                          <Clock size={10} /> {e.time_from} {e.time_to ? ` - ${e.time_to}` : ""}
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => onDelete(e.id)} 
                      className="size-9 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-500 rounded-xl flex items-center justify-center cursor-pointer transition-all shrink-0 hover:scale-105 active:scale-95 min-h-[36px] min-w-[36px]"
                      title="Remove Quest"
                    >
                      <Trash2 size={14} />
                    </button>
                 </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
