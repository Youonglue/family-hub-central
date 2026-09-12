// src/routes/_authenticated/dashboard.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Clock, Calendar, Zap, Sword, Gift, Flame, Scale, ScrollText, CheckCircle2, XCircle } from "lucide-react";
import { Avatar, parseAvatarConfig } from "@/components/avatar/Avatar";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const EVENT_COLORS = ["sky", "rose", "amber", "emerald", "violet", "indigo", "cyan", "pink", "orange", "fuchsia", "lime", "teal"];

const getQuestColor = (title: string): string => {
  const colors = EVENT_COLORS.map(c => `var(--kid-${c})`);
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

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

const formatLogTime = (dateStr?: string | null) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const date = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${time}, ${date}`;
};

function Dashboard() {
  const [now, setNow] = useState(new Date());

  const points = useQuery({ 
    queryKey: ["points"], 
    queryFn: () => fetch('/api/chores/points').then(res => res.json()) 
  });
  
  const events = useQuery({ 
    queryKey: ["events"], 
    queryFn: () => fetch('/api/events').then(res => res.json()) 
  });

  const notifications = useQuery({ 
    queryKey: ["notifications"], 
    queryFn: () => fetch('/api/notifications').then(res => res.json()) 
  });

  const todayQuests = useMemo(() => {
    const todayKey = ymd(now);
    const list = Array.isArray(events.data) ? events.data : [];
    return list.filter((e: any) => e.starts_at === todayKey);
  }, [events.data, now]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const rawMemberList = Array.isArray(points.data) ? points.data : [];
  const logList = Array.isArray(notifications.data) ? notifications.data : [];

  const visibleHeroes = useMemo(() => {
    return rawMemberList.filter((m: any) => {
      return m.show_on_dashboard !== 0 && m.show_on_leaderboard !== 0;
    });
  }, [rawMemberList]);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px] px-3 py-4 sm:px-6 sm:py-6 md:px-8 md:py-10 space-y-6 sm:space-y-8 animate-in fade-in duration-300">
        
        {/* Welcome / Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div>
            <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.2em] text-indigo-500 font-black">
              Fortress Central
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-black italic uppercase tracking-tighter text-slate-900">
              Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-2xl sm:rounded-3xl border-2 sm:border-4 border-slate-50 shadow-sm shrink-0 self-start sm:self-auto min-h-[44px]">
            <Clock className="size-4 sm:size-5 text-indigo-500 animate-spin" style={{ animationDuration: '6s' }} />
            <span className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-800">
              {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </header>

        {/* Dashboard Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          
          {/* Left Column: Hero Roster and Adventure Log */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            
            {/* A. Hero Roster Leaderboard */}
            <section className="bg-white p-5 sm:p-8 rounded-3xl sm:rounded-[3rem] border-2 sm:border-4 border-slate-50 shadow-xl">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2 text-slate-900">
                  <Zap className="text-yellow-500 size-5 sm:size-6 animate-pulse" /> Hero Roster
                </h2>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {visibleHeroes.length} {visibleHeroes.length === 1 ? 'Hero' : 'Heroes'} Ranked
                </span>
              </div>

              <div className="space-y-4 sm:space-y-6">
                {visibleHeroes.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No heroes visible on the leaderboard</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Enable visibility in Settings → Hero Visibility</p>
                  </div>
                ) : (
                  visibleHeroes.map((m: any, index: number) => {
                    const xpProgress = (m.xp || 0) % 100;
                    const avatarConfig = parseAvatarConfig(m.avatar_config);
                    
                    const medal = index === 0 ? "🥇 1st" : index === 1 ? "🥈 2nd" : index === 2 ? "🥉 3rd" : null;
                    const bgStyles = 
                      index === 0 ? "bg-amber-50/20 border-yellow-400/40 ring-2 sm:ring-4 ring-yellow-400/10 shadow-yellow-100/50" :
                      index === 1 ? "bg-slate-50/20 border-slate-300/40 ring-2 sm:ring-4 ring-slate-300/10 shadow-slate-100/50" :
                      index === 2 ? "bg-orange-50/20 border-orange-300/40 ring-2 sm:ring-4 ring-orange-300/10 shadow-orange-100/50" :
                      "bg-slate-50/10 border-slate-100/60 shadow-sm";

                    return (
                      <div 
                        key={m.member_id || m.id} 
                        className={`p-4 sm:p-7 rounded-2xl sm:rounded-[2.5rem] border-2 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 relative overflow-hidden hover:shadow-md transition-all ${bgStyles}`}
                      >
                        {/* Left Side: Medal Rank and Vector Avatar */}
                        <div className="flex flex-row sm:flex-col items-center gap-3 sm:gap-2 shrink-0">
                          {medal && (
                            <span className="text-2xl sm:text-3xl font-black uppercase tracking-tighter text-slate-800 animate-pulse">
                              {medal}
                            </span>
                          )}
                          <Avatar 
                            config={avatarConfig} 
                            className="size-20 sm:size-24 rounded-2xl sm:rounded-[2rem] shadow-md border-2 border-white shrink-0" 
                          />
                        </div>

                        {/* Right Side: Large Stats */}
                        <div className="flex-1 min-w-0 w-full space-y-2.5 sm:space-y-3 text-center sm:text-left">
                          <div className="flex justify-between items-center gap-2 sm:gap-4 flex-wrap">
                            <p className="font-black text-2xl sm:text-3xl uppercase tracking-tighter text-slate-900 truncate">
                              {m.name}
                            </p>
                            <span className="text-2xl sm:text-3xl font-black italic text-indigo-600 tracking-tight">
                              LV.{m.level || 1}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center gap-2 flex-wrap text-left">
                            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Active Hero
                            </p>
                            <p className="text-base sm:text-xl font-black text-slate-800 tracking-tight uppercase">
                              {m.balance || 0} PTS BALANCE
                            </p>
                          </div>
                          
                          {/* XP Progress Bar */}
                          <div className="space-y-1.5">
                            <div className="h-4 sm:h-5 w-full bg-slate-200 rounded-full overflow-hidden p-0.5 sm:p-1 border border-slate-300/30">
                              <div 
                                className="h-full rounded-full transition-all duration-1000 shadow-inner bg-indigo-600" 
                                style={{ width: `${xpProgress}%` }} 
                              />
                            </div>
                            <div className="flex justify-between text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500">
                              <span>{xpProgress} XP / 100</span>
                              <span className="text-indigo-600 animate-pulse">{100 - xpProgress} XP TO LEVEL UP!</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* B. Adventure Log (With Merged Request & Approval Timestamps) */}
            <section className="bg-white p-5 sm:p-8 rounded-3xl sm:rounded-[3rem] border-2 sm:border-4 border-slate-50 shadow-xl">
              <h2 className="text-xl sm:text-2xl font-black uppercase italic tracking-tighter mb-2 flex items-center gap-2 text-slate-900">
                <ScrollText className="text-indigo-500 size-5 sm:size-6 shrink-0" /> Adventure Log
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 sm:mb-6">
                Live timeline of family achievements, requests, and approvals
              </p>
              
              <div className="space-y-3 sm:space-y-4 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
                {logList.length === 0 ? (
                  <p className="text-center py-12 text-xs font-black text-slate-300 uppercase tracking-wider">
                    The adventure is just beginning. No logs recorded yet.
                  </p>
                ) : (
                  logList.map((log: any) => {
                    const hero = rawMemberList.find((m: any) => m.member_id === log.member_id || m.id === log.member_id);
                    const heroColor = hero?.avatar_color || '#6366f1';

                    const isMergedApproval = Boolean(log.requested_at && log.approved_at && log.status === 'approved');
                    const isPendingApproval = Boolean(log.requested_at && log.status === 'requested');
                    const isDeclined = Boolean(log.status === 'declined');

                    return (
                      <div 
                        key={log.id} 
                        className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3 sm:gap-4 shadow-xs hover:bg-slate-100/80 transition-all border-l-8"
                        style={{ borderLeftColor: heroColor }}
                      >
                        <div className="size-9 sm:size-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                          {getNotificationIcon(log.type)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-black text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-widest leading-none mb-1">
                            {log.title}
                          </p>
                          <p className="font-black text-xs sm:text-sm text-slate-800 leading-tight">
                            {log.message}
                          </p>
                          
                          {/* Merged Lifecycle Timestamp Footer */}
                          <div className="flex items-center gap-2 flex-wrap text-[9px] font-bold uppercase tracking-wider mt-2 pt-2 border-t border-slate-200/60">
                            {isMergedApproval ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="flex items-center gap-1 text-slate-500">
                                  <Clock size={11} className="text-slate-400" />
                                  Requested: <strong className="text-slate-700">{formatLogTime(log.requested_at)}</strong>
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className="flex items-center gap-1 text-emerald-700 font-black">
                                  <CheckCircle2 size={11} className="text-emerald-600" />
                                  Approved: <strong className="text-emerald-800">{formatLogTime(log.approved_at)}</strong>
                                </span>
                              </div>
                            ) : isPendingApproval ? (
                              <div className="flex items-center gap-1.5 text-amber-700 font-bold">
                                <Clock size={11} className="text-amber-500" />
                                <span>Requested: <strong>{formatLogTime(log.requested_at)}</strong> (Awaiting Approval)</span>
                              </div>
                            ) : isDeclined ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-slate-400">Requested: {formatLogTime(log.requested_at)}</span>
                                <span className="text-slate-300">•</span>
                                <span className="flex items-center gap-1 text-rose-600 font-black">
                                  <XCircle size={11} /> Declined: {formatLogTime(log.approved_at || log.created_at)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">
                                {formatLogTime(log.created_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          {/* Right Column: Today's Quests */}
          <div className="space-y-6">
            <section className="bg-white p-5 sm:p-8 rounded-3xl sm:rounded-[3rem] border-2 sm:border-4 border-slate-50 shadow-xl min-h-[300px]">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2 text-slate-900">
                  <Calendar className="text-indigo-500 size-5 sm:size-6 animate-bounce" /> Today's Quests
                </h2>
                <span className="px-3 py-1 bg-indigo-50 text-[10px] font-black uppercase rounded-xl text-indigo-600 font-mono">
                  {now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
              
              <div className="space-y-3">
                {todayQuests.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                    <p className="text-xs font-black text-slate-300 uppercase tracking-widest">No active quests today</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Adventure cleared!</p>
                  </div>
                ) : (
                  todayQuests.map((e: any) => {
                    const assignedHero = rawMemberList.find((m: any) => m.member_id === e.member_id || m.id === e.member_id);
                    return (
                      <div 
                        key={e.id} 
                        className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-2xl border-l-4 shadow-sm" 
                        style={{ borderLeftColor: e.color || getQuestColor(e.title) }}
                      >
                        {assignedHero ? (
                          <div 
                            className="size-8 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0 shadow-sm" 
                            style={{ backgroundColor: assignedHero.avatar_color || '#6366f1' }}
                            title={assignedHero.name}
                          >
                            {assignedHero.name[0].toUpperCase()}
                          </div>
                        ) : (
                          <div className="size-8 bg-slate-800 text-white rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm" title="Whole Family">
                            ALL
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-xs sm:text-sm text-slate-900 leading-tight truncate">{e.title}</p>
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
