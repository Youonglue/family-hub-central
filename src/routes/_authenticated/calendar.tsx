import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { deleteEvent, listEvents, listMembers } from "@/lib/hub-api";
import { 
  startOfWeek as fnsStartOfWeek, 
  endOfWeek as fnsEndOfWeek, 
  startOfMonth as fnsStartOfMonth, 
  endOfMonth as fnsEndOfMonth, 
  startOfYear as fnsStartOfYear, 
  endOfYear as fnsEndOfYear 
} from 'date-fns';
import { CalendarPlus, ChevronLeft, ChevronRight, Trash2, Calendar as CalendarIcon, Filter } from "lucide-react";

// Sub-Component Imports (Compartmentalized)
import { YearView } from "@/components/calendar/YearView";
import { MonthView } from "@/components/calendar/MonthView";
import { WeekView } from "@/components/calendar/WeekView";
import { DayView } from "@/components/calendar/DayView";
import { CalendarSidebarOverview } from "@/components/calendar/CalendarSidebarOverview";
import { CalendarSyncWidget } from "@/components/calendar/CalendarSyncWidget";
import { CalendarDayViewModal } from "@/components/calendar/CalendarDayViewModal";
import { CalendarAddQuestModal } from "@/components/calendar/CalendarAddQuestModal";

export const Route = createFileRoute("/_authenticated/calendar")({ ssr: false, component: CalendarPage });

type ViewMode = "year" | "month" | "week" | "day";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDaysL = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d: Date) => { const s = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const dow = (s.getDay() + 6) % 7; return addDaysL(s, -dow); };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Added "Work" category to the main list
const CATEGORIES = ["all", "School", "Sports", "Fun", "Chores", "Work", "General"];

