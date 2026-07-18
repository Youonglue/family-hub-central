import { Sword, Trash2, X, Clock } from "lucide-react";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function CalendarDayViewModal({ dayViewDate, byDay, onClose, onDelete }: any) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white rounded-[3rem] p-8 shadow-2xl border-[12px] border-slate-50 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
         <div className="flex justify-between items-center mb-6">
           <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">{dayViewDate.toLocaleDateString()}</h2>
           <button onClick={onClose} className="p-3 bg-slate-100 rounded-full hover:text-rose-500 transition-all cursor-pointer"><X /></button>
         </div>
         <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
           {(byDay.get(ymd(dayViewDate)) ?? []).map((e: any) => (
             <div key={e.id} className="bg-slate-50 p-6 rounded-[2rem] flex items-center justify-between border-2 border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{backgroundColor: e.color || 'gray'}}><Sword /></div>
                  <div className="min-w-0">
                    <p className="font-black text-2xl uppercase tracking-tighter text-slate-900 truncate">{e.title}</p>
                    {e.time_from && (
                      <div className="flex items-center gap-1 text-xs font-black text-indigo-500 uppercase tracking-widest mt-1">
                        <Clock size={12} /> {e.time_from} {e.time_to ? ` - ${e.time_to}` : ""}
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={() => { onDelete(e.id); onClose(); }} className="h-20 w-20 bg-white text-rose-500 rounded-2xl border-4 border-rose-50 flex items-center justify-center shadow-lg active:scale-90 transition-all cursor-pointer">
                  <Trash2 size={32} />
                </button>
             </div>
           ))}
         </div>
      </div>
    </div>
  );
}
