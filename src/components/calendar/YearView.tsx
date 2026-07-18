const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDaysL = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d: Date) => { const s = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const dow = (s.getDay() + 6) % 7; return addDaysL(s, -dow); };
const startOfMonthGrid = (d: Date) => startOfWeek(new Date(d.getFullYear(), d.getMonth(), 1));

export function YearView({ year, byDay, onPickMonth }: any) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {MONTHS.map((name, mi) => {
        const gridStart = startOfMonthGrid(new Date(year, mi, 1));
        const days = Array.from({ length: 42 }, (_, i) => addDaysL(gridStart, i));
        return (
          <button key={mi} onClick={() => onPickMonth(mi)} className="rounded-[2.5rem] border-4 border-slate-50 bg-white p-6 text-left shadow-lg hover:shadow-2xl transition-all group cursor-pointer">
            <p className="mb-4 font-black text-xl uppercase italic tracking-tighter group-hover:text-indigo-600 transition-colors">{name}</p>
            <div className="grid grid-cols-7 gap-1 text-[9px] font-black text-slate-300">
              {days.map(d => {
                const key = ymd(d);
                const hasEv = (byDay.get(key) ?? []).length > 0;
                return (
                  <div key={key} className={`aspect-square grid place-items-center relative ${d.getMonth() === mi ? "text-slate-900" : "text-slate-100"}`}>
                    {d.getDate()}
                    {hasEv && d.getMonth() === mi && <div className="absolute bottom-0 size-1 bg-indigo-500 rounded-full" />}
                  </div>
                );
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
}
