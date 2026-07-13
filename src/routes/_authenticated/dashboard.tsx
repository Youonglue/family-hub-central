import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Clock, Calendar, Zap, Utensils, Sword } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const EVENT_COLORS = ["sky", "rose", "amber", "emerald", "violet", "indigo", "cyan", "pink", "orange", "fuchsia", "lime", "teal"];

// Consistent auto-color hashing matching the calendar view
const getQuestColor = (title: string): string => {
  const colors = EVENT_COLORS.map(c => `var(--kid-${c})`);
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

function Dashboard() {
  const [now, setNow] = useState(new Date());
  const [isIdle, setIsIdle] = useState(false);
  let idleTimer: any;

  // --- DATA FETCHING ---
  // Fix: Fetch points from the fully self-healing `/api/chores/points` endpoint to prevent 500 crashes
  const points = useQuery({ 
    queryKey: ["points"], 
    queryFn: () => fetch('/api/chores/points').then(res => res.json()) 
  });
  
  // Fetch complete calendar list to calculate today's active items
  const events = useQuery({ 
    queryKey: ["events"], 
    queryFn: () => fetch('/api/events').then(res => res.json()) 
  });

  // Resolve today's active quests
  const todayQuests = useMemo(() => {
    const todayKey = ymd(now);
    const list = Array.isArray(events.data) ? events.data : [];
    return list.filter((e: any) => e.starts_at === todayKey);
  }, [events.data, now]);

  // Resolve the next closest upcoming event for Kiosk Mode
  const upcomingEvent = useMemo(() => {
    const list = Array.isArray(events.data) ? events.data : [];
    const todayKey = ymd(now);
    return list.find((e: any) => e.starts_at >= todayKey);
  }, [events.data, now]);

  // --- KIOSK / INACTIVITY LOGIC ---
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

  // --- SESSION LOADING GUARD ---
  if (points.isLoading || events.isLoading) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[85vh] p-6">
          <p className="font-black text-slate-400 uppercase tracking-widest text-xs italic animate-pulse">Synchronizing Dashboard...</p>
        </div>
      </AppShell>
    );
  }

  // --- 1. KIOSK MODE RENDER (Idle clock view) ---
  if (isIdle) {
    return (
      <div className="h-screen w-full bg-slate-950 text-white flex flex-col items-center justify-center animate-in fade-in duration-1000" onClick={() => setIsIdle(false)}>
        <p className="text-3xl font-light tracking-[0.5em] text-indigo-500 uppercase mb-4">Family Hub</p>
        <h1 className="text-[12rem] font-black leading-none tracking-tighter">
          {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </h1>
        <p className="text-4xl text-slate-400 font-medium mt-4">
          {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <div className="mt-20 flex gap-4 items-center bg-white/5 p-6 rounded-3xl border border-white/10">
          <Calendar className="size-8 text-indigo-500 animate-pulse" />
          <div className="text-left">
             <p className="text-sm text-slate-500 font-bold uppercase">Next Event</p>
             <p className="text-xl font-bold">{upcomingEvent ? upcomingEvent.title : "No more events today"}</p>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. STANDARD DASHBOARD RENDER (When NOT Idle) ---
  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-8 md:py-10 space-y-8 animate-in fade-in duration-300">
        
        {/* Welcome / Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-indigo-500 font-black">Fortress Central</p>
            <h1 className="font-display text-4xl font-black italic uppercase tracking-tighter text-slate-900">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-3xl border-4 border-slate-50 shadow-sm">
            <Clock className="size-5 text-indigo-500 animate-spin" style={{ animationDuration: '6s' }} />
            <span className="font-black text-sm uppercase tracking-wider text-slate-800">
              {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </header>

        {/* Dashboard Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Hero Roster Leaderboard (Enlarged and styled) */}
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white p-8 rounded-[3rem] border-4 border-slate-50 shadow-xl">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-6 flex items-center gap-2 text-slate-900">
                <Zap className="text-yellow-500 size-6 animate-pulse" /> Hero Roster
              </h2>
              <div className="space-y-6">
                {(Array.isArray(points.data) ? points.data : []).map((m: any, index: number) => {
                  const xpProgress = (m.xp || 0) % 100;
                  const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null;

                  return (
                    <div key={m.member_id} className="bg-slate-50 p-6 md:p-8 rounded-[3rem] border-2 border-slate-100 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden shadow-sm hover:shadow-md transition-all">
                      
                      {/* Left Side: Medal Rank and Avatar */}
                      <div className="flex flex-col items-center gap-2 shrink-0">
                        {medal && <span className="text-4xl animate-bounce" style={{ animationDuration: '3s' }}>{medal}</span>}
                        <div className="size-20 rounded-[2rem] flex items-center justify-center text-white text-4xl font-black shadow-lg" style={{ backgroundColor: m.avatar_color || '#ccc' }}>
                          {m.name[0].toUpperCase()}
                        </div>
                      </div>

                      {/* Right Side: High-Contrast Large Stats */}
                      <div className="flex-1 min-w-0 w-full space-y-3">
                        <div className="flex justify-between items-center gap-2 flex-wrap">
                          <p className="font-black text-3xl uppercase tracking-tighter text-slate-900 truncate">{m.name}</p>
                          <span className="text-3xl font-black italic text-indigo-600 tracking-tight">LV.{m.level || 1}</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Adventurer</p>
                          <p className="text-2xl font-black text-slate-800 tracking-tight uppercase">{m.balance} PTS BALANCE</p>
                        </div>
                        
                        {/* Enlarged XP Progress Bar */}
                        <div className="space-y-2">
                          <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden p-1 border border-slate-300/30">
                            <div className="h-full rounded-full transition-all duration-1000 shadow-inner" style={{ width: `${xpProgress}%`, backgroundColor: m.avatar_color || '#ccc' }} />
                          </div>
                          <div className="flex justify-between text-xs font-black uppercase tracking-widest text-slate-500">
                            <span>{xpProgress} XP / 100</span>
                            <span className="text-indigo-600 animate-pulse">{100 - xpProgress} XP TO LEVEL UP!</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Right Column: Pinned Day Overview (Today's Quests) */}
          <div className="space-y-6">
            <section className="bg-white p-8 rounded-[3rem] border-4 border-slate-50 shadow-xl min-h-[400px]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2 text-slate-900">
                  <Calendar className="text-indigo-500 size-6" /> Today's Quests
                </h2>
                <span className="px-3 py-1 bg-indigo-50 text-[10px] font-black uppercase rounded-lg text-indigo-600 font-mono">
                  {now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
              
              <div className="space-y-4">
                {todayQuests.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-xs font-black text-slate-300 uppercase tracking-widest">No active quests today</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Adventure cleared!</p>
                  </div>
                ) : (
                  todayQuests.map((e: any) => {
                    // Match assigned hero
                    const assignedHero = (Array.isArray(points.data) ? points.data : []).find((m: any) => m.member_id === e.member_id);
                    return (
                      <div key={e.id} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border-l-4 shadow-sm" style={{ borderLeftColor: e.color || getQuestColor(e.title) }}>
                        {assignedHero ? (
                          <div 
                            className="size-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 shadow-sm" 
                            style={{ backgroundColor: assignedHero.avatar_color || '#ccc' }}
                            title={assignedHero.name}
                          >
                            {assignedHero.name[0].toUpperCase()}
                          </div>
                        ) : (
                          <div className="size-8 bg-slate-800 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm" title="Whole Family">ALL</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-sm text-slate-900 leading-tight truncate">{e.title}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate mt-0.5">{e.location || "Base"}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
