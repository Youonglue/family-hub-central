import { Clock } from "lucide-react";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDaysL = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d: Date) => { const s = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const dow = (s.getDay() + 6) % 7; return addDaysL(s, -dow); };

export function WeekView({ anchor, byDay, onPickDay, onSelectDate, memberList }: any) {
  const start = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDaysL(start, i));
  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
      {days.map(d => {
        const key = ymd(d);
        const evs = byDay.get(key) ?? [];
        return (
          <div key={key} className="bg-white rounded-[2.5rem] border-4 border-slate-50 p-6 min-h-[400px] shadow-lg cursor-pointer hover:border-slate-200 transition-all group" onClick={() => { onPickDay(d); onSelectDate(d); }}>
             <p className="text-3xl font-black mb-6 text-slate-900 group-hover:text-indigo-600 transition-colors">{d.getDate()}</p>
             <div className="space-y-3">
               {evs.map((e: any) => {
                 const assignedHero = memberList.find((m: any) => m.id === e.member_id);
                 return (
                   <div 
                      key={e.id} 
                      className="p-4 rounded-2xl bg-slate-50 border-l-4 shadow-sm flex flex-col gap-1" 
                      style={{ borderLeftColor: e.color || 'gray' }}
                   >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-black text-sm leading-tight text-slate-900 flex-1 truncate">
                            {e.title}
                        </p>
                        {assignedHero && (
                          <div 
                            className="size-4 rounded-full flex items-center justify-center text-[7px] font-black text-white shrink-0 shadow-inner animate-in zoom-in-50" 
                            style={{ backgroundColor: assignedHero.avatar_color || '#ccc' }}
                          >
                            {assignedHero.name[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      {e.time_from && (
                        <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                          <Clock size={8} /> {e.time_from} {e.time_to ? ` - ${e.time_to}` : ""}
                        </div>
                      )}
                   </div>
                 );
               })}
             </div>
          </div>
        );
      })}
    </div>
  );
}
