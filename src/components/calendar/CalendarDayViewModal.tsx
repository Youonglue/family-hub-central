import { Sword, Trash2, X, Clock } from "lucide-react";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function CalendarDayViewModal({ dayViewDate, byDay, onClose, onDelete }: any) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white rounded-[3rem] p-6 sm:p-8 shadow-2xl border-4 sm:border-[12px] border-slate-50 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
         
         <div className="flex justify-between items-center mb-6 shrink-0">
           <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">{dayViewDate.toLocaleDateString()}</h2>
           <button onClick={onClose} className="p-3 bg-slate-100 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-all cursor-pointer"><X /></button>
         </div>

         <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar flex-1">
           {(byDay.get(ymd(dayViewDate)) ?? []).map((e: any) => (
             <div key={e.id} className="bg-slate-50 p-5 rounded-3xl flex items-center justify-between border-2 border-slate-100 gap-4 shadow-sm hover:border-indigo-100 transition-all">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0" style={{backgroundColor: e.color || 'gray'}}><Sword size={24} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-xl uppercase tracking-tighter text-slate-900 truncate leading-tight">{e.title}</p>
                    {e.time_from && (
                      <div className="flex items-center gap-1 text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">
                        <Clock size={12} /> {e.time_from} {e.time_to ? ` - ${e.time_to}` : ""}
                      </div>
                    )}
                  </div>
                </div>

                {/* Massive delete touch target (h-14 w-14) */}
                <button 
                  onClick={() => { onDelete(e.id); onClose(); }} 
                  className="h-14 w-14 bg-rose-50 hover:bg-rose-100 border-2 border-rose-100 text-rose-500 rounded-2xl flex items-center justify-center shadow-sm active:scale-90 transition-all cursor-pointer shrink-0"
                  title="Remove Quest"
                >
                  <Trash2 size={22} />
                </button>
             </div>
           ))}
         </div>
      </div>
    </div>
  );
}
