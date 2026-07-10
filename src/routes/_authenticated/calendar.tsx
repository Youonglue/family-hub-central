import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { deleteEvent, listEvents, listMembers } from "@/lib/hub-api";
import { holidayMapForYears } from "@/lib/uk-holidays";
import { 
  format, 
  startOfWeek as fnsStartOfWeek, 
  endOfWeek as fnsEndOfWeek, 
  startOfMonth as fnsStartOfMonth, 
  endOfMonth as fnsEndOfMonth, 
  startOfYear as fnsStartOfYear, 
  endOfYear as fnsEndOfYear 
} from 'date-fns';
import { 
  CalendarPlus, ChevronLeft, ChevronRight, MapPin, Trash2, X, Users, Check, 
  Calendar as CalendarIcon, Target, Sword 
} from "lucide-react";

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

  const eventList = Array.isArray(events.data) ? events.data : [];
  const memberList = Array.isArray(members.data) ? members.data : [];

  const inv = () => { qc.invalidateQueries({ queryKey: ["events"] }); };

  // --- DELETE LOGIC ---
  const del = useMutation({ 
    mutationFn: (id: string) => deleteEvent({ data: { id } }), 
    onSuccess: () => { toast.success("Quest Removed"); inv(); } 
  });
  
  const wipeViewMutation = useMutation({
    mutationFn: async (range: { start: string, end: string }) => {
      const res = await fetch(`/api/calendar/range?start=${range.start}&end=${range.end}`, { method: 'DELETE' });
      return res.json();
    },
    onSuccess: () => {
      toast.success(`Cleared all quests for this ${view}`);
      inv();
      setDayViewDate(null);
    }
  });

  const handleWipeCurrentView = () => {
    let start, end;
    if (view === "day") { start = end = ymd(anchor); }
    else if (view === "week") { start = ymd(fnsStartOfWeek(anchor, { weekStartsOn: 1 })); end = ymd(fnsEndOfWeek(anchor, { weekStartsOn: 1 })); }
    else if (view === "month") { start = ymd(fnsStartOfMonth(anchor)); end = ymd(fnsEndOfMonth(anchor)); }
    else { start = ymd(fnsStartOfYear(anchor)); end = ymd(fnsEndOfYear(anchor)); }

    if (window.confirm(`Wipe ALL quests for this ${view} (${start} to ${end})?`)) {
      wipeViewMutation.mutate({ start, end });
    }
  };

  const byDay = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const e of eventList) {
      const key = e.starts_at; 
      const arr = m.get(key) ?? [];
      arr.push(e); m.set(key, arr);
    }
    return m;
  }, [eventList]);

  const filteredEvents = useMemo(() => {
    return eventList.filter((e: any) => !memberFilter || e.member_id === memberFilter);
  }, [eventList, memberFilter]);

  const monthAgenda = useMemo(() => {
    return filteredEvents.filter((e: any) => {
      const d = new Date(e.starts_at);
      return d.getMonth() === anchor.getMonth() && d.getFullYear() === anchor.getFullYear();
    }).sort((a: any, b: any) => a.starts_at.localeCompare(b.starts_at));
  }, [filteredEvents, anchor]);

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
             <div className="p-3 bg-indigo-100 rounded-2xl shadow-inner">
               <CalendarIcon className="size-8 text-indigo-600" />
             </div>
             <div>
               <h1 className="font-display text-4xl font-black tracking-tight text-slate-900 uppercase italic">Family Quests</h1>
               <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest italic">Adventure Log</p>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={handleWipeCurrentView} className="flex items-center gap-2 rounded-2xl bg-rose-50 px-6 py-4 text-xs font-black text-rose-600 border-2 border-rose-100 hover:bg-rose-100 transition-all shadow-sm">
              <Trash2 className="size-4" /> CLEAR {view.toUpperCase()}
            </button>
            <button onClick={() => setShowAddModal(true)} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-8 py-4 text-sm font-black text-white shadow-xl hover:bg-indigo-600 transition-all">
              <CalendarPlus className="size-5" /> NEW QUEST
            </button>
          </div>
        </header>

        {/* TOOLBAR */}
        <div className="mb-8 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl border-4 border-slate-50 shadow-sm">
            {(["year", "month", "week", "day"] as ViewMode[]).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`rounded-xl px-5 py-2 text-xs font-black uppercase transition-all ${view === v ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"}`}>
                {v}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-3 bg-white border-4 border-slate-50 rounded-2xl shadow-sm hover:bg-slate-100"><ChevronLeft /></button>
            <button onClick={() => setAnchor(new Date())} className="px-6 py-3 bg-white border-4 border-slate-50 rounded-2xl shadow-sm font-black text-xs uppercase tracking-widest hover:bg-slate-100">Today</button>
            <button onClick={() => navigate(1)} className="p-3 bg-white border-4 border-slate-50 rounded-2xl shadow-sm hover:bg-slate-100"><ChevronRight /></button>
          </div>
          <h2 className="text-2xl font-black text-slate-800 uppercase italic ml-2">{headerLabel}</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            {view === "year" && <YearView year={anchor.getFullYear()} byDay={byDay} onPickMonth={(m: any) => { setAnchor(new Date(anchor.getFullYear(), m, 1)); setView("month"); }} />}
            {view === "month" && <MonthView anchor={anchor} byDay={byDay} onPickDay={(d: any) => setDayViewDate(d)} selectedDates={selectedDates} onToggleDate={(k: any) => setSelectedDates(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k])} />}
            {view === "week" && <WeekView anchor={anchor} byDay={byDay} onPickDay={(d: any) => setDayViewDate(d)} />}
            {view === "day" && <DayView day={anchor} byDay={byDay} onDelete={(id: any) => del.mutate(id)} />}
          </div>

          <aside className="space-y-8">
             <section className="bg-white p-8 rounded-[3rem] border-4 border-slate-50 shadow-xl min-h-[500px]">
               <h3 className="text-xl font-black uppercase italic tracking-tighter mb-6 flex items-center gap-2 text-slate-900">
                 <CalendarIcon className="text-indigo-500" /> Agenda
               </h3>
               <div className="space-y-4">
                 {monthAgenda.map((e: any) => (
                   <div key={e.id} className="group flex gap-4 items-start relative">
                      <div className="text-center min-w-[40px]">
                         <p className="text-[10px] font-black text-slate-400 uppercase">{new Date(e.starts_at).toLocaleDateString(undefined, { weekday: 'short' })}</p>
                         <p className="text-2xl font-black text-slate-900 leading-none">{new Date(e.starts_at).getDate()}</p>
                      </div>
                      <div className="flex-1 bg-slate-50 p-4 rounded-2xl group-hover:bg-slate-100 transition-all border-l-4 relative" style={{ borderColor: e.color || 'gray' }}>
                         {/* FIX: High Contrast Text with Shadow */}
                         <p className="font-black text-sm text-slate-900 leading-tight drop-shadow-[0_1px_1px_rgba(255,255,255,1)]">
                           {e.title}
                         </p>
                         <button onClick={() => del.mutate(e.id)} className="absolute right-2 top-2 p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                           <X size={16} />
                         </button>
                      </div>
                   </div>
                 ))}
               </div>
             </section>
          </aside>
        </div>

        {/* DAY VIEW / MOBILE DELETE MODAL */}
        {dayViewDate && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setDayViewDate(null)}>
            <div className="w-full max-w-2xl bg-white rounded-[3rem] p-8 shadow-2xl border-[12px] border-slate-50" onClick={e => e.stopPropagation()}>
               <div className="flex justify-between items-center mb-6">
                 <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">{dayViewDate.toLocaleDateString()}</h2>
                 <button onClick={() => setDayViewDate(null)} className="p-3 bg-slate-100 rounded-full hover:text-rose-500 transition-all"><X /></button>
               </div>
               <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                 {(byDay.get(ymd(dayViewDate)) ?? []).map((e: any) => (
                   <div key={e.id} className="bg-slate-50 p-6 rounded-[2rem] flex items-center justify-between border-2 border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{backgroundColor: e.color || 'gray'}}><Sword /></div>
                        <p className="font-black text-2xl uppercase tracking-tighter text-slate-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]">{e.title}</p>
                      </div>
                      <button onClick={() => { del.mutate(e.id); setDayViewDate(null); }} className="h-20 w-20 bg-white text-rose-500 rounded-2xl border-4 border-rose-50 flex items-center justify-center shadow-lg active:scale-90 transition-all">
                        <Trash2 size={32} />
                      </button>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        )}

        {/* NEW QUEST MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-900/60 backdrop-blur-md p-4" onClick={() => setShowAddModal(false)}>
             <div className="w-full max-w-xl bg-white rounded-[4rem] p-10 shadow-2xl border-[12px] border-slate-50 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
               <h2 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 mb-8">New Quest</h2>
               <form className="space-y-6" onSubmit={async (e) => {
                  e.preventDefault();
                  const target = e.target as any;
                  const dates = selectedDates.length > 0 ? selectedDates : [ymd(anchor)];
                  await fetch('/api/calendar', {
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
                  toast.success("Quests Logged!");
                  setSelectedDates([]); setShowAddModal(false); inv();
               }}>
                  <input name="title" required placeholder="Quest Name" className="w-full p-6 bg-slate-50 rounded-3xl border-4 border-transparent focus:border-indigo-500 outline-none font-black text-xl" />
                  <input name="location" placeholder="Location" className="w-full p-6 bg-slate-50 rounded-3xl border-4 border-transparent focus:border-indigo-500 outline-none font-bold" />
                  <div className="grid grid-cols-2 gap-4">
                    <select name="member" className="p-5 bg-slate-50 rounded-3xl font-black uppercase text-xs">
                      <option value="">Whole Family</option>
                      {memberList.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <select name="color" className="p-5 bg-slate-50 rounded-3xl font-black uppercase text-xs">
                      {EVENT_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black text-2xl shadow-2xl hover:bg-indigo-600 transition-all active:scale-95 flex items-center justify-center gap-3">
                    <Check size={32} /> LOG QUESTS
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
// SUB-VIEWS (Styled for Quests)
// ────────────────────────────────────────────────────────────────────────────

function YearView({ year, byDay, onPickMonth }: any) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {MONTHS.map((name, mi) => {
        const gridStart = startOfMonthGrid(new Date(year, mi, 1));
        const days = Array.from({ length: 42 }, (_, i) => addDaysL(gridStart, i));
        return (
          <button key={mi} onClick={() => onPickMonth(mi)} className="rounded-[2.5rem] border-4 border-slate-50 bg-white p-6 text-left shadow-lg hover:shadow-2xl transition-all group">
            <p className="mb-4 font-black text-xl uppercase italic tracking-tighter group-hover:text-indigo-600 transition-colors">{name}</p>
            <div className="grid grid-cols-7 gap-1 text-[9px] font-black text-slate-300">
              {days.map(d => {
                const hasEv = (byDay.get(ymd(d)) ?? []).length > 0;
                return (
                  <div key={ymd(d)} className={`aspect-square grid place-items-center relative ${d.getMonth() === mi ? "text-slate-900" : "text-slate-100"}`}>
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

function MonthView({ anchor, byDay, onPickDay, onToggleDate, selectedDates }: any) {
  const gridStart = startOfMonthGrid(anchor);
  const days = Array.from({ length: 42 }, (_, i) => addDaysL(gridStart, i));
  return (
    <div className="bg-white rounded-[3rem] border-4 border-slate-50 shadow-xl p-2 md:p-6">
      <div className="grid grid-cols-7 gap-1 md:gap-3">
        {days.map((d) => {
          const key = ymd(d);
          const evs = byDay.get(key) ?? [];
          const isSelected = selectedDates.includes(key);
          const isToday = key === ymd(new Date());
          return (
            <div
              key={key}
              onClick={() => onToggleDate(key)}
              className={`min-h-[90px] md:min-h-[140px] p-2 md:p-3 rounded-2xl md:rounded-[2rem] border-2 md:border-4 transition-all cursor-pointer flex flex-col ${
                isSelected ? "border-indigo-500 bg-indigo-50 scale-95 shadow-inner" : 
                isToday ? "border-slate-900 bg-slate-50 shadow-sm" : "border-slate-50 bg-white hover:border-slate-200"
              } ${d.getMonth() !== anchor.getMonth() ? "opacity-20" : ""}`}
            >
              <div className="flex justify-between items-center mb-1 md:mb-2">
                <span onClick={(e) => { e.stopPropagation(); onPickDay(d); }} className={`text-[10px] md:text-sm font-black p-1 rounded-lg hover:underline ${isToday ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>{d.getDate()}</span>
                {isSelected && <Check className="size-3 text-indigo-500" />}
              </div>
              <div className="space-y-0.5 md:space-y-1">
                {evs.slice(0, 3).map((e: any) => (
                  <div 
                    key={e.id} 
                    className="text-[7px] md:text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm text-slate-900 truncate" 
                    style={{ 
                        backgroundColor: e.color || 'gray',
                        /* FIX: Thick white glow behind text for visibility */
                        textShadow: '0px 0px 3px rgba(255,255,255,1), 0px 0px 2px rgba(255,255,255,1)' 
                    }}
                  >
                    {e.title}
                  </div>
                ))}
                {evs.length > 3 && <p className="text-[7px] font-black text-slate-300">+{evs.length - 3} more</p>}
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
          <div key={key} className="bg-white rounded-[2.5rem] border-4 border-slate-50 p-6 min-h-[400px] shadow-lg cursor-pointer hover:border-slate-200 transition-all group" onClick={() => onPickDay(d)}>
             <p className="text-3xl font-black mb-6 text-slate-900 group-hover:text-indigo-600 transition-colors">{d.getDate()}</p>
             <div className="space-y-3">
               {evs.map((e: any) => (
                 <div 
                    key={e.id} 
                    className="p-4 rounded-2xl bg-slate-50 border-l-8 shadow-sm" 
                    style={{ borderLeftColor: e.color || 'gray' }}
                 >
                    {/* FIX: Bold dark text */}
                    <p className="font-black text-sm leading-tight text-slate-900 drop-shadow-[0_1px_1px_rgba(255,255,255,1)]">
                        {e.title}
                    </p>
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
    <div className="bg-white rounded-[4rem] border-8 border-slate-50 p-10 shadow-2xl min-h-[600px] animate-in slide-in-from-bottom-5">
       <h2 className="text-5xl font-black uppercase italic tracking-tighter text-slate-900 mb-10">Daily Log</h2>
       <div className="grid gap-6">
         {evs.map((e: any) => (
           <div key={e.id} className="flex items-center gap-6 p-6 bg-slate-50 rounded-[2.5rem] border-2 border-transparent hover:border-indigo-100 transition-all shadow-sm">
              <div className="size-20 rounded-3xl flex items-center justify-center shadow-lg text-white" style={{ backgroundColor: e.color || 'gray' }}>
                <Sword size={40} />
              </div>
              <div className="flex-1">
                 <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]">{e.title}</h4>
                 <p className="text-xs font-black text-slate-400 uppercase mt-1">{e.location || "Base"}</p>
              </div>
              <button onClick={() => onDelete(e.id)} className="h-16 w-16 rounded-2xl bg-white text-rose-500 shadow-lg flex items-center justify-center hover:scale-110 hover:bg-rose-50 active:scale-95 transition-all">
                 <Trash2 size={24} />
              </button>
           </div>
         ))}
       </div>
    </div>
  );
}
