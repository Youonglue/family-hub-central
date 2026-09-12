// src/routes/_authenticated/calendar.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { deleteEvent, listEvents, listMembers } from "@/lib/hub-api";
import { getMe } from "@/lib/auth-client";
import { 
  startOfWeek as fnsStartOfWeek, 
  endOfWeek as fnsEndOfWeek, 
  startOfMonth as fnsStartOfMonth, 
  endOfMonth as fnsEndOfMonth, 
  startOfYear as fnsStartOfYear, 
  endOfYear as fnsEndOfYear 
} from 'date-fns';
import { CalendarPlus, ChevronLeft, ChevronRight, Trash2, Calendar as CalendarIcon, Filter } from "lucide-react";

// Sub-Component Imports
import { YearView } from "@/components/calendar/YearView";
import { MonthView } from "@/components/calendar/MonthView";
import { WeekView } from "@/components/calendar/WeekView";
import { DayView } from "@/components/calendar/DayView";
import { CalendarSidebarOverview } from "@/components/calendar/CalendarSidebarOverview";
import { CalendarSyncWidget } from "@/components/calendar/CalendarSyncWidget";
import { CalendarDayViewModal } from "@/components/calendar/CalendarDayViewModal";
import { CalendarAddQuestModal } from "@/components/calendar/CalendarAddQuestModal";
import { CalendarHeroFilter } from "@/components/calendar/CalendarHeroFilter";
import { CalendarLegendKey } from "@/components/calendar/CalendarLegendKey";

export const Route = createFileRoute("/_authenticated/calendar")({ ssr: false, component: CalendarPage });

type ViewMode = "year" | "month" | "week" | "day";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDaysL = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d: Date) => { const s = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const dow = (s.getDay() + 6) % 7; return addDaysL(s, -dow); };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const CATEGORIES = ["all", "Work", "School", "Sports", "Fun", "Chores", "General"];

