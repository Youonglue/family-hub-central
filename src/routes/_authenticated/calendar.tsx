import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, KID_COLORS, kidStyle } from "@/components/AppShell";
import { addEvent, deleteEvent, listEvents, listMembers } from "@/lib/hub.functions";
import { CalendarPlus, MapPin, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/calendar")({
  ssr: false,
  component: CalendarPage,
});

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function CalendarPage() {
  const qc = useQueryClient();
  const events = useQuery({ queryKey: ["events"], queryFn: () => listEvents() });
  const members = useQuery({ queryKey: ["members"], queryFn: () => listMembers() });

  const [title, setTitle] = useState("");
  const [starts, setStarts] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return toLocalInput(d);
  });
  const [location, setLocation] = useState("");
  const [memberId, setMemberId] = useState<string>("");
  const [color, setColor] = useState<string>("sky");

  const inv = () => {
    qc.invalidateQueries({ queryKey: ["events"] });
    qc.invalidateQueries({ queryKey: ["events-upcoming"] });
  };

  const add = useMutation({
    mutationFn: (v: {
      title: string;
      starts_at: string;
      location: string | null;
      member_id: string | null;
      color: string;
    }) => addEvent({ data: v }),
    onSuccess: () => {
      setTitle("");
      setLocation("");
      inv();
      toast.success("Event added");
    },
    onError: (e) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteEvent({ data: { id } }),
    onSuccess: inv,
  });

  const grouped = new Map<string, typeof events.data>();
  for (const e of events.data ?? []) {
    const key = new Date(e.starts_at).toDateString();
    const arr = grouped.get(key) ?? [];
    arr.push(e);
    grouped.set(key, arr);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-10">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Family diary</p>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Calendar</h1>
          </div>
        </header>

        <section className="mb-6 rounded-3xl border border-border bg-panel p-6">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
            <CalendarPlus className="size-5" /> New event
          </h2>
          <form
            className="grid gap-3 md:grid-cols-2"
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
              className="rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm outline-none md:col-span-2"
            />
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
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm outline-none"
            >
              <option value="">Whole family</option>
              {(members.data ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap items-center gap-2">
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
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-50 md:col-span-2"
            >
              <CalendarPlus className="size-4" /> Add event
            </button>
          </form>
        </section>

        <div className="space-y-4">
          {grouped.size === 0 && (
            <p className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No events yet.
            </p>
          )}
          {Array.from(grouped.entries()).map(([day, arr]) => (
            <section key={day} className="rounded-3xl border border-border bg-panel p-6">
              <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">{day}</h2>
              <ul className="space-y-2">
                {(arr ?? []).map((e) => {
                  const ee = e as unknown as {
                    id: string;
                    title: string;
                    starts_at: string;
                    location: string | null;
                    color: string;
                    family_members: { name: string; avatar_color: string } | null;
                  };
                  return (
                    <li key={ee.id} className="flex items-start gap-3 rounded-2xl bg-canvas p-3">
                      <div
                        className="grid size-11 place-items-center rounded-2xl font-display font-bold"
                        style={kidStyle(ee.color ?? "sky")}
                      >
                        {new Date(ee.starts_at).getDate()}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{ee.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(ee.starts_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {ee.location ? (
                            <>
                              {" · "}
                              <MapPin className="inline size-3" /> {ee.location}
                            </>
                          ) : null}
                          {ee.family_members ? ` · ${ee.family_members.name}` : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => del.mutate(ee.id)}
                        className="rounded-xl p-2 text-muted-foreground hover:text-foreground"
                        aria-label="Delete"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
