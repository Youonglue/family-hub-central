import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Clock, Calendar, Zap, Utensils, Sword, Gift, Flame, Scale, ScrollText } from "lucide-react";

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

// Helper to determine notification icon
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'chore':
      return <Sword size={20} className="text-indigo-600" />;
    case 'reward':
      return <Gift size={20} className="text-emerald-600" />;
    case 'streak':
      return <Flame size={20} className="text-orange-500 animate-pulse" />;
    case 'points':
      return <Scale size={20} className="text-rose-500" />;
    default:
      return <ScrollText size={20} className="text-slate-500" />;
  }
};

function Dashboard() {
  const [now, setNow] = useState(new Date());

  // --- DATA FETCHING ---
  // Fetch points/roster list
  const points = useQuery({ 
    queryKey: ["points"], 
    queryFn: () => fetch('/api/chores/points').then(res => res.json()) 
  });
  
  // Fetch complete calendar list to calculate today's active items
  const events = useQuery({ 
    queryKey: ["events"], 
    queryFn: () => fetch('/api/events').then(res => res.json()) 
  });

  // Fetch the live Adventure Log notifications
  const notifications = useQuery({ 
    queryKey: ["notifications"], 
    queryFn: () => fetch('/api/notifications').then(res => res.json()) 
  });

  // Resolve today's active quests
  const todayQuests = useMemo(() => {
    const todayKey = ymd(now);
    const list = Array.isArray(events.data) ? events.data : [];
    return list.filter((e: any) => e.starts_at === todayKey);
  }, [events.data, now]);

  // Clock tick timer
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const memberList = Array.isArray(points.data) ? points.data : [];
  const logList = Array.isArray(notifications.data) ? notifications.data : [];

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-8 md:py-10 space-y-8 animate-in fade-in duration-300">
        
        {/* Welcome / Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-indigo-500 font-black">Fortress Central</p>
            <h1 className="font-display text-4xl font-black italic uppercase tracking-tighter text-slate-900">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-3xl border-4 border-slate-50 shadow-sm shrink-0 self-start md:self-auto">
            <Clock className="size-5 text-indigo-500 animate-spin" style={{ animationDuration: '6s' }} />
            <span className="font-black text-sm uppercase tracking-wider text-slate-800">
              {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </header>

        {/* Dashboard Grid Layout (Optimized for Mobile/Tablet stacking) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Hero Roster and Adventure Log */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* A. Hero Roster Leaderboard (Enlarged with Podium Medals) */}
            <section className="bg-white p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] border-4 border-slate-50 shadow-xl">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-6 flex items-center gap-2 text-slate-900">
                <Zap className="text-yellow-500 size-6 animate-pulse" /> Hero Roster
              </h2>
              <div className="space-y-6">
                {memberList.map((m: any, index: number) => {
                  const xpProgress = (m.xp || 0) % 100;
                  
                  // Podium rank indicators and background style enhancements
                  const medal = index === 0 ? "🥇 1st" : index === 1 ? "🥈 2nd" : index === 2 ? "🥉 3rd" : null;
                  const bgStyles = 
                    index === 0 ? "bg-amber-50/20 border-yellow-400/40 ring-4 ring-yellow-400/5 shadow-yellow-100/50" :
                    index === 1 ? "bg-slate-50/20 border-slate-300/40 ring-4 ring-slate-300/5 shadow-slate-100/50" :
                    index === 2 ? "bg-orange-50/20 border-orange-300/40 ring-4 ring-orange-300/5 shadow-orange-100/50" :
                    "bg-slate-50/10 border-slate-100/60 shadow-sm";

                  return (
                    <div key={m.member_id} className={`p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] border-2 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden hover:shadow-md transition-all ${bgStyles}`}>
                      
                      {/* Left Side: Medal Rank and Avatar */}
                      <div className="flex flex-col items-center gap-2 shrink-0">
                        {medal && <span className="text-3xl font-black uppercase tracking-tighter text-slate-800 animate-pulse">{medal}</span>}
                        <div className="size-24 rounded-[2.5rem] flex items-center justify-center text-white text-5xl font-black shadow-lg" style={{ backgroundColor: m.avatar_color || '#ccc' }}>
                          {m.name[0].toUpperCase()}
                        </div>
                      </div>

                      {/* Right Side: High-Contrast Large Stats */}
                      <div className="flex-1 min-w-0 w-full space-y-3">
                        <div className="flex justify-between items-center gap-4 flex-wrap">
                          <p className="font-black text-3xl sm:text-4xl uppercase tracking-tighter text-slate-900 truncate">{m.name}</p>
                          <span className="text-3xl sm:text-4xl font-black italic text-indigo-600 tracking-tight">LV.{m.level || 1}</span>
                        </div>
                        
                        <div className="flex justify-between items-center gap-2 flex-wrap">
                          <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">Active Adventurer</p>
                          <p className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight uppercase">{m.balance} PTS BALANCE</p>
                        </div>
                        
                        {/* Enlarged XP Progress Bar */}
                        <div className="space-y-2">
                          <div className="h-5 w-full bg-slate-200 rounded-full overflow-hidden p-1 border border-slate-300/30">
                            <div className="h-full rounded-full transition-all duration-1000 shadow-inner" style={{ width: `${xpProgress}%`, backgroundColor: m.avatar_color || '#ccc' }} />
                          </div>
                          <div className="flex justify-between text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-500">
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

            {/* B. Adventure Log (Dynamic Notifications News Feed) */}
            <section className="bg-white p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] border-4 border-slate-50 shadow-xl">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-4 flex items-center gap-2 text-slate-900">
                <ScrollText className="text-indigo-500 size-6 shrink-0" /> Adventure Log
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Live news feed of family achievements and claims</p>
              
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {logList.length === 0 ? (
                  <p className="text-center py-16 text-xs font-black text-slate-300 uppercase tracking-wider">The adventure is just beginning. No logs recorded yet.</p>
                ) : (
                  logList.map((log: any) => {
                    const hero = memberList.find((m: any) => m.member_id === log.member_id);
                    const heroColor = hero?.avatar_color || 'transparent';

                    return (
                      <div 
                        key={log.id} 
                        className="p-5 rounded-3xl bg-slate-50 border-2 border-slate-100 flex items-center gap-4 shadow-sm hover:bg-slate-100 transition-all border-l-[12px]"
                        style={{ borderLeftColor: heroColor }}
                      >
                        {/* Event Category Icon */}
                        <div className="size-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                          {getNotificationIcon(log.type)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-black text-xs text-slate-400 uppercase tracking-widest leading-none mb-1">{log.title}</p>
                          <p className="font-black text-sm text-slate-800 leading-tight">{log.message}</p>
                          
                          {/* Relative timestamp */}
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mt-1.5">
                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(log.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          {/* Right Column: Pinned Day Overview (Today's Quests) */}
          <div className="space-y-6">
            <section className="bg-white p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] border-4 border-slate-50 shadow-xl min-h-[400px]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2 text-slate-900">
                  <Calendar className="text-indigo-500 size-6 animate-bounce" /> Today's Quests
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
                    const assignedHero = memberList.find((m: any) => m.member_id === e.member_id);
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