function CalendarPage() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const events = useQuery({ queryKey: ["events"], queryFn: () => listEvents() });
  const members = useQuery({ queryKey: ["members"], queryFn: () => listMembers() });

  const [view, setView] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [focusedDate, setFocusedDate] = useState<Date>(() => new Date());

  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [selectedDates, setSelectedDates] = useState<string[]>([]); 
  const [showAddModal, setShowAddModal] = useState(false);
  const [dayViewDate, setDayViewDate] = useState<Date | null>(null);

  // Read active hero from kiosk
  const activeMember = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("kiosk_active_member") || "null");
    } catch {
      return null;
    }
  }, []);

  // SECURITY FIX: Children accounts NEVER have admin privileges!
  const isSystemAdmin = me.data?.role?.toLowerCase() === "admin";
  const isParentCharacter = (activeMember?.is_parent === 1 || activeMember?.is_parent === true || activeMember?.role?.toLowerCase() === "admin") && activeMember?.is_kid !== 1;
  const isAdmin = Boolean(isSystemAdmin && (isParentCharacter || !activeMember));

  const eventList = Array.isArray(events.data) ? events.data : [];
  const memberList = Array.isArray(members.data) ? members.data : [];

  const inv = () => { qc.invalidateQueries({ queryKey: ["events"] }); };

  const del = useMutation({ 
    mutationFn: (id: string) => {
      if (!isAdmin) throw new Error("Only Admins can delete calendar events");
      return deleteEvent({ data: { id } });
    }, 
    onSuccess: () => { toast.success("Quest Removed"); inv(); },
    onError: () => { toast.error("Only Admins can delete calendar events"); }
  });
  
  const wipeViewMutation = useMutation({
    mutationFn: async (range: { start: string, end: string }) => {
      if (!isAdmin) throw new Error("Admin authorization required");
      const res = await fetch(`/api/events/range?start=${range.start}&end=${range.end}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Admin authorization required");
      return res.json();
    },
    onSuccess: () => {
      toast.success(`Cleared all quests for this ${view}`);
      inv();
      setDayViewDate(null);
    },
    onError: () => {
      toast.error("Only Admins can clear calendar views");
    }
  });

  const handleWipeCurrentView = () => {
    if (!isAdmin) {
      toast.error("Only Administrators can clear calendar schedules");
      return;
    }

    let start, end;
    if (view === "day") { start = end = ymd(anchor); }
    else if (view === "week") { start = ymd(fnsStartOfWeek(anchor, { weekStartsOn: 1 })); end = ymd(fnsEndOfWeek(anchor, { weekStartsOn: 1 })); }
    else if (view === "month") { start = ymd(fnsStartOfMonth(anchor)); end = ymd(fnsEndOfMonth(anchor)); }
    else { start = ymd(fnsStartOfYear(anchor)); end = fnsEndOfYear(anchor) ? ymd(fnsEndOfYear(anchor)) : ymd(anchor); }

    if (window.confirm(`Wipe ALL quests for this ${view} (${start} to ${end})?`)) {
      wipeViewMutation.mutate({ start, end });
    }
  };

  const filteredEvents = useMemo(() => {
    return eventList.filter((e: any) => {
      const matchesHero = !selectedHeroId || e.member_id === selectedHeroId;
      const matchesCategory = selectedCategory === "all" || e.category?.toLowerCase() === selectedCategory.toLowerCase();
      return matchesHero && matchesCategory;
    });
  }, [eventList, selectedHeroId, selectedCategory]);

  const byDay = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const e of filteredEvents) {
      const key = e.starts_at; 
      const arr = m.get(key) ?? [];
      arr.push(e); m.set(key, arr);
    }
    return m;
  }, [filteredEvents]);

  const activeRecurringRoutines = useMemo(() => {
    const map = new Map<string, any>();
    for (const e of eventList) {
      if (e.is_recurring === 1 || e.tile_color) {
        const color = (e.tile_color || e.color || "#6366f1").toLowerCase();
        if (!map.has(color)) {
          map.set(color, {
            title: e.title,
            color: color,
            category: e.category,
            memberId: e.member_id
          });
        }
      }
    }
    return Array.from(map.values());
  }, [eventList]);

  const dailyAgenda = useMemo(() => {
    const dayKey = ymd(focusedDate);
    return byDay.get(dayKey) ?? [];
  }, [byDay, focusedDate]);

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
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 space-y-4 sm:space-y-5 animate-in fade-in duration-300 safe-area-inset-bottom">
        
        {/* HEADER */}
        <header className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-slate-100">
          <div className="flex items-center gap-3">
             <div className="p-2 sm:p-2.5 bg-indigo-100 rounded-2xl shadow-inner text-indigo-600">
               <CalendarIcon className="size-6 sm:size-7" />
             </div>
             <div>
               <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase italic">
                 Family Quests
               </h1>
               <p className="text-slate-400 font-bold uppercase text-[9px] sm:text-[10px] tracking-widest">
                 Routines & Adventure Schedule
               </p>
             </div>
          </div>
          
          {/* Action Buttons: Strictly Admin / Parent Only */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button 
                onClick={handleWipeCurrentView} 
                className="flex items-center gap-1.5 rounded-2xl bg-rose-50 px-3.5 py-2.5 text-xs font-black text-rose-600 border border-rose-200 hover:bg-rose-100 active:scale-95 transition-all cursor-pointer min-h-[40px]"
              >
                <Trash2 className="size-3.5" /> CLEAR {view.toUpperCase()}
              </button>
              
              <button 
                onClick={() => setShowAddModal(true)} 
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-xs sm:text-sm font-black text-white shadow-lg hover:bg-indigo-600 active:scale-95 transition-all cursor-pointer min-h-[40px]"
              >
                <CalendarPlus className="size-4" /> NEW QUEST
              </button>
            </div>
          )}
        </header>

        {/* HERO FILTER BAR (Kids can browse freely) */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl border-2 border-slate-50 shadow-xs space-y-2.5">
          <CalendarHeroFilter
            memberList={memberList}
            selectedMemberId={selectedHeroId}
            onSelectMember={setSelectedHeroId}
          />

          <div className="border-t border-slate-100 pt-2.5 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {(["year", "month", "week", "day"] as ViewMode[]).map((v) => (
                <button 
                  key={v} 
                  onClick={() => setView(v)} 
                  className={`rounded-lg px-3.5 sm:px-4 py-1.5 text-xs font-black uppercase transition-all min-h-[34px] cursor-pointer ${
                    view === v ? "bg-slate-900 text-white shadow-xs" : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button 
                onClick={() => navigate(-1)} 
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center active:scale-95"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={() => { setAnchor(new Date()); setFocusedDate(new Date()); }} 
                className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-slate-100 cursor-pointer min-h-[36px] active:scale-95"
              >
                Today
              </button>
              <button 
                onClick={() => navigate(1)} 
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center active:scale-95"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1 shrink-0 mr-1">
              <Filter size={10} className="text-indigo-500" /> Category:
            </span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap min-h-[30px] shrink-0 active:scale-95 ${
                  selectedCategory === cat
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100"
                }`}
              >
                {cat === "all" ? "🌟 All" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* VISUAL RECURRING ROUTINES LEGEND KEY */}
        <CalendarLegendKey
          recurringRoutines={activeRecurringRoutines}
          memberList={memberList}
        />

        <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase italic leading-none pt-0.5">
          {headerLabel} {selectedHeroId ? `• Filtered Hero View` : ""}
        </h2>

        {/* CALENDAR VIEWS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-8 xl:col-span-9">
            {view === "year" && (
              <YearView 
                year={anchor.getFullYear()} 
                byDay={byDay} 
                onPickMonth={(m: any) => { setAnchor(new Date(anchor.getFullYear(), m, 1)); setView("month"); }} 
              />
            )}
            {view === "month" && (
              <MonthView 
                anchor={anchor} 
                byDay={byDay} 
                onPickDay={(d: any) => setDayViewDate(d)} 
                selectedDates={selectedDates} 
                onToggleDate={(k: any) => setSelectedDates(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k])} 
                onSelectDate={(d: Date) => setFocusedDate(d)} 
                memberList={memberList}
                selectedHeroId={selectedHeroId}
              />
            )}
            {view === "week" && (
              <WeekView 
                anchor={anchor} 
                byDay={byDay} 
                onPickDay={(d: any) => setDayViewDate(d)} 
                onSelectDate={(d: Date) => setFocusedDate(d)} 
                memberList={memberList} 
              />
            )}
            {view === "day" && (
              <DayView 
                day={anchor} 
                byDay={byDay} 
                onDelete={(id: any) => del.mutate(id)} 
                memberList={memberList} 
                isAdmin={isAdmin}
              />
            )}
          </div>

          <aside className="lg:col-span-4 xl:col-span-3 space-y-4">
             <CalendarSidebarOverview
               focusedDate={focusedDate}
               dailyAgenda={dailyAgenda}
               memberList={memberList}
               onDelete={(id: string) => del.mutate(id)}
               isAdmin={isAdmin}
             />

             <CalendarSyncWidget />
          </aside>
        </div>

        {/* DAY DETAIL MODAL (Delete button strictly hidden if non-admin) */}
        {dayViewDate && (
          <CalendarDayViewModal
            dayViewDate={dayViewDate}
            byDay={byDay}
            onClose={() => setDayViewDate(null)}
            onDelete={(id: string) => del.mutate(id)}
            isAdmin={isAdmin}
          />
        )}

        {/* ADD QUEST MODAL (Admin / Parent Only) */}
        {showAddModal && isAdmin && (
          <CalendarAddQuestModal
            anchor={anchor}
            selectedDates={selectedDates}
            memberList={memberList}
            existingRoutines={activeRecurringRoutines}
            onClose={() => setShowAddModal(false)}
            onRefresh={inv}
            onClearSelectedDates={() => setSelectedDates([])}
          />
        )}
      </div>
    </AppShell>
  );
}
