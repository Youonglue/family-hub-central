import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell, kidStyle } from "@/components/AppShell";
import { addEvent, deleteEvent, listEvents, listMembers } from "@/lib/hub-api";
import { holidayMapForYears } from "@/lib/uk-holidays";
import { CalendarPlus, ChevronLeft, ChevronRight, MapPin, Trash2, X, Users, Check, Calendar as CalendarIcon, Target, Sword } from "lucide-react";

export const Route = createFileRoute("/_authenticated/calendar")({ ssr: false, component: CalendarPage });

type ViewMode = "year" | "month" | "week" | "day";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDaysL = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d: Date) => { const s = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const dow = (s.getDay() + 6) % 7; return addDaysL(s, -dow); };
const startOfMonthGrid = (d: Date) => startOfWeek(new Date(d.getFullYear(), d.getMonth(), 1));

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const EVENT_COLORS = ["sky", "rose", "amber", "emerald", "violet", "indigo", "cyan", "pink", "orange"];

function CalendarPage() {
  const qc = useQueryClient();
  const events = useQuery({ queryKey: ["events"], queryFn: () => listEvents() });
  const members = useQuery({ queryKey: ["members"], queryFn: () => listMembers() });

  const [view, setView] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [memberFilter, setMemberFilter] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]); 
  const [showAddModal, setShowAddModal] = useState(false);
  const [dayViewDate, setDayViewDate] = useState<Date | null>(null);

  // CRITICAL FIX: Safe Arrays to stop crashes
  const eventList = Array.isArray(events.data) ? events.data : [];
  const memberList = Array.isArray(members.data) ? members.data : [];

  const memberColorMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const mem of memberList) m.set(mem.id, mem.avatar_color);
    return m;
  }, [memberList]);

  const filteredEvents = useMemo(() => {
    return eventList.filter((e: any) => !memberFilter || e.member_id === memberFilter);
  }, [eventList, memberFilter]);

  const monthAgenda = useMemo(() => {
    return filteredEvents.filter((e: any) => {
      const d = new Date(e.starts_at);
      return d.getMonth() === anchor.getMonth() && d.getFullYear() === anchor.getFullYear();
    }).sort((a: any, b: any) => a.starts_at.localeCompare(b.starts_at));
  }, [filteredEvents, anchor]);

  const byDay = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const e of filteredEvents) {
      const key = ymd(new Date(e.starts_at));
      const arr = m.get(key) ?? [];
      arr.push(e); m.set(key, arr);
    }
    return m;
  }, [filteredEvents]);

  const holidays = useMemo(() => holidayMapForYears([anchor.getFullYear()]), [anchor]);

  const inv = () => { qc.invalidateQueries({ queryKey: ["events"] }); qc.invalidateQueries({ queryKey: ["events-upcoming"] }); };

  const del = useMutation({ mutationFn: (id: string) => deleteEvent({ data: { id } }), onSuccess: inv });
  
  const bulkDel = useMutation({
    mutationFn: async (data: any) => fetch('/api/events/bulk-delete', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) }),
    onSuccess: () => { toast.success("Events removed"); inv(); setDayViewDate(null); }
  });

  const toggleDate = (dateKey: string) => setSelectedDates(prev => prev.includes(dateKey) ? prev.filter(d => d !== dateKey) : [...prev, dateKey]);

  function navigate(dir: -1 | 1) {
    const d = new Date(anchor);
    if (view === "year") d.setFullYear(d.getFullYear() + dir);
    else if (view === "month") d.setMonth(d.getMonth() + dir);
    else if (view === "week") d.setDate(d.getDate() + 7 * dir);
    else d.setDate(d.getDate() + dir);
    setAnchor(startOfDay(d));
  }

  const headerLabel = useMemo(() => {
    if (view === "year") return String(anchor.getFullYear());
    if (view === "month") return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
    if (view === "week") {
      const s = startOfWeek(anchor);
      const e = addDaysL(s, 6);
      return `${s.getDate()} - ${e.getDate()} ${MONTHS[s.getMonth()]}`;
    }
    return anchor.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  }, [anchor, view]);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-8">
        
        {/* HEADER */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-indigo-100 rounded-2xl">
               <CalendarIcon className="size-8 text-indigo-600" />
             </div>
             <div>
               <h1 className="font-display text-4xl font-black tracking-tight text-slate-900 uppercase italic">Family Quests</h1>
               <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">The Great Family Adventure Log</p>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
            {selectedDates.length > 0 && (
              <button onClick={() => setSelectedDates([])} className="text-xs font-black text-rose-500 uppercase tracking-widest mr-2 hover:bg-rose-50 px-4 py-2 rounded-xl transition-all">
                Clear Selection ({selectedDates.length})
              </button>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-8 py-4 text-sm font-black text-white shadow-xl hover:bg-primary hover:scale-105 transition-all active:scale-95"
            >
              <CalendarPlus className="size-5" /> 
              {selectedDates.length > 1 ? `ADD TO ${selectedDates.length} DAYS` : "NEW EVENT"}
            </button>
          </div>
        </header>

        {/* TOOLBAR */}
        <div className="mb-8 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl border-4 border-slate-50 shadow-sm">
            {(["year", "month", "week", "day"] as ViewMode[]).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`rounded-xl px-5 py-2 text-xs font-black uppercase tracking-tighter transition-all ${view === v ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"}`}>
                {v}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-3 bg-white border-4 border-slate-50 rounded-2xl shadow-sm hover:bg-slate-50"><ChevronLeft className="size-5"/></button>
            <button onClick={() => setAnchor(startOfDay(new Date()))} className="px-6 py-3 bg-white border-4 border-slate-50 rounded-2xl shadow-sm font-black text-xs uppercase tracking-widest">Today</button>
            <button onClick={() => navigate(1)} className="p-3 bg-white border-4 border-slate-50 rounded-2xl shadow-sm hover:bg-slate-50"><ChevronRight className="size-5"/></button>
          </div>

          <h2 className="text-2xl font-black text-slate-800 uppercase italic ml-2">{headerLabel}</h2>
        </div>

        {/* MAIN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* CENTER: THE VIEWS */}
          <div className="lg:col-span-3">
            {view === "year" && <YearView year={anchor.getFullYear()} byDay={byDay} holidays={holidays} onPickMonth={(m: any) => { setAnchor(new Date(anchor.getFullYear(), m, 1)); setView("month"); }} />}
            {view === "month" && <MonthView anchor={anchor} byDay={byDay} holidays={holidays} memberColor={memberColorMap} onPickDay={(d: any) => { setDayViewDate(d); }} selectedDates={selectedDates} onToggleDate={toggleDate} />}
            {view === "week" && <WeekView anchor={anchor} byDay={byDay} holidays={holidays} memberColor={memberColorMap} onPickDay={(d: any) => { setDayViewDate(d); }} />}
            {view === "day" && <DayView day={anchor} byDay={byDay} holidays={holidays} memberColor={memberColorMap} onDelete={(id: any) => del.mutate(id)} />}
          </div>

          {/* RIGHT SIDEBAR: MEMBER AGENDA */}
          <aside className="space-y-8">
             <section className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
               <Users className="absolute -right-6 -top-6 size-32 text-white/5 rotate-12" />
               <h3 className="text-xl font-black uppercase italic tracking-tighter mb-6 relative">Family Filter</h3>
               <div className="flex flex-col gap-3 relative">
                  <button onClick={() => setMemberFilter(null)} className={`flex items-center gap-3 p-4 rounded-2xl font-black transition-all text-sm uppercase tracking-tighter ${!memberFilter ? 'bg-white text-slate-900 shadow-lg scale-105' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                    <Users className="size-5" /> Everyone
                  </button>
                  {memberList.map(m => (
                    <button key={m.id} onClick={() => setMemberFilter(m.id)} className={`flex items-center gap-3 p-4 rounded-2xl font-black transition-all text-sm uppercase tracking-tighter ${memberFilter === m.id ? 'bg-white text-slate-900 shadow-lg scale-105' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                      <div className="size-4 rounded-full border-2 border-white/20 shadow-sm" style={{ backgroundColor: m.avatar_color }} />
                      {m.name}
                    </button>
                  ))}
               </div>
             </section>

             <section className="bg-white p-8 rounded-[3rem] border-4 border-slate-50 shadow-xl min-h-[500px]">
               <h3 className="text-xl font-black uppercase italic tracking-tighter mb-6 flex items-center gap-2 text-slate-900">
                 <CalendarIcon className="text-primary" /> Month Agenda
               </h3>
               {memberFilter && <p className="text-xs font-black text-primary uppercase mb-4 tracking-widest">Showing: {memberList.find(m => m.id === memberFilter)?.name}</p>}
               
               <div className="space-y-4">
                 {monthAgenda.length === 0 ? (
                   <div className="py-20 text-center space-y-4">
                     <CalendarIcon className="size-12 text-slate-100 mx-auto" />
                     <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No Quests Logged</p>
                   </div>
                 ) : (
                   monthAgenda.map((e: any) => (
                     <div key={e.id} className="group flex gap-4 items-start animate-in slide-in-from-right-4">
                        <div className="text-center min-w-[40px]">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{new Date(e.starts_at).toLocaleDateString(undefined, { weekday: 'short' })}</p>
                           <p className="text-2xl font-black text-slate-900 leading-none">{new Date(e.starts_at).getDate()}</p>
                        </div>
                        <div className="flex-1 bg-slate-50 p-4 rounded-2xl group-hover:bg-slate-100 transition-all border-l-4" style={{ borderColor: e.color || 'gray' }}>
                           <p className="font-black text-sm text-slate-800 leading-tight mb-1">{e.title}</p>
                           <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase">
                             <MapPin className="size-3" /> {e.location || "Base"}
                           </div>
                        </div>
                     </div>
                   ))
                 )}
               </div>
             </section>
          </aside>
        </div>

        {/* DAY VIEW / BULK DELETE MODAL */}
        {dayViewDate && (
          <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setDayViewDate(null)}>
            <div className="w-full max-w-2xl bg-white rounded-[3rem] p-8 shadow-2xl border-[12px] border-slate-50 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
               <div className="flex justify-between items-center mb-6">
                 <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">Events for {dayViewDate.toLocaleDateString()}</h2>
                 <button onClick={() => setDayViewDate(null)} className="p-3 bg-slate-100 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-all"><X /></button>
               </div>
               <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                 {(byDay.get(ymd(dayViewDate)) ?? []).length === 0 && <p className="text-slate-400 font-bold uppercase tracking-widest text-sm text-center py-10">No events today.</p>}
                 {(byDay.get(ymd(dayViewDate)) ?? []).map((e: any) => (
                   <div key={e.id} className="bg-slate-50 p-6 rounded-[2rem] flex items-center justify-between border-2 border-slate-100">
                      <div>
                        <p className="font-black text-2xl uppercase tracking-tighter text-slate-800">{e.title}</p>
                        <p className="text-sm text-slate-500 font-bold"><MapPin className="inline size-4"/> {e.location || "No Location"}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                         <button onClick={() => { del.mutate(e.id); setDayViewDate(null); }} className="text-[10px] uppercase tracking-widest bg-white border border-slate-200 px-4 py-2 rounded-xl font-black hover:text-rose-500 shadow-sm">Delete This</button>
                         <button onClick={() => bulkDel.mutate({ title: e.title, range: 'all' })} className="text-[10px] uppercase tracking-widest bg-rose-100 text-rose-600 px-4 py-2 rounded-xl font-black hover:bg-rose-200 shadow-sm">Delete ALL</button>
                         <button onClick={() => bulkDel.mutate({ title: e.title, range: 'range', start_date: `${anchor.getFullYear()}-${pad(anchor.getMonth()+1)}-01`, end_date: `${anchor.getFullYear()}-${pad(anchor.getMonth()+1)}-31` })} className="text-[10px] uppercase tracking-widest bg-orange-100 text-orange-600 px-4 py-2 rounded-xl font-black hover:bg-orange-200 shadow-sm">Delete This Month</button>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        )}

        {/* ADD EVENT MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-900/60 backdrop-blur-md p-4" onClick={() => setShowAddModal(false)}>
             <div className="w-full max-w-xl bg-white rounded-[4rem] p-10 shadow-2xl border-[12px] border-slate-50 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
               <div className="flex justify-between items-start mb-8">
                 <div>
                   <h2 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">New Quest</h2>
                   <p className="text-slate-400 font-bold text-xs uppercase mt-1">Log a new family adventure</p>
                 </div>
                 <button onClick={() => setShowAddModal(false)} className="p-3 bg-slate-100 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-all"><X /></button>
               </div>

               <form className="space-y-6" onSubmit={async (e) => {
                  e.preventDefault();
                  const target = e.target as any;
                  const dates = selectedDates.length > 0 ? selectedDates : [ymd(anchor)];
                  
                  const res = await fetch('/api/kiosk/events', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                      title: target.title.value,
                      location: target.location.value,
                      member_id: target.member.value || null,
                      color: target.color.value,
                      dates: dates
                    })
                  });
                  
                  if (res.ok) {
                    toast.success("Family events logged!");
                    setSelectedDates([]);
                    setShowAddModal(false);
                    inv();
                  }
               }}>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Quest Name</label>
                    <input name="title" required placeholder="Swimming, Party, Chores..." className="w-full p-5 bg-slate-50 rounded-3xl border-4 border-transparent focus:border-indigo-500/20 outline-none font-black text-xl placeholder:text-slate-200" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Location</label>
                    <div className="relative">
                      <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 size-5" />
                      <input name="location" placeholder="Where is the adventure?" className="w-full p-5 pl-14 bg-slate-50 rounded-3xl border-4 border-transparent focus:border-indigo-500/20 outline-none font-bold text-lg" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Assign Hero</label>
                      <select name="member" className="w-full p-5 bg-slate-50 rounded-3xl border-4 border-transparent focus:border-indigo-500/20 outline-none font-black uppercase text-sm">
                        <option value="">Whole Family</option>
                        {memberList.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Quest Color</label>
                      <select name="color" className="w-full p-5 bg-slate-50 rounded-3xl border-4 border-transparent focus:border-indigo-500/20 outline-none font-black uppercase text-sm">
                        {EVENT_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  {selectedDates.length > 0 && (
                    <div className="p-6 bg-indigo-50 rounded-[2rem] border-4 border-indigo-100 flex items-center gap-4">
                      <div className="p-3 bg-white rounded-2xl shadow-sm"><Target className="text-indigo-600" /></div>
                      <div>
                        <p className="text-xs font-black text-indigo-900 uppercase">Multi-Mode Active</p>
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Adding quest to {selectedDates.length} days</p>
                      </div>
                    </div>
                  )}

                  <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black text-2xl shadow-2xl shadow-slate-200 hover:bg-primary hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-3">
                    <Check className="size-8" /> LOG QUESTS
                  </button>
               </form>
             </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// SUB-VIEWS
// ────────────────────────────────────────────────────────────────────────────

function YearView({ year, byDay, onPickMonth }: any) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {MONTHS.map((name, mi) => {
        const gridStart = startOfMonthGrid(new Date(year, mi, 1));
        const days = Array.from({ length: 42 }, (_, i) => addDaysL(gridStart, i));
        return (
          <button key={mi} onClick={() => onPickMonth(mi)} className="rounded-[2.5rem] border-4 border-slate-50 bg-white p-6 text-left shadow-lg hover:shadow-2xl transition-all group">
            <p className="mb-4 font-black text-xl uppercase italic tracking-tighter group-hover:text-primary transition-colors">{name}</p>
            <div className="grid grid-cols-7 gap-1 text-[9px] font-black text-slate-300">
              {WEEKDAYS.map(w => <div key={w} className="text-center">{w[0]}</div>)}
              {days.map(d => {
                const key = ymd(d);
                const hasEv = byDay.get(key)?.length > 0;
                const inMonth = d.getMonth() === mi;
                return (
                  <div key={key} className={`aspect-square grid place-items-center rounded-lg relative ${inMonth ? "text-slate-900" : "text-slate-100"}`}>
                    {d.getDate()}
                    {hasEv && inMonth && <div className="absolute bottom-0 size-1 bg-primary rounded-full" />}
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

function MonthView({ anchor, byDay, onPickDay, onToggleDate, selectedDates }: any) {
  const gridStart = startOfMonthGrid(anchor);
  const days = Array.from({ length: 42 }, (_, i) => addDaysL(gridStart, i));
  const month = anchor.getMonth();

  return (
    <div className="bg-white rounded-[3rem] border-4 border-slate-50 shadow-xl p-6">
      <div className="grid grid-cols-7 gap-3 mb-4">
        {WEEKDAYS.map(w => <div key={w} className="text-center font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-3">
        {days.map((d) => {
          const key = ymd(d);
          const evs = byDay.get(key) ?? [];
          const inMonth = d.getMonth() === month;
          const isToday = key === ymd(new Date());
          const isSelected = selectedDates.includes(key);

          return (
            <div
              key={key}
              onClick={() => onToggleDate(key)}
              className={`min-h-[140px] p-3 rounded-[2rem] border-4 transition-all cursor-pointer group flex flex-col ${
                isSelected ? "border-primary bg-primary/5 scale-95 shadow-inner" :
                isToday ? "border-slate-900 bg-slate-50" : 
                "border-slate-50 bg-white hover:border-slate-200"
              } ${!inMonth ? "opacity-20" : ""}`}
            >
              <div className="flex justify-between items-center mb-2">
                <span onClick={(e) => { e.stopPropagation(); onPickDay(d); }} className={`text-sm font-black hover:underline ${isToday ? "text-primary" : "text-slate-900"}`}>{d.getDate()}</span>
                {isSelected && <Check className="size-4 text-primary" />}
              </div>
              <div className="space-y-1 flex-1">
                {evs.slice(0, 3).map((e: any) => (
                  <div key={e.id} className="text-[9px] font-bold px-2 py-1 rounded-lg truncate shadow-sm text-white" style={{ backgroundColor: e.color || 'gray' }}>
                    {e.title}
                  </div>
                ))}
                {evs.length > 3 && <p className="text-[9px] font-black text-slate-300 pl-1">+{evs.length-3} More</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ anchor, byDay, onPickDay }: any) {
  const start = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDaysL(start, i));
  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
      {days.map(d => {
        const key = ymd(d);
        const evs = byDay.get(key) ?? [];
        return (
          <div key={key} className="bg-white rounded-[2.5rem] border-4 border-slate-50 p-6 min-h-[400px] shadow-lg cursor-pointer hover:border-slate-200 transition-all" onClick={() => onPickDay(d)}>
             <p className="font-black text-xs text-slate-400 uppercase tracking-widest mb-1">{WEEKDAYS[(d.getDay()+6)%7]}</p>
             <p className="text-3xl font-black mb-6 text-slate-900">{d.getDate()}</p>
             <div className="space-y-3">
               {evs.map((e: any) => (
                 <div key={e.id} className="p-4 rounded-2xl shadow-sm border-l-4 bg-slate-50" style={{ borderLeftColor: e.color || 'gray' }}>
                    <p className="font-black text-sm leading-tight text-slate-800">{e.title}</p>
                 </div>
               ))}
             </div>
          </div>
        );
      })}
    </div>
  );
}

function DayView({ day, byDay, onDelete }: any) {
  const evs = byDay.get(ymd(day)) ?? [];
  return (
    <div className="bg-white rounded-[4rem] border-8 border-slate-50 p-10 shadow-2xl min-h-[600px] animate-in slide-in-from-bottom-10">
       <div className="mb-10 text-center md:text-left">
          <h2 className="text-5xl font-black uppercase italic tracking-tighter text-slate-900">Daily Log</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-2">Managing Quests for {day.toLocaleDateString()}</p>
       </div>
       <div className="grid gap-6">
         {evs.map((e: any) => (
           <div key={e.id} className="flex items-center gap-6 p-6 bg-slate-50 rounded-[2.5rem] group hover:bg-slate-100 transition-all border-2 border-transparent hover:border-slate-200">
              <div className="size-20 rounded-3xl flex items-center justify-center shadow-lg text-white" style={{ backgroundColor: e.color || 'gray' }}>
                <Sword className="size-10" />
              </div>
              <div className="flex-1">
                 <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{e.title}</h4>
                 <p className="text-xs font-black text-slate-400 uppercase mt-1"><MapPin className="inline size-3 mr-1" /> {e.location || "Base"}</p>
              </div>
              <button onClick={() => onDelete(e.id)} className="size-14 rounded-2xl bg-white text-slate-300 hover:text-rose-500 hover:shadow-xl transition-all flex items-center justify-center">
                 <Trash2 />
              </button>
           </div>
         ))}
         {evs.length === 0 && (
           <div className="py-20 text-center space-y-6">
              <div className="size-32 bg-slate-50 rounded-full flex items-center justify-center mx-auto shadow-inner"><CalendarIcon className="size-16 text-slate-200" /></div>
              <p className="text-xl font-bold text-slate-300 uppercase tracking-widest">No Quests for today</p>
           </div>
         )}
       </div>
    </div>
  );
}
