import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect, useCallback } from "react";
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
  Calendar as CalendarIcon, Target, Sword, Sparkles
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

// Expanded EVENT_COLORS array
const EVENT_COLORS = ["sky", "rose", "amber", "emerald", "violet", "indigo", "cyan", "pink", "orange", "fuchsia", "lime", "teal"];

// --- HASHING UTILITY: Automatically assigns a consistent color to any Quest Title ---
const getQuestColor = (title: string): string => {
  const colors = EVENT_COLORS.map(c => `var(--kid-${c})`); // Use Tailwind CSS var(--kid-color)
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// --- QUEST TEMPLATES FOR FAST SCHEDULING ---
const QUEST_TEMPLATES = [
  { title: "🧹 Clean Room", location: "Bedroom", color: getQuestColor("Clean Room") },
  { title: "📚 Homework", location: "Study", color: getQuestColor("Homework") },
  { title: "🍿 Movie Night", location: "Living Room", color: getQuestColor("Movie Night") },
  { title: "🍽️ Family Dinner", location: "Kitchen", color: getQuestColor("Family Dinner") },
  { title: "🏊 Swim Class", location: "Pool", color: getQuestColor("Swim Class") },
  { title: "🦷 Dentist Visit", location: "Clinic", color: getQuestColor("Dentist Visit") },
  { title: "🎂 Birthday Party", location: "Party Hall", color: getQuestColor("Birthday Party") },
  { title: "🛒 Grocery Run", location: "Supermarket", color: getQuestColor("Grocery Run") },
];

function CalendarPage() {
  const qc = useQueryClient();
  const events = useQuery({ queryKey: ["events"], queryFn: () => listEvents() });
  const members = useQuery({ queryKey: ["members"], queryFn: () => listMembers() });

  const [view, setView] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  
  // Track currently clicked/focused date for dynamic sidebar overview
  const [focusedDate, setFocusedDate] = useState<Date>(() => new Date());

  const [memberFilter, setMemberFilter] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]); 
  const [showAddModal, setShowAddModal] = useState(false);
  const [dayViewDate, setDayViewDate] = useState<Date | null>(null);

  // States to hold template data inside New Quest Form
  const [formTitle, setFormTitle] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formColor, setFormColor] = useState("");

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
    else { start = ymd(fnsStartOfYear(anchor)); end = fnsEndOfYear(anchor) ? ymd(fnsEndOfYear(anchor)) : ymd(anchor); }

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

  // Lock agenda panel to the selected day's quests
  const dailyAgenda = useMemo(() => {
    const dayKey = ymd(focusedDate);
    const dayEvents = byDay.get(dayKey) ?? [];
    return dayEvents.filter((e: any) => !memberFilter || e.member_id === memberFilter);
  }, [byDay, focusedDate, memberFilter]);

  function navigate(dir: -1 | 1) {
    const d = new Date(anchor);
    if (view === "year") d.setFullYear(d.getFullYear() + dir);
    else if (view === "month") d.setMonth(d.getMonth() + dir);
    else if (view === "week") d.setDate(d.getDate() + 7 * dir);
    else d.setDate(d.getDate() + dir);
    setAnchor(startOfDay(d));
    setFocusedDate(startOfDay(d)); // Sync focus on page shift
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

  const handleApplyTemplate = (tpl: typeof QUEST_TEMPLATES[number]) => {
    setFormTitle(tpl.title);
    setFormLocation(tpl.location);
    setFormColor(tpl.color);
    toast.success(`Loaded "${tpl.title.split(" ").slice(1).join(" ")}" template!`);
  };

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
            <button onClick={handleWipeCurrentView} className="flex items-center gap-2 rounded-2xl bg-rose-50 px-6 py-4 text-xs font-black text-rose-600 border-2 border-rose-100 hover:bg-rose-100 transition-all shadow-sm cursor-pointer">
              <Trash2 className="size-4" /> CLEAR {view.toUpperCase()}
            </button>
            <button onClick={() => { setFormTitle(""); setFormLocation(""); setFormColor("indigo"); setShowAddModal(true); }} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-8 py-4 text-sm font-black text-white shadow-xl hover:bg-indigo-600 transition-all cursor-pointer">
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
            <button onClick={() => navigate(-1)} className="p-3 bg-white border-4 border-slate-50 rounded-2xl shadow-sm hover:bg-slate-100 cursor-pointer"><ChevronLeft /></button>
            <button onClick={() => { setAnchor(new Date()); setFocusedDate(new Date()); }} className="px-6 py-3 bg-white border-4 border-slate-50 rounded-2xl shadow-sm font-black text-xs uppercase tracking-widest hover:bg-slate-100 cursor-pointer">Today</button>
            <button onClick={() => navigate(1)} className="p-3 bg-white border-4 border-slate-50 rounded-2xl shadow-sm hover:bg-slate-100 cursor-pointer"><ChevronRight /></button>
          </div>
          <h2 className="text-2xl font-black text-slate-800 uppercase italic ml-2">{headerLabel}</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            {view === "year" && <YearView year={anchor.getFullYear()} byDay={byDay} onPickMonth={(m: any) => { setAnchor(new Date(anchor.getFullYear(), m, 1)); setView("month"); }} />}
            {view === "month" && <MonthView anchor={anchor} byDay={byDay} onPickDay={(d: any) => setDayViewDate(d)} selectedDates={selectedDates} onToggleDate={(k: any) => setSelectedDates(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k])} onSelectDate={(d: Date) => setFocusedDate(d)} memberList={memberList} />}
            {view === "week" && <WeekView anchor={anchor} byDay={byDay} onPickDay={(d: any) => setDayViewDate(d)} onSelectDate={(d: Date) => setFocusedDate(d)} memberList={memberList} />}
            {view === "day" && <DayView day={anchor} byDay={byDay} onDelete={(id: any) => del.mutate(id)} memberList={memberList} />}
          </div>

          <aside className="space-y-8">
             {/* --- DYNAMIC SIDEBAR: Focuses on Selected Date's Quests --- */}
             <section className="bg-white p-8 rounded-[3rem] border-4 border-slate-50 shadow-xl min-h-[500px]">
               <div className="mb-2 flex items-center justify-between">
                 <h3 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2 text-slate-900">
                   <Target className="text-indigo-500" /> Day Overview
                 </h3>
                 <span className="px-3 py-1 bg-slate-100 text-[10px] font-black uppercase rounded-lg text-slate-500 font-mono">
                   {focusedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                 </span>
               </div>
               
               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-6">Quests scheduled for selected date</p>
               
               <div className="space-y-4">
                 {dailyAgenda.length === 0 && (
                   <p className="text-center py-20 text-xs font-black text-slate-300 uppercase tracking-wider">No quests scheduled</p>
                 )}
                 {dailyAgenda.map((e: any) => {
                   const assignedHero = memberList.find((m: any) => m.id === e.member_id);
                   return (
                     <div key={e.id} className="group flex gap-4 items-start relative">
                        <div className="flex-1 bg-slate-50 p-4 rounded-2xl group-hover:bg-slate-100 transition-all border-l-4 relative flex items-center justify-between" style={{ borderLeftColor: e.color || 'gray' }}>
                           <div className="flex items-center gap-3">
                             {/* Hero Assignee Initial Badge */}
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
                           <button onClick={() => del.mutate(e.id)} className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                             <X size={16} />
                           </button>
                        </div>
                     </div>
                   );
                 })}
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
                        <p className="font-black text-2xl uppercase tracking-tighter text-slate-900">{e.title}</p>
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

        {/* NEW QUEST MODAL (Corrected key Starts_at -> dates) */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-md p-4" onClick={() => setShowAddModal(false)}>
             <div className="w-full max-w-xl bg-white rounded-[4rem] p-10 shadow-2xl border-[12px] border-slate-50" onClick={e => e.stopPropagation()}>
               <div className="flex justify-between items-center mb-6">
                 <h2 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900">New Quest</h2>
                 <button onClick={() => setShowAddModal(false)} className="p-3 bg-slate-100 rounded-full hover:text-rose-500 transition-all"><X /></button>
               </div>
               
               {/* Quick-Quest Templates */}
               <div className="mb-6 p-4 bg-slate-50 rounded-3xl border-2 border-slate-100 flex flex-wrap gap-2">
                 {QUEST_TEMPLATES.map((tpl) => (
                   <button 
                     type="button"
                     key={tpl.title}
                     onClick={() => handleApplyTemplate(tpl)}
                     className="px-4 py-2 rounded-xl font-bold uppercase text-[10px] shadow-sm transition-all bg-white hover:scale-105 cursor-pointer text-slate-800 border border-slate-200"
                   >
                     {tpl.title}
                   </button>
                 ))}
               </div>

               <form className="space-y-6" onSubmit={async (e) => {
                  e.preventDefault();
                  const target = e.target as any;
                  const dates = selectedDates.length > 0 ? selectedDates : [ymd(anchor)];
                  await fetch('/api/events', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                      title: (formTitle || target.title.value).trim(),
                      location: (formLocation || target.location.value).trim(),
                      member_id: target.member.value || null,
                      color: formColor || getQuestColor(formTitle || target.title.value), // Auto Consistent Color
                      dates: dates, // FIX: Match backend key "dates" (which is an array)
                    })
                  });
                  toast.success("Quests Logged!");
                  setSelectedDates([]); 
                  setShowAddModal(false); 
                  inv();
               }}>
                  <input name="title" required placeholder="Quest Name" className="w-full p-6 bg-slate-50 rounded-3xl border-4 border-transparent focus:border-indigo-500 outline-none font-black text-xl" value={formTitle} onChange={(e) => { setFormTitle(e.target.value); setFormColor(getQuestColor(e.target.value)); }} />
                  <input name="location" placeholder="Location" className="w-full p-6 bg-slate-50 rounded-3xl border-4 border-transparent focus:border-indigo-500 outline-none font-bold" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} />
                  <div className="grid grid-cols-2 gap-4">
                    <select name="member" className="p-5 bg-slate-50 rounded-3xl font-black uppercase text-xs">
                      <option value="">Whole Family</option>
                      {memberList.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <select name="color" value={formColor} onChange={(e) => setFormColor(e.target.value)} className="p-5 bg-slate-50 rounded-3xl font-black uppercase text-xs disabled:opacity-50" disabled>
                      <option value="">-- Consistent Color Auto-Set --</option>
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

// --- SUB-VIEWS ---

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

function MonthView({ anchor, byDay, onPickDay, onToggleDate, onSelectDate, selectedDates, memberList }: any) {
  const gridStart = startOfMonthGrid(anchor);
  const days = Array.from({ length: 42 }, (_, i) => addDaysL(gridStart, i));
  return (
    <div className="bg-white rounded-[3rem] border-4 border-slate-50 p-2 md:p-6">
      <div className="grid grid-cols-7 gap-1 md:gap-3">
        {days.map(d => {
          const key = ymd(d);
          const evs = byDay.get(key) ?? [];
          const isSelected = selectedDates.includes(key);
          const isToday = key === ymd(new Date());
          return (
            <div
              key={key}
              onClick={() => {
                onToggleDate(key);
                onSelectDate(d); // Locks sidebar focused date on click
              }}
              className={`min-h-[90px] md:min-h-[140px] p-2 md:p-3 rounded-2xl md:rounded-[2rem] border-2 md:border-4 transition-all cursor-pointer flex flex-col ${
                isSelected ? "border-indigo-500 bg-indigo-50 scale-95 shadow-inner" : 
                isToday ? "border-slate-900 bg-slate-50 shadow-sm" : "border-slate-50 bg-white hover:border-slate-200"
              } ${d.getMonth() !== anchor.getMonth() ? "opacity-20" : ""}`}
            >
              <div className="flex justify-between items-center mb-1 md:mb-2">
                <span onClick={(e) => { e.stopPropagation(); onPickDay(d); onSelectDate(d); }} className={`text-[10px] md:text-sm font-black p-1 rounded-lg ${isToday ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>{d.getDate()}</span>
                {isSelected && <Check className="size-3 text-indigo-500" />}
              </div>
              <div className="space-y-0.5 md:space-y-1">
                {evs.slice(0, 3).map((e: any) => {
                  const assignedHero = memberList.find((m: any) => m.id === e.member_id);
                  return (
                    <div 
                      key={e.id} 
                      className="text-[7px] md:text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm text-slate-900 truncate flex items-center justify-between gap-1" 
                      style={{ 
                          backgroundColor: e.color || 'gray',
                          textShadow: '0px 0px 3px rgba(255,255,255,1), 0px 0px 2px rgba(255,255,255,1)' 
                      }}
                    >
                      <span className="truncate">{e.title}</span>
                      {assignedHero && (
                        <div 
                          className="size-2 rounded-full border border-white shrink-0" 
                          style={{ backgroundColor: assignedHero.avatar_color || '#ccc' }}
                        />
                      )}
                    </div>
                  );
                })}
                {evs.length > 3 && <p className="text-[7px] font-black text-slate-300">+{evs.length - 3} more</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ anchor, byDay, onPickDay, onSelectDate, memberList }: any) {
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
                      className="p-4 rounded-2xl bg-slate-50 border-l-4 shadow-sm flex items-center justify-between gap-2" 
                      style={{ borderLeftColor: e.color || 'gray' }}
                   >
                      <p className="font-black text-sm leading-tight text-slate-900 flex-1 truncate">
                          {e.title}
                      </p>
                      {assignedHero && (
                        <div 
                          className="size-4 rounded-full flex items-center justify-center text-[7px] font-black text-white shrink-0 shadow-inner" 
                          style={{ backgroundColor: assignedHero.avatar_color || '#ccc' }}
                        >
                          {assignedHero.name[0].toUpperCase()}
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

function DayView({ day, byDay, onDelete, memberList }: any) {
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
                   <p className="text-xs font-black text-slate-400 uppercase mt-1">{e.location || "Base"}</p>
                </div>
                <button onClick={() => onDelete(e.id)} className="h-16 w-16 rounded-2xl bg-white text-rose-500 shadow-lg flex items-center justify-center hover:scale-110 hover:bg-rose-50 active:scale-95 transition-all">
                   <Trash2 size={24} />
                </button>
             </div>
           );
         })}
       </div>
    </div>
  );
}
