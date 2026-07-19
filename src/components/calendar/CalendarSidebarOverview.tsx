import { Target, Trash2, Clock } from "lucide-react";

export function CalendarSidebarOverview({ focusedDate, dailyAgenda, memberList, onDelete }: any) {
  return (
    <section className="bg-white p-8 rounded-[3rem] border-4 border-slate-50 shadow-xl min-h-[400px]">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2 text-slate-900">
          <Target className="text-indigo-500 animate-pulse" /> Day Overview
        </h3>
        <span className="px-3 py-1 bg-slate-100 text-[10px] font-black uppercase rounded-lg text-slate-500 font-mono">
          {focusedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
      </div>
      
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-6">Quests scheduled for selected date</p>
      
      <div className="space-y-4">
        {dailyAgenda.length === 0 && (
          <p className="text-center py-16 text-xs font-black text-slate-300 uppercase tracking-wider">No quests scheduled</p>
        )}
        {dailyAgenda.map((e: any) => {
          const assignedHero = memberList.find((m: any) => m.id === e.member_id);
          return (
            <div key={e.id} className="group flex gap-4 items-start relative">
               <div className="flex-1 bg-slate-50 p-4 rounded-2xl border-l-4 relative flex items-center justify-between gap-3" style={{ borderLeftColor: e.color || 'gray' }}>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {assignedHero ? (
                        <div 
                          className="size-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-sm" 
                          style={{ backgroundColor: assignedHero.avatar_color || '#ccc' }}
                          title={assignedHero.name}
                        >
                          {assignedHero.name[0].toUpperCase()}
                        </div>
                      ) : (
                        <div className="size-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[8px] font-black shrink-0 shadow-sm" title="Whole Family">ALL</div>
                      )}
                      <p className="font-black text-sm text-slate-900 leading-tight truncate">
                        {e.title}
                      </p>
                    </div>

                    {e.time_from && (
                      <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-8">
                        <Clock size={10} /> {e.time_from} {e.time_to ? ` - ${e.time_to}` : ""}
                      </div>
                    )}
                  </div>

                  {/* Always-visible, touch-friendly delete button */}
                  <button 
                    onClick={() => onDelete(e.id)} 
                    className="size-9 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-500 rounded-xl flex items-center justify-center cursor-pointer transition-all shrink-0 hover:scale-105 active:scale-95"
                    title="Remove Quest"
                  >
                    <Trash2 size={14} />
                  </button>
               </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
