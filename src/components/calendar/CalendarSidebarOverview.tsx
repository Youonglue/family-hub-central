import { Target, X, Clock } from "lucide-react";

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
               <div className="flex-1 bg-slate-50 p-4 rounded-2xl group-hover:bg-slate-100 transition-all border-l-4 relative flex flex-col gap-1.5" style={{ borderLeftColor: e.color || 'gray' }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
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
                      <p className="font-black text-sm text-slate-900 leading-tight">
                        {e.title}
                      </p>
                    </div>
                    <button onClick={() => onDelete(e.id)} className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                      <X size={16} />
                    </button>
                  </div>
                  
                  {/* Inline Time display */}
                  {e.time_from && (
                    <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-9">
                      <Clock size={10} /> {e.time_from} {e.time_to ? ` - ${e.time_to}` : ""}
                    </div>
                  )}
               </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
