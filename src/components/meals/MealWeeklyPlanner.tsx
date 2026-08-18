// src/components/meals/MealWeeklyPlanner.tsx
import { Fragment } from "react";
import { X, Calendar, ArrowRightLeft } from "lucide-react";

const MEALS = ["Breakfast", "Lunch", "Dinner"] as const;

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function MealWeeklyPlanner({ 
  weekStart, 
  planData, 
  recipesData, 
  isAdmin, 
  onSetSlot, 
  onClearSlot 
}: any) {
  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * 86400000));
  const planMap = new Map<string, any>();
  
  const list = Array.isArray(planData) ? planData : [];
  for (const p of list) {
    planMap.set(`${p.plan_date}:${p.meal}`, p);
  }

  const recipes = Array.isArray(recipesData) ? recipesData : [];

  return (
    <div className="space-y-3">
      {/* Mobile/Tablet Portrait Swipe Indicator */}
      <div className="flex md:hidden items-center justify-between bg-indigo-50/80 border border-indigo-100 rounded-2xl px-4 py-2 text-indigo-700 text-[10px] font-black uppercase tracking-widest">
        <span className="flex items-center gap-2">
          <ArrowRightLeft size={14} className="animate-pulse" /> Swipe horizontally to view the full 7-day feast
        </span>
        <Calendar size={14} />
      </div>

      <section className="overflow-x-auto bg-white rounded-3xl sm:rounded-[3rem] p-4 sm:p-8 shadow-xl border-4 sm:border-8 border-slate-50 scrollbar-thin">
        <div className="grid min-w-[760px] lg:min-w-full grid-cols-8 gap-2 sm:gap-4">
          
          {/* Header Row: Quest Type Label */}
          <div className="flex items-end pb-3 sm:pb-4 font-black text-slate-300 uppercase tracking-widest text-[9px] sm:text-[10px]">
            Feast / Day
          </div>

          {/* Header Row: Days */}
          {days.map((d) => (
            <div key={toISO(d)} className="text-center pb-3 sm:pb-4 border-b-2 sm:border-b-4 border-slate-50">
              <p className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-widest">
                {d.toLocaleDateString(undefined, { weekday: "short" })}
              </p>
              <p className="text-xl sm:text-3xl font-black text-slate-800">{d.getDate()}</p>
            </div>
          ))}

          {/* Meal Rows */}
          {MEALS.map((m) => (
            <Fragment key={m}>
              {/* Row Label */}
              <div className="flex items-center font-black text-[11px] sm:text-xs text-indigo-500 uppercase tracking-widest">
                {m}
              </div>

              {/* 7 Day Slots for this meal */}
              {days.map((d) => {
                const dateKey = toISO(d);
                const key = `${dateKey}:${m}`;
                const entry = planMap.get(key);

                return (
                  <div 
                    key={key} 
                    className="relative bg-slate-50 hover:bg-slate-100/80 rounded-2xl sm:rounded-3xl p-2 sm:p-3 min-h-[95px] sm:min-h-[120px] border-2 border-transparent hover:border-indigo-100 transition-all flex flex-col items-center justify-center text-center group shadow-inner overflow-hidden"
                  >
                    {entry ? (
                      <>
                        {entry.image_url && (
                          <img 
                            src={entry.image_url} 
                            alt={entry.recipe_name} 
                            className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity" 
                          />
                        )}
                        
                        <p className="relative z-10 text-[9px] sm:text-[10px] font-black leading-tight text-slate-900 uppercase px-1 line-clamp-3">
                          {entry.recipe_name}
                        </p>
                        
                        {isAdmin && (
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onClearSlot(entry.id);
                            }} 
                            className="absolute z-20 top-1.5 right-1.5 sm:top-2 sm:right-2 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white rounded-lg sm:rounded-xl p-1.5 sm:p-2 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all shadow-md cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                            title="Remove meal from slot"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </>
                    ) : (
                      isAdmin ? (
                        <div className="w-full flex items-center justify-center">
                          <select
                            aria-label={`Set ${m} on ${dateKey}`}
                            className="w-full bg-transparent text-[9px] sm:text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-wider outline-none cursor-pointer text-center appearance-none py-3 min-h-[44px]"
                            onChange={(e) => { 
                              if (e.target.value) {
                                onSetSlot({ plan_date: dateKey, meal: m, recipe_id: e.target.value }); 
                              }
                            }}
                            value=""
                          >
                            <option value="">+ {m}</option>
                            {recipes.map((r: any) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <p className="text-[8px] sm:text-[9px] font-black text-slate-300 uppercase tracking-widest italic">
                          Not Set
                        </p>
                      )
                    )}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </section>
    </div>
  );
}
