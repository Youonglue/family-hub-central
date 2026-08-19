// src/components/calendar/DayView.tsx
import React from "react";
import { Trash2, Clock } from "lucide-react";
import { Avatar, parseAvatarConfig } from "@/components/avatar/Avatar";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function DayView({ day, byDay, onDelete, memberList }: any) {
  const evs = byDay.get(ymd(day)) ?? [];

  return (
    <div className="bg-white rounded-3xl sm:rounded-[3.5rem] border-2 sm:border-8 border-slate-50 p-6 sm:p-10 shadow-xl min-h-[500px] animate-in slide-in-from-bottom-5">
       <h2 className="text-3xl sm:text-5xl font-black uppercase italic tracking-tight text-slate-900 mb-6 sm:mb-8">
         {day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
       </h2>
       
       <div className="space-y-3 sm:space-y-4">
         {evs.length === 0 ? (
           <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
             <p className="text-sm font-black text-slate-400 uppercase tracking-wider">No quests recorded for today</p>
           </div>
         ) : (
           evs.map((e: any) => {
             const assignedHero = memberList.find((m: any) => m.id === e.member_id);
             const avatarConfig = parseAvatarConfig(assignedHero?.avatar_config);

             return (
               <div 
                 key={e.id} 
                 className="flex items-center gap-4 sm:gap-6 p-4 sm:p-6 bg-slate-50 rounded-2xl sm:rounded-3xl border border-slate-200 hover:border-indigo-100 transition-all shadow-sm"
               >
                  {assignedHero ? (
                    <Avatar 
                      config={avatarConfig} 
                      className="size-14 sm:size-16 rounded-2xl shadow-md shrink-0" 
                    />
                  ) : (
                    <div className="size-14 sm:size-16 bg-slate-800 text-white rounded-2xl flex items-center justify-center text-xs sm:text-sm font-black shrink-0 shadow-md">
                      ALL
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                     <h4 className="text-lg sm:text-2xl font-black text-slate-900 uppercase tracking-tight truncate">
                       {e.title}
                     </h4>
                     
                     <div className="flex flex-wrap items-center gap-3 mt-1">
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                         📍 {e.location || "Base"}
                       </p>
                       {e.time_from && (
                         <div className="flex items-center gap-1 text-xs font-black text-indigo-600 uppercase tracking-wider border-l border-slate-200 pl-3">
                           <Clock size={12} /> {e.time_from} {e.time_to ? ` - ${e.time_to}` : ""}
                         </div>
                       )}
                     </div>
                  </div>

                  <button 
                    onClick={() => onDelete(e.id)} 
                    className="size-12 sm:size-14 rounded-2xl bg-white hover:bg-rose-50 text-rose-500 shadow-md flex items-center justify-center active:scale-95 transition-all cursor-pointer shrink-0 min-h-[44px] min-w-[44px]"
                    title="Remove Quest"
                  >
                     <Trash2 size={20} />
                  </button>
               </div>
             );
           })
         )}
       </div>
    </div>
  );
}
