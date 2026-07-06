import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell, KID_COLORS, kidStyle } from "@/components/AppShell";
import { addEvent, deleteEvent, listEvents, listMembers } from "@/lib/hub-api";
import { holidayMapForYears } from "@/lib/uk-holidays";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Trash2,
  X,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/calendar")({
  ssr: false,
  component: CalendarPage,
});

// ────────────────────────────────────────────────────────────────────────────
// Types & helpers
// ────────────────────────────────────────────────────────────────────────────
type ViewMode = "year" | "month" | "week" | "day";

type Member = { id: string; name: string; avatar_color: string };
type Event = {
  id: string;
  title: string;
  starts_at: string;
  location: string | null;
  color: string;
  member_id: string | null;
  family_members: { name: string; avatar_color: string } | null;
};

const DAY = 86_400_000;
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDaysL = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
// Monday-first week start
const startOfWeek = (d: Date) => {
  const s = startOfDay(d);
  const dow = (s.getDay() + 6) % 7; // Mon=0..Sun=6
  return addDaysL(s, -dow);
};
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfMonthGrid = (d: Date) => startOfWeek(startOfMonth(d));

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toLocalInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ────────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────────
function CalendarPage() {
  const qc = useQueryClient();
  const events = useQuery({ queryKey: ["events"], queryFn: () => listEvents() });
  const members = useQuery({ queryKey: ["members"], queryFn: () => listMembers() });

  const [view, setView] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addDate, setAddDate] = useState<Date | null>(null);
  const [memberFilter, setMemberFilter] = useState<string>(""); // "" = everyone

  const eventList = (events.data ?? []) as Event[];
  const memberList = (members.data ?? []) as Member[];

  // Map member_id -> color (fallback to event.color).
  const memberColor = useMemo(() => {
    const m = new Map<string, string>();
    for (const mem of memberList) m.set(mem.id, mem.avatar_color);
    return m;
  }, [memberList]);

  // Group events by YYYY-MM-DD for fast lookup, sorted by time within a day.
  const byDay = useMemo(() => {
    const m = new Map<string, Event[]>();
    for (const e of eventList) {
      if (memberFilter && e.member_id !== memberFilter) continue;
      const key = ymd(new Date(e.starts_at));
      const arr = m.get(key) ?? [];
      arr.push(e);
      m.set(key, arr);
    }
    for (const arr of m.values())
      arr.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    return m;
  }, [eventList, memberFilter]);

  // Holidays for anchor year and a small buffer.
  const holidays = useMemo(() => {
    const y = anchor.getFullYear();
    return holidayMapForYears([y - 1, y, y + 1]);
  }, [anchor]);

  const inv = () => {
    qc.invalidateQueries({ queryKey: ["events"] });
    qc.invalidateQueries({ queryKey: ["events-upcoming"] });
  };

  const del = useMutation({
    mutationFn: (id: string) => deleteEvent({ data: { id } }),
    onSuccess: inv,
  });

  // Header title changes with the view.
  const headerLabel = useMemo(() => {
    if (view === "year") return String(anchor.getFullYear());
    if (view === "month") return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
    if (view === "week") {
      const s = startOfWeek(anchor);
      const e = addDaysL(s, 6);
      const sameMonth = s.getMonth() === e.getMonth();
      return sameMonth
        ? `${s.getDate()}–${e.getDate()} ${MONTHS[s.getMonth()]} ${s.getFullYear()}`
        : `${s.getDate()} ${MONTHS[s.getMonth()].slice(0, 3)} – ${e.getDate()} ${MONTHS[e.getMonth()].slice(0, 3)} ${e.getFullYear()}`;
    }
    return anchor.toLocaleDateString(undefined, {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  }, [anchor, view]);

  function navigate(dir: -1 | 1) {
    const d = new Date(anchor);
    if (view === "year") d.setFullYear(d.getFullYear() + dir);
    else if (view === "month") d.setMonth(d.getMonth() + dir);
    else if (view === "week") d.setDate(d.getDate() + 7 * dir);
    else d.setDate(d.getDate() + dir);
    setAnchor(startOfDay(d));
  }

  function openAdd(day?: Date) {
    const d = day ?? new Date();
    d.setHours(new Date().getHours() + 1, 0, 0, 0);
    setAddDate(d);
    setShowAdd(true);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        {/* Header */}
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Family diary</p>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Calendar</h1>
          </div>
          <button
            onClick={() => openAdd(selectedDay ?? new Date())}
            className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background"
          >
            <CalendarPlus className="size-4" /> New event
          </button>
        </header>

        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-border bg-panel p-1">
            {(["year", "month", "week", "day"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  view === v ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => navigate(-1)} className="rounded-xl border border-border bg-panel p-2" aria-label="Previous">
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => setAnchor(startOfDay(new Date()))}
              className="rounded-xl border border-border bg-panel px-3 py-2 text-xs font-semibold"
            >
              Today
            </button>
            <button onClick={() => navigate(1)} className="rounded-xl border border-border bg-panel p-2" aria-label="Next">
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <select
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
              className="rounded-xl border border-border bg-panel px-3 py-2 text-xs font-semibold"
            >
              <option value="">Everyone</option>
              {memberList.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <h2 className="w-full font-display text-xl font-bold md:w-auto md:pl-2">{headerLabel}</h2>
        </div>

        {/* Member color legend */}
        {memberList.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono uppercase tracking-[0.2em] text-muted-foreground">Legend</span>
            {memberList.map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold"
                style={kidStyle(m.avatar_color)}
              >
                <span className="size-2 rounded-full" style={{ background: `var(--kid-${m.avatar_color})` }} />
                {m.name}
              </span>
            ))}
          </div>
        )}

        {/* View */}
        {view === "year" && (
          <YearView
            year={anchor.getFullYear()}
            byDay={byDay}
            holidays={holidays}
            onPickMonth={(m) => { setAnchor(new Date(anchor.getFullYear(), m, 1)); setView("month"); }}
          />
        )}
        {view === "month" && (
          <MonthView
            anchor={anchor}
            byDay={byDay}
            holidays={holidays}
            memberColor={memberColor}
            onPickDay={(d) => { setSelectedDay(d); setView("day"); setAnchor(d); }}
            onAdd={openAdd}
          />
        )}
        {view === "week" && (
          <WeekView
            anchor={anchor}
            byDay={byDay}
            holidays={holidays}
            memberColor={memberColor}
            onPickDay={(d) => { setSelectedDay(d); setView("day"); setAnchor(d); }}
            onAdd={openAdd}
          />
        )}
        {view === "day" && (
          <DayView
            day={anchor}
            byDay={byDay}
            holidays={holidays}
            memberColor={memberColor}
            onDelete={(id) => del.mutate(id)}
            onAdd={() => openAdd(anchor)}
          />
        )}

        {/* Member overview for week/month */}
        {(view === "week" || view === "month") && (
          <MemberOverview
            events={eventList}
            members={memberList}
            from={view === "week" ? startOfWeek(anchor) : startOfMonth(anchor)}
            to={
              view === "week"
                ? addDaysL(startOfWeek(anchor), 7)
                : new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1)
            }
            label={view === "week" ? "This week" : "This month"}
          />
        )}

        {showAdd && (
          <AddEventDialog
            defaultDate={addDate ?? new Date()}
            members={memberList}
            onClose={() => setShowAdd(false)}
            onCreated={() => { setShowAdd(false); inv(); }}
          />
        )}
      </div>
    </AppShell>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// YEAR VIEW — 12 mini-months with heat dots for busy days
// ────────────────────────────────────────────────────────────────────────────
function YearView({
  year,
  byDay,
  holidays,
  onPickMonth,
}: {
  year: number;
  byDay: Map<string, Event[]>;
  holidays: Map<string, string>;
  onPickMonth: (monthIndex: number) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {MONTHS.map((name, mi) => {
        const gridStart = startOfMonthGrid(new Date(year, mi, 1));
        const days: Date[] = Array.from({ length: 42 }, (_, i) => addDaysL(gridStart, i));
        return (
          <button
            key={mi}
            onClick={() => onPickMonth(mi)}
            className="rounded-2xl border border-border bg-panel p-4 text-left hover:border-foreground/40"
          >
            <p className="mb-2 font-display font-bold">{name}</p>
            <div className="grid grid-cols-7 gap-0.5 text-[10px]">
              {WEEKDAYS.map((w) => (
                <div key={w} className="text-center font-mono text-muted-foreground">{w[0]}</div>
              ))}
              {days.map((d) => {
                const key = ymd(d);
                const inMonth = d.getMonth() === mi;
                const isToday = ymd(new Date()) === key;
                const count = byDay.get(key)?.length ?? 0;
                const isHoliday = holidays.has(key);
                return (
                  <div
                    key={key}
                    className={`relative aspect-square rounded ${
                      inMonth ? "text-foreground" : "text-muted-foreground/40"
                    } ${isToday ? "bg-foreground text-background font-bold" : ""}`}
                  >
                    <span className="absolute inset-0 grid place-items-center">{d.getDate()}</span>
                    {count > 0 && !isToday && (
                      <span className="absolute bottom-0 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary" />
                    )}
                    {isHoliday && !isToday && (
                      <span className="absolute right-0 top-0 size-1 rounded-full bg-rose-500" />
                    )}
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

// ────────────────────────────────────────────────────────────────────────────
// MONTH VIEW — traditional grid, colour-coded event chips + holidays
// ────────────────────────────────────────────────────────────────────────────
function MonthView({
  anchor, byDay, holidays, memberColor, onPickDay, onAdd,
}: {
  anchor: Date;
  byDay: Map<string, Event[]>;
  holidays: Map<string, string>;
  memberColor: Map<string, string>;
  onPickDay: (d: Date) => void;
  onAdd: (d: Date) => void;
}) {
  const gridStart = startOfMonthGrid(anchor);
  const days: Date[] = Array.from({ length: 42 }, (_, i) => addDaysL(gridStart, i));
  const todayKey = ymd(new Date());
  const month = anchor.getMonth();

  return (
    <div className="rounded-2xl border border-border bg-panel p-2 md:p-4">
      <div className="mb-2 grid grid-cols-7 gap-1 md:gap-2">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {days.map((d) => {
          const key = ymd(d);
          const evs = byDay.get(key) ?? [];
          const inMonth = d.getMonth() === month;
          const isToday = key === todayKey;
          const holiday = holidays.get(key);
          return (
            <div
              key={key}
              className={`group min-h-[84px] rounded-xl border p-1.5 md:min-h-[110px] md:p-2 ${
                inMonth ? "border-border bg-canvas" : "border-transparent bg-canvas/40 text-muted-foreground/60"
              } ${isToday ? "ring-2 ring-foreground" : ""}`}
            >
              <div className="mb-1 flex items-center justify-between">
                <button
                  onClick={() => onPickDay(d)}
                  className={`font-mono text-xs ${isToday ? "font-bold text-foreground" : ""}`}
                >
                  {d.getDate()}
                </button>
                <button
                  onClick={() => onAdd(d)}
                  className="hidden rounded p-0.5 text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100 md:block"
                  aria-label="Add event"
                >
                  <CalendarPlus className="size-3" />
                </button>
              </div>
              {holiday && (
                <p className="mb-1 truncate rounded bg-rose-500/10 px-1 py-0.5 text-[10px] font-semibold text-rose-500">
                  {holiday}
                </p>
              )}
              <ul className="space-y-0.5">
                {evs.slice(0, 3).map((e) => {
                  const c = (e.member_id && memberColor.get(e.member_id)) || e.color || "sky";
                  return (
                    <li
                      key={e.id}
                      onClick={() => onPickDay(d)}
                      className="cursor-pointer truncate rounded px-1 py-0.5 text-[10px] font-semibold"
                      style={kidStyle(c)}
                    >
                      {new Date(e.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} {e.title}
                    </li>
                  );
                })}
                {evs.length > 3 && (
                  <li className="px-1 text-[10px] text-muted-foreground">+ {evs.length - 3} more</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// WEEK VIEW — 7 columns, one card per day with time-sorted events
// ────────────────────────────────────────────────────────────────────────────
function WeekView({
  anchor, byDay, holidays, memberColor, onPickDay, onAdd,
}: {
  anchor: Date;
  byDay: Map<string, Event[]>;
  holidays: Map<string, string>;
  memberColor: Map<string, string>;
  onPickDay: (d: Date) => void;
  onAdd: (d: Date) => void;
}) {
  const start = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDaysL(start, i));
  const todayKey = ymd(new Date());

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((d) => {
        const key = ymd(d);
        const evs = byDay.get(key) ?? [];
        const isToday = key === todayKey;
        const holiday = holidays.get(key);
        return (
          <div
            key={key}
            className={`rounded-2xl border p-3 ${isToday ? "border-foreground bg-panel" : "border-border bg-panel"}`}
          >
            <div className="mb-2 flex items-center justify-between">
              <button onClick={() => onPickDay(d)} className="text-left">
                <p className="font-mono text-[10px] uppercase text-muted-foreground">{WEEKDAYS[(d.getDay() + 6) % 7]}</p>
                <p className={`font-display text-lg font-bold ${isToday ? "text-primary" : ""}`}>{d.getDate()}</p>
              </button>
              <button onClick={() => onAdd(d)} className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Add event">
                <CalendarPlus className="size-4" />
              </button>
            </div>
            {holiday && (
              <p className="mb-2 truncate rounded bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-500">
                {holiday}
              </p>
            )}
            {evs.length === 0 ? (
              <p className="text-xs text-muted-foreground">—</p>
            ) : (
              <ul className="space-y-1.5">
                {evs.map((e) => {
                  const c = (e.member_id && memberColor.get(e.member_id)) || e.color || "sky";
                  return (
                    <li key={e.id} className="rounded-lg p-2 text-xs" style={kidStyle(c)}>
                      <p className="font-mono">
                        {new Date(e.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <p className="font-semibold">{e.title}</p>
                      {e.family_members?.name && <p className="opacity-80">{e.family_members.name}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// DAY VIEW
// ────────────────────────────────────────────────────────────────────────────
function DayView({
  day, byDay, holidays, memberColor, onDelete, onAdd,
}: {
  day: Date;
  byDay: Map<string, Event[]>;
  holidays: Map<string, string>;
  memberColor: Map<string, string>;
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  const key = ymd(day);
  const evs = byDay.get(key) ?? [];
  const holiday = holidays.get(key);

  return (
    <section className="rounded-2xl border border-border bg-panel p-6">
      {holiday && (
        <div className="mb-4 rounded-xl bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-500">
          🇬🇧 {holiday}
        </div>
      )}
      {evs.length === 0 ? (
        <div className="py-12 text-center">
          <p className="mb-4 text-sm text-muted-foreground">Nothing scheduled.</p>
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background"
          >
            <CalendarPlus className="size-4" /> Add event
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {evs.map((e) => {
            const c = (e.member_id && memberColor.get(e.member_id)) || e.color || "sky";
            return (
              <li key={e.id} className="flex items-start gap-3 rounded-2xl bg-canvas p-3">
                <div
                  className="grid size-12 shrink-0 place-items-center rounded-2xl font-display font-bold"
                  style={kidStyle(c)}
                >
                  {new Date(e.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.location ? <><MapPin className="inline size-3" /> {e.location}</> : null}
                    {e.family_members?.name ? ` · ${e.family_members.name}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => onDelete(e.id)}
                  className="rounded-xl p-2 text-muted-foreground hover:text-foreground"
                  aria-label="Delete"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// MEMBER OVERVIEW — who has what this week/month
// ────────────────────────────────────────────────────────────────────────────
function MemberOverview({
  events, members, from, to, label,
}: {
  events: Event[];
  members: Member[];
  from: Date;
  to: Date;
  label: string;
}) {
  const inRange = events.filter((e) => {
    const t = new Date(e.starts_at).getTime();
    return t >= from.getTime() && t < to.getTime();
  });

  const groups = new Map<string, Event[]>();
  const family: Event[] = [];
  for (const e of inRange) {
    if (!e.member_id) family.push(e);
    else {
      const arr = groups.get(e.member_id) ?? [];
      arr.push(e);
      groups.set(e.member_id, arr);
    }
  }
  for (const arr of groups.values())
    arr.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  family.sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  return (
    <section className="mt-6 rounded-2xl border border-border bg-panel p-6">
      <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
        <Users className="size-5" /> {label} — by person
      </h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => {
          const arr = groups.get(m.id) ?? [];
          return (
            <div key={m.id} className="rounded-xl bg-canvas p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={kidStyle(m.avatar_color)}>
                  {m.name}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{arr.length}</span>
              </div>
              {arr.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nothing planned.</p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {arr.slice(0, 5).map((e) => (
                    <li key={e.id} className="truncate">
                      <span className="font-mono text-muted-foreground">
                        {new Date(e.starts_at).toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}
                      </span>{" "}
                      {e.title}
                    </li>
                  ))}
                  {arr.length > 5 && (
                    <li className="text-muted-foreground">+ {arr.length - 5} more</li>
                  )}
                </ul>
              )}
            </div>
          );
        })}
        <div className="rounded-xl bg-canvas p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">Whole family</span>
            <span className="font-mono text-xs text-muted-foreground">{family.length}</span>
          </div>
          {family.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing planned.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {family.slice(0, 5).map((e) => (
                <li key={e.id} className="truncate">
                  <span className="font-mono text-muted-foreground">
                    {new Date(e.starts_at).toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}
                  </span>{" "}
                  {e.title}
                </li>
              ))}
              {family.length > 5 && <li className="text-muted-foreground">+ {family.length - 5} more</li>}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ADD EVENT DIALOG
// ────────────────────────────────────────────────────────────────────────────
function AddEventDialog({
  defaultDate, members, onClose, onCreated,
}: {
  defaultDate: Date;
  members: Member[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [starts, setStarts] = useState(toLocalInput(defaultDate));
  const [location, setLocation] = useState("");
  const [memberId, setMemberId] = useState<string>("");
  const [color, setColor] = useState<string>("sky");

  const add = useMutation({
    mutationFn: (v: {
      title: string; starts_at: string; location: string | null;
      member_id: string | null; color: string;
    }) => addEvent({ data: v }),
    onSuccess: () => { toast.success("Event added"); onCreated(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-panel p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">New event</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            add.mutate({
              title: title.trim(),
              starts_at: new Date(starts).toISOString(),
              location: location.trim() || null,
              member_id: memberId || null,
              color,
            });
          }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            className="rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm outline-none"
            autoFocus
          />
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="datetime-local"
              value={starts}
              onChange={(e) => setStarts(e.target.value)}
              className="rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm outline-none"
            />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location (optional)"
              className="rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm outline-none"
            />
          </div>
          <select
            value={memberId}
            onChange={(e) => {
              setMemberId(e.target.value);
              const m = members.find((mm) => mm.id === e.target.value);
              if (m) setColor(m.avatar_color);
            }}
            className="rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm outline-none"
          >
            <option value="">Whole family</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Colour</span>
            {KID_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`size-8 rounded-xl border-2 ${color === c ? "border-foreground" : "border-transparent"}`}
                style={kidStyle(c)}
                aria-label={c}
              />
            ))}
          </div>
          <button
            type="submit"
            disabled={add.isPending || !title.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-50"
          >
            <CalendarPlus className="size-4" /> Add event
          </button>
        </form>
      </div>
    </div>
  );
}
