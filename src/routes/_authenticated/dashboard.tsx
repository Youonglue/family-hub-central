import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { Clock, Calendar, Zap, Utensils } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const [now, setNow] = useState(new Date());
  const [isIdle, setIsIdle] = useState(false);
  let idleTimer: any;

  // 1. Fetch Data
  const events = useQuery({ queryKey: ["events-upcoming"], queryFn: () => fetch('/api/events/upcoming').then(res => res.json()) });
  const points = useQuery({ queryKey: ["points"], queryFn: () => fetch('/api/points').then(res => res.json()) });

  // 2. Kiosk / Inactivity Logic
  const resetIdle = () => {
    setIsIdle(false);
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => setIsIdle(true), 120000); // 2 minutes to Kiosk mode
  };

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    resetIdle();
    window.addEventListener("mousemove", resetIdle);
    return () => { clearInterval(t); window.removeEventListener("mousemove", resetIdle); };
  }, []);

  // 3. Kiosk Mode Render
  if (isIdle) {
    return (
      <div className="h-screen w-full bg-slate-950 text-white flex flex-col items-center justify-center animate-in fade-in duration-1000" onClick={() => setIsIdle(false)}>
        <p className="text-3xl font-light tracking-[0.5em] text-primary uppercase mb-4">Family Hub</p>
        <h1 className="text-[12rem] font-black leading-none tracking-tighter">
          {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </h1>
        <p className="text-4xl text-slate-400 font-medium mt-4">
          {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <div className="mt-20 flex gap-4 items-center bg-white/5 p-6 rounded-3xl border border-white/10">
          <Calendar className="size-8 text-primary" />
          <div className="text-left">
             <p className="text-sm text-slate-500 font-bold uppercase">Next Event</p>
             <p className="text-xl font-bold">{(events.data as any[])?.[0]?.title ?? "No more events today"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <header>
          <h1 className="text-4xl font-black">Dashboard</h1>
          <p className="text-slate-500">Welcome back to the Hub.</p>
        </header>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Quick Points */}
          <section className="bg-panel p-6 rounded-3xl border border-border shadow-sm">
            <h2 className="flex items-center gap-2 font-bold mb-4"><Zap className="text-amber-500" /> Leaderboard</h2>
            <div className="space-y-4">
              {(Array.isArray(points.data) ? points.data : []).slice(0, 4).map((m: any) => (
                <div key={m.member_id} className="flex items-center justify-between">
                  <span className="font-bold">{m.name}</span>
                  <span className="bg-slate-100 px-3 py-1 rounded-full text-sm font-black">{m.balance} pts</span>
                </div>
              ))}
            </div>
          </section>

          {/* Today's Events */}
          <section className="bg-panel p-6 rounded-3xl border border-border shadow-sm md:col-span-2">
            <h2 className="flex items-center gap-2 font-bold mb-4"><Calendar className="text-primary" /> Upcoming</h2>
            <div className="space-y-3">
              {(Array.isArray(events.data) ? events.data : []).map((e: any) => (
                <div key={e.id} className="p-4 bg-canvas rounded-2xl border border-border/50">
                  <p className="font-black">{e.title}</p>
                  <p className="text-xs text-slate-500 font-bold">{new Date(e.starts_at).toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
