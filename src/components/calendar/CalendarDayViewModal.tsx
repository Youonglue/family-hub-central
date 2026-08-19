// src/components/calendar/CalendarDayViewModal.tsx
import React from "react";
import { Sword, Trash2, X, Clock } from "lucide-react";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function CalendarDayViewModal({ dayViewDate, byDay, onClose, onDelete }: any) {
  const eventsForDay = byDay.get(ymd(dayViewDate)) ?? [];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-xl bg-white rounded-3xl sm:rounded-[3.5rem] p-5 sm:p-8 shadow-2xl border-4 sm:border-8 border-slate-50 animate-in zoom-in-95 duration-200 flex flex-col max-h-[88vh] my-auto" onClick={e => e.stopPropagation()}>
         
         <div className="flex justify-between items-center mb-4 sm:mb-6 shrink-0">
           <div>
             <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tight text-slate-900 leading-tight">
               {dayViewDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
             </h2>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
               {eventsForDay.length} {eventsForDay.length === 1 ? "Quest" : "Quests"} Scheduled
             </p>
           </div>
           
           <button 
             onClick={onClose} 
             className="p-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-500 rounded-full transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
           >
             <X size={18} />
           </button>
         </div>

         <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin flex-1">
           {eventsForDay.length === 0 ? (
             <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
               <p className="text-xs font-black text-slate-400 uppercase tracking-wider">No quests scheduled for this day</p>
             </div>
           ) : (
             eventsForDay.map((e: any) => (
               <div 
                 key={e.id} 
                 className="bg-slate-50 p-4 sm:p-5 rounded-2xl sm:rounded-3xl flex items-center justify-between border border-slate-200 gap-3 shadow-sm hover:border-indigo-100 transition-all"
               >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div 
                      className="size-11 sm:size-12 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0" 
                      style={{ backgroundColor: e.color || '#6366f1' }}
                    >
                      <Sword size={20} />
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-base sm:text-lg uppercase tracking-tight text-slate-900 truncate leading-tight">
                        {e.title}
                      </p>
                      
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        {e.location && (
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            📍 {e.location}
                          </span>
                        )}
                        {e.time_from && (
                          <span className="flex items-center gap-1 text-[9px] font-black text-indigo-600 uppercase tracking-wider">
                            <Clock size={10} /> {e.time_from} {e.time_to ? ` - ${e.time_to}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => { onDelete(e.id); }} 
                    className="size-11 sm:size-12 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-2xl flex items-center justify-center shadow-sm active:scale-90 transition-all cursor-pointer shrink-0 min-h-[44px] min-w-[44px]"
                    title="Remove Quest"
                  >
                    <Trash2 size={18} />
                  </button>
               </div>
             ))
           )}
         </div>
      </div>
    </div>
  );
}
