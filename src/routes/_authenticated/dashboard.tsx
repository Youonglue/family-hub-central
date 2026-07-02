import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, kidStyle } from "@/components/AppShell";
import { listPoints, upcomingEvents, listChores, listShopping, listMealPlan } from "@/lib/hub.functions";
import { Trophy, ShoppingCart, ChefHat, Calendar, ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  component: DashboardPage,
});

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function weekEndISO() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function DashboardPage() {
  const points = useQuery({ queryKey: ["points"], queryFn: () => listPoints() });
  const events = useQuery({ queryKey: ["events-upcoming"], queryFn: () => upcomingEvents() });
  const chores = useQuery({ queryKey: ["chores"], queryFn: () => listChores() });
  const shopping = useQuery({ queryKey: ["shopping"], queryFn: () => listShopping() });
  const meals = useQuery({
    queryKey: ["meal-plan", "week"],
    queryFn: () => listMealPlan({ data: { from: todayISO(), to: weekEndISO() } }),
  });

  const leaderboard = (points.data ?? []).slice(0, 5);
  const openShopping = (shopping.data ?? []).filter((s) => !s.checked).length;
  const activeChores = chores.data?.length ?? 0;
  const mealsPlanned = meals.data?.length ?? 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Home</p>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Family Hub</h1>
          </div>
          <Sparkles className="size-6 text-primary" />
        </header>

        <div className="grid gap-4 md:grid-cols-6">
          {/* Leaderboard */}
          <section className="md:col-span-4 rounded-3xl border border-border bg-panel p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Leaderboard</p>
                <h2 className="font-display text-xl font-bold">Points this month</h2>
              </div>
              <Link to="/chores" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                Chores <ArrowRight className="size-3.5" />
              </Link>
            </div>
            {leaderboard.length === 0 ? (
              <EmptyLine text="Add a family member and a chore to get started" toLabel="Family" to="/family" />
            ) : (
              <ol className="space-y-2">
                {leaderboard.map((m, i) => (
                  <li key={m.member_id} className="flex items-center gap-3 rounded-2xl bg-canvas p-3">
                    <span className="grid size-8 place-items-center rounded-xl bg-panel font-display text-sm font-bold">
                      {i + 1}
                    </span>
                    <span
                      className="grid size-10 place-items-center rounded-2xl font-display text-base font-bold"
                      style={kidStyle(m.avatar_color ?? "amber")}
                    >
                      {(m.name ?? "?").charAt(0).toUpperCase()}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.is_kid ? "Kid" : "Grown-up"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-2xl font-bold tabular-nums">{m.balance ?? 0}</p>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">pts</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Stats */}
          <section className="md:col-span-2 grid grid-cols-2 gap-4 md:grid-cols-1">
            <StatCard icon={Trophy} label="Active chores" value={activeChores} to="/chores" tint="amber" />
            <StatCard icon={ShoppingCart} label="To buy" value={openShopping} to="/shopping" tint="emerald" />
            <StatCard icon={ChefHat} label="Meals planned" value={mealsPlanned} to="/meals" tint="pink" />
            <StatCard icon={Calendar} label="Upcoming" value={events.data?.length ?? 0} to="/calendar" tint="sky" />
          </section>

          {/* Upcoming events */}
          <section className="md:col-span-3 rounded-3xl border border-border bg-panel p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Coming up</p>
                <h2 className="font-display text-xl font-bold">Calendar</h2>
              </div>
              <Link to="/calendar" className="text-sm font-semibold text-primary hover:underline">
                Open
              </Link>
            </div>
            {(events.data ?? []).length === 0 ? (
              <EmptyLine text="No events yet — add your first one" to="/calendar" toLabel="Calendar" />
            ) : (
              <ul className="space-y-2">
                {(events.data ?? []).slice(0, 5).map((e) => (
                  <li key={e.id} className="flex items-start gap-3 rounded-2xl bg-canvas p-3">
                    <div className="rounded-xl bg-panel px-3 py-2 text-center">
                      <p className="font-mono text-[10px] uppercase text-muted-foreground">
                        {new Date(e.starts_at).toLocaleDateString(undefined, { month: "short" })}
                      </p>
                      <p className="font-display text-lg font-bold leading-none">
                        {new Date(e.starts_at).getDate()}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{e.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(e.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {e.location ? ` · ${e.location}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Shopping preview */}
          <section className="md:col-span-3 rounded-3xl border border-border bg-panel p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">To buy</p>
                <h2 className="font-display text-xl font-bold">Shopping list</h2>
              </div>
              <Link to="/shopping" className="text-sm font-semibold text-primary hover:underline">
                Open
              </Link>
            </div>
            {(shopping.data ?? []).filter((s) => !s.checked).length === 0 ? (
              <EmptyLine text="Nothing on the list right now" to="/shopping" toLabel="Shopping" />
            ) : (
              <ul className="space-y-1.5">
                {(shopping.data ?? [])
                  .filter((s) => !s.checked)
                  .slice(0, 6)
                  .map((s) => (
                    <li key={s.id} className="flex items-center justify-between rounded-xl bg-canvas px-3 py-2">
                      <span className="font-medium">{s.name}</span>
                      {s.quantity ? <span className="text-xs text-muted-foreground">{s.quantity}</span> : null}
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  to,
  tint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  to: "/chores" | "/shopping" | "/meals" | "/calendar";
  tint: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-3xl border border-border bg-panel p-4 transition-colors hover:border-foreground/20"
    >
      <div className="mb-3 grid size-9 place-items-center rounded-xl" style={kidStyle(tint)}>
        <Icon className="size-4" />
      </div>
      <p className="font-display text-3xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Link>
  );
}

function EmptyLine({ text, to, toLabel }: { text: string; to: "/family" | "/calendar" | "/shopping"; toLabel: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-6 text-center">
      <p className="mb-3 text-sm text-muted-foreground">{text}</p>
      <Link to={to} className="inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
        Go to {toLabel}
      </Link>
    </div>
  );
}
