import { Fragment } from "react";
import { X } from "lucide-react";

const MEALS = ["Breakfast", "Lunch", "Dinner"] as const;

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function MealWeeklyPlanner({ weekStart, planData, recipesData, isAdmin, onSetSlot, onClearSlot }: any) {
  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * 86400000));
  const planMap = new Map<string, any>();
  
  const list = Array.isArray(planData) ? planData : [];
  for (const p of list) {
    planMap.set(`${p.plan_date}:${p.meal}`, p);
  }

  const recipes = Array.isArray(recipesData) ? recipesData : [];

  return (
    <section className="overflow-x-auto bg-white rounded-[3rem] p-8 shadow-2xl border-8 border-slate-50">
      <div className="grid min-w-[800px] grid-cols-8 gap-4">
        <div className="flex items-end pb-4 font-black text-slate-200 uppercase tracking-widest text-[10px]">Quest Type</div>
        {days.map((d) => (
          <div key={toISO(d)} className="text-center pb-4 border-b-4 border-slate-50">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{d.toLocaleDateString(undefined, { weekday: "short" })}</p>
            <p className="text-3xl font-black text-slate-800">{d.getDate()}</p>
          </div>
        ))}

        {MEALS.map((m) => (
          <Fragment key={m}>
            <div className="flex items-center font-black text-xs text-indigo-500 uppercase tracking-widest">{m}</div>
            {days.map((d) => {
              const key = `${toISO(d)}:${m}`;
              const entry = planMap.get(key);
              return (
                <div key={key} className="relative bg-slate-50 rounded-3xl p-3 min-h-[120px] border-2 border-transparent hover:border-indigo-100 transition-all flex flex-col items-center justify-center text-center group shadow-inner overflow-hidden">
                  {entry ? (
                    <>
                      {entry.image_url && <img src={entry.image_url} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity" />}
                      <p className="relative z-10 text-[10px] font-black leading-tight text-slate-900 uppercase px-2">{entry.recipe_name}</p>
                      
                      {isAdmin && (
                        <button onClick={() => onClearSlot(entry.id)} className="absolute z-20 top-2 right-2 bg-rose-500 text-white rounded-xl p-2 opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110 cursor-pointer">
                          <X size={14} />
                        </button>
                      )}
                    </>
                  ) : (
                    isAdmin ? (
                      <select
                        className="w-full bg-transparent text-[10px] font-black text-slate-300 uppercase tracking-widest outline-none cursor-pointer hover:text-indigo-600 transition-colors appearance-none text-center"
                        onChange={(e) => { if (e.target.value) onSetSlot({ plan_date: toISO(d), meal: m, recipe_id: e.target.value }); }}
                        value=""
                      >
                        <option value="">+ {m}</option>
                        {recipes
                          .filter((r: any) => r.category === m)
                          .map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    ) : (
                      <p className="text-[9px] font-black text-slate-200 uppercase tracking-widest italic">Not Set</p>
                    )
                  )}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </section>
  );
}
