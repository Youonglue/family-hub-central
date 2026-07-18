import { Sword, Trash2, Clock } from "lucide-react";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function DayView({ day, byDay, onDelete, memberList }: any) {
  const evs = byDay.get(ymd(day)) ?? [];
  return (
    <div className="bg-white rounded-[4rem] border-8 border-slate-50 p-10 shadow-2xl min-h-[600px] animate-in slide-in-from-bottom-5">
       <h2 className="text-5xl font-black uppercase italic tracking-tighter text-slate-900 mb-10">Daily Log</h2>
       <div className="space-y-4">
         {evs.map((e: any) => {
           const assignedHero = memberList.find((m: any) => m.id === e.member_id);
           return (
             <div key={e.id} className="flex items-center gap-6 p-6 bg-slate-50 rounded-[2.5rem] border-2 border-transparent hover:border-indigo-100 transition-all shadow-sm">
                {assignedHero ? (
                  <div 
                    className="size-20 rounded-3xl flex items-center justify-center text-2xl font-black text-white shadow-lg shrink-0" 
                    style={{ backgroundColor: assignedHero.avatar_color || 'gray' }}
                  >
                    {assignedHero.name[0].toUpperCase()}
                  </div>
                ) : (
                  <div className="size-20 bg-slate-800 text-white rounded-3xl flex items-center justify-center text-sm font-black shrink-0 shadow-lg">ALL</div>
                )}
                <div className="flex-1">
                   <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{e.title}</h4>
                   <div className="flex flex-wrap items-center gap-4 mt-1">
                     <p className="text-xs font-black text-slate-400 uppercase">{e.location || "Base"}</p>
                     {e.time_from && (
                       <div className="flex items-center gap-1 text-xs font-black text-indigo-500 uppercase tracking-widest border-l border-slate-200 pl-4">
                         <Clock size={12} /> {e.time_from} {e.time_to ? ` - ${e.time_to}` : ""}
                       </div>
                     )}
                   </div>
                </div>
                <button onClick={() => onDelete(e.id)} className="h-16 w-16 rounded-2xl bg-white text-rose-500 shadow-lg flex items-center justify-center hover:scale-110 hover:bg-rose-50 active:scale-95 transition-all cursor-pointer">
                   <Trash2 size={24} />
                </button>
             </div>
           );
         })}
       </div>
    </div>
  );
}