function CalendarPage() {
  const qc = useQueryClient();
  const events = useQuery({ queryKey: ["events"], queryFn: () => listEvents() });
  const members = useQuery({ queryKey: ["members"], queryFn: () => listMembers() });

  const [view, setView] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [focusedDate, setFocusedDate] = useState<Date>(() => new Date());

  const [memberFilter, setMemberFilter] = useState<string | null>(null);
  
  // Active Category Filter State
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [selectedDates, setSelectedDates] = useState<string[]>([]); 
  const [showAddModal, setShowAddModal] = useState(false);
  const [dayViewDate, setDayViewDate] = useState<Date | null>(null);

  const eventList = Array.isArray(events.data) ? events.data : [];
  const memberList = Array.isArray(members.data) ? members.data : [];

  const inv = () => { qc.invalidateQueries({ queryKey: ["events"] }); };

  // --- MUTATIONS ---
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

  // --- FILTERED EVENTS & AGENDA MUTATIONS ---
  const filteredEvents = useMemo(() => {
    return eventList.filter((e: any) => {
      const matchesMember = !memberFilter || e.member_id === memberFilter;
      const matchesCategory = selectedCategory === "all" || e.category?.toLowerCase() === selectedCategory.toLowerCase();
      return matchesMember && matchesCategory;
    });
  }, [eventList, memberFilter, selectedCategory]);

  const byDay = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const e of filteredEvents) {
      const key = e.starts_at; 
      const arr = m.get(key) ?? [];
      arr.push(e); m.set(key, arr);
    }
    return m;
  }, [filteredEvents]);

  // Lock agenda panel to the selected day's quests (correlates Category)
  const dailyAgenda = useMemo(() => {
    const dayKey = ymd(focusedDate);
    return byDay.get(dayKey) ?? [];
  }, [byDay, focusedDate]);

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
    setFocusedDate(startOfDay(d));
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
      <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-8 space-y-6">
        
        {/* HEADER */}
        <header className="flex flex-wrap items-center justify-between gap-4">
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
            <button onClick={() => setShowAddModal(true)} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-8 py-4 text-sm font-black text-white shadow-xl hover:bg-indigo-600 transition-all cursor-pointer">
              <CalendarPlus className="size-5" /> NEW QUEST
            </button>
          </div>
        </header>

        {/* TOOLBAR & DYNAMIC CATEGORY FILTERS */}
        <div className="flex flex-col gap-4 bg-white p-4 rounded-3xl border-4 border-slate-50 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl">
              {(["year", "month", "week", "day"] as ViewMode[]).map((v) => (
                <button key={v} onClick={() => setView(v)} className={`rounded-xl px-5 py-2 text-xs font-black uppercase transition-all ${view === v ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:text-slate-600"}`}>
                  {v}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate(-1)} className="p-3 bg-slate-50 rounded-2xl shadow-sm hover:bg-slate-100 cursor-pointer"><ChevronLeft /></button>
              <button onClick={() => { setAnchor(new Date()); setFocusedDate(new Date()); }} className="px-6 py-3 bg-slate-50 rounded-2xl shadow-sm font-black text-xs uppercase tracking-widest hover:bg-slate-100 cursor-pointer">Today</button>
              <button onClick={() => navigate(1)} className="p-3 bg-slate-50 rounded-2xl shadow-sm hover:bg-slate-100 cursor-pointer"><ChevronRight /></button>
            </div>
          </div>

          <div className="border-t border-slate-100/60 my-1" />

          {/* Swipe-Optimized Categories Bar */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2 shrink-0">
              <Filter size={12} className="text-indigo-500" /> Filter:
            </div>
            <div className="flex items-center gap-2 overflow-x-auto py-1 shrink-0 max-w-full scrollbar-thin scroll-smooth pr-6">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap min-h-[44px] ${
                    selectedCategory === cat
                      ? "bg-indigo-600 text-white shadow-md scale-102"
                      : "bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100"
                  }`}
                >
                  {cat === "all" ? "🌟 Show All" : cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <h2 className="text-3xl font-black text-slate-800 uppercase italic leading-none pt-2">{headerLabel}</h2>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            {view === "year" && <YearView year={anchor.getFullYear()} byDay={byDay} onPickMonth={(m: any) => { setAnchor(new Date(anchor.getFullYear(), m, 1)); setView("month"); }} />}
            {view === "month" && <MonthView anchor={anchor} byDay={byDay} onPickDay={(d: any) => setDayViewDate(d)} selectedDates={selectedDates} onToggleDate={(k: any) => setSelectedDates(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k])} onSelectDate={(d: Date) => setFocusedDate(d)} memberList={memberList} />}
            {view === "week" && <WeekView anchor={anchor} byDay={byDay} onPickDay={(d: any) => setDayViewDate(d)} onSelectDate={(d: Date) => setFocusedDate(d)} memberList={memberList} />}
            {view === "day" && <DayView day={anchor} byDay={byDay} onDelete={(id: any) => del.mutate(id)} memberList={memberList} />}
          </div>

          <aside className="space-y-8">
             <CalendarSidebarOverview
               focusedDate={focusedDate}
               dailyAgenda={dailyAgenda}
               memberList={memberList}
               onDelete={(id) => del.mutate(id)}
             />

             <CalendarSyncWidget />
          </aside>
        </div>

        {/* DAY VIEW / MOBILE DELETE OVERLAY */}
        {dayViewDate && (
          <CalendarDayViewModal
            dayViewDate={dayViewDate}
            byDay={byDay}
            onClose={() => setDayViewDate(null)}
            onDelete={(id) => del.mutate(id)}
          />
        )}

        {/* NEW QUEST TEMPLATE MODAL */}
        {showAddModal && (
          <CalendarAddQuestModal
            anchor={anchor}
            selectedDates={selectedDates}
            memberList={memberList}
            onClose={() => setShowAddModal(false)}
            onRefresh={inv}
            onClearSelectedDates={() => setSelectedDates([])}
          />
        )}
      </div>
    </AppShell>
  );
}
