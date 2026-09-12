// src/components/kiosk/KioskLockScreen.tsx
import React, { useMemo, useState, useEffect } from "react";
import { Calendar, ShieldCheck, Clock, UserCircle, X, Sword, Sparkles, MapPin, Briefcase, Heart } from "lucide-react";
import { Avatar, parseAvatarConfig } from "@/components/avatar/Avatar";
import { getScreensaverConfig, ScreensaverConfig } from "@/components/settings/ScreensaverCustomizer";

interface KioskLockScreenProps {
  now: Date;
  eventsList: any[];
  memberList: any[];
  onOpenHeroSelect: () => void;
  onOpenAdmin: () => void;
}

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDaysL = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

function startOfWeek(d = new Date()) {
  const day = d.getDay();
  const diff = (day + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

const THEME_STYLES = {
  pastelPink: {
    bgCanvas: "bg-gradient-to-br from-pink-50 via-rose-50/80 to-purple-50 text-slate-900",
    headerBg: "bg-white/90 border-pink-100 shadow-pink-200/40 text-slate-900",
    clockColor: "text-slate-900",
    dateColor: "text-pink-600",
    subTextColor: "text-slate-500",
    horizonCard: "bg-white/85 border-pink-100 shadow-pink-200/50",
    cardToday: "rgba(253, 242, 248, 0.95)",
    cardTodayBorder: "#f472b6",
    cardDefault: "rgba(255, 255, 255, 0.70)",
    cardBorder: "#fbcfe8",
    todayBadgeBg: "bg-pink-500 text-white shadow-pink-300/40",
    todayText: "text-pink-600",
    eventBadgeBg: "bg-white/90 border-pink-100/80 text-slate-800",
    btnChoose: "bg-gradient-to-r from-pink-500 via-rose-400 to-purple-400 text-white shadow-pink-400/30",
    btnAdmin: "bg-white border-pink-200 text-pink-700 hover:bg-pink-50",
    glow1: "bg-pink-200/80",
    glow2: "bg-purple-200/70",
  },
  cyberNebula: {
    bgCanvas: "bg-slate-950 text-white",
    headerBg: "bg-slate-900/90 border-white/15 shadow-black/60 text-white",
    clockColor: "text-white",
    dateColor: "text-indigo-400",
    subTextColor: "text-slate-400",
    horizonCard: "bg-slate-900/90 border-white/15 shadow-black/80",
    cardToday: "rgba(79, 70, 229, 0.35)",
    cardTodayBorder: "#818cf8",
    cardDefault: "rgba(255, 255, 255, 0.04)",
    cardBorder: "rgba(255, 255, 255, 0.12)",
    todayBadgeBg: "bg-indigo-600 text-white shadow-indigo-500/50",
    todayText: "text-indigo-300",
    eventBadgeBg: "bg-slate-950/80 border-white/15 text-white",
    btnChoose: "bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-indigo-600/40",
    btnAdmin: "bg-white/10 border-white/15 text-white hover:bg-white/20",
    glow1: "bg-indigo-600/60",
    glow2: "bg-fuchsia-600/60",
  },
  sunnyMeadow: {
    bgCanvas: "bg-gradient-to-br from-amber-50 via-orange-50/60 to-yellow-50 text-slate-900",
    headerBg: "bg-white/85 border-amber-100 shadow-amber-200/40 text-slate-900",
    clockColor: "text-slate-900",
    dateColor: "text-amber-600",
    subTextColor: "text-slate-500",
    horizonCard: "bg-white/80 border-amber-100 shadow-amber-200/40",
    cardToday: "rgba(254, 243, 199, 0.95)",
    cardTodayBorder: "#f59e0b",
    cardDefault: "rgba(255, 255, 255, 0.70)",
    cardBorder: "#fde68a",
    todayBadgeBg: "bg-amber-500 text-white shadow-amber-300/40",
    todayText: "text-amber-600",
    eventBadgeBg: "bg-white/90 border-amber-100 text-slate-800",
    btnChoose: "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-400/30",
    btnAdmin: "bg-white border-amber-200 text-amber-800 hover:bg-amber-50",
    glow1: "bg-amber-200/80",
    glow2: "bg-yellow-200/70",
  },
  lavenderMist: {
    bgCanvas: "bg-gradient-to-br from-purple-50 via-indigo-50/60 to-violet-50 text-slate-900",
    headerBg: "bg-white/85 border-purple-100 shadow-purple-200/40 text-slate-900",
    clockColor: "text-slate-900",
    dateColor: "text-purple-600",
    subTextColor: "text-slate-500",
    horizonCard: "bg-white/80 border-purple-100 shadow-purple-200/40",
    cardToday: "rgba(243, 232, 255, 0.95)",
    cardTodayBorder: "#a855f7",
    cardDefault: "rgba(255, 255, 255, 0.70)",
    cardBorder: "#e9d5ff",
    todayBadgeBg: "bg-purple-600 text-white shadow-purple-300/40",
    todayText: "text-purple-600",
    eventBadgeBg: "bg-white/90 border-purple-100 text-slate-800",
    btnChoose: "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-400/30",
    btnAdmin: "bg-white border-purple-200 text-purple-800 hover:bg-purple-50",
    glow1: "bg-purple-200/80",
    glow2: "bg-indigo-200/70",
  },
  mintForest: {
    bgCanvas: "bg-gradient-to-br from-emerald-50 via-teal-50/60 to-cyan-50 text-slate-900",
    headerBg: "bg-white/85 border-emerald-100 shadow-emerald-200/40 text-slate-900",
    clockColor: "text-slate-900",
    dateColor: "text-emerald-600",
    subTextColor: "text-slate-500",
    horizonCard: "bg-white/80 border-emerald-100 shadow-emerald-200/40",
    cardToday: "rgba(236, 253, 245, 0.95)",
    cardTodayBorder: "#10b981",
    cardDefault: "rgba(255, 255, 255, 0.70)",
    cardBorder: "#a7f3d0",
    todayBadgeBg: "bg-emerald-600 text-white shadow-emerald-300/40",
    todayText: "text-emerald-600",
    eventBadgeBg: "bg-white/90 border-emerald-100 text-slate-800",
    btnChoose: "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-400/30",
    btnAdmin: "bg-white border-emerald-200 text-emerald-800 hover:bg-emerald-50",
    glow1: "bg-emerald-200/80",
    glow2: "bg-teal-200/70",
  },
  oledBlack: {
    bgCanvas: "bg-black text-white",
    headerBg: "bg-slate-950 border-white/20 shadow-none text-white",
    clockColor: "text-white",
    dateColor: "text-indigo-400",
    subTextColor: "text-slate-400",
    horizonCard: "bg-slate-950 border-white/20 shadow-none",
    cardToday: "#111827",
    cardTodayBorder: "#6366f1",
    cardDefault: "#000000",
    cardBorder: "#334155",
    todayBadgeBg: "bg-indigo-600 text-white",
    todayText: "text-indigo-300",
    eventBadgeBg: "bg-slate-900 border-white/20 text-white",
    btnChoose: "bg-indigo-600 text-white",
    btnAdmin: "bg-slate-900 border-white/20 text-white",
    glow1: "bg-transparent",
    glow2: "bg-transparent",
  }
};

export function KioskLockScreen({ 
  now = new Date(), 
  eventsList = [], 
  memberList = [], 
  onOpenHeroSelect, 
  onOpenAdmin 
}: KioskLockScreenProps) {
  const [selectedScreensaverDay, setSelectedScreensaverDay] = useState<Date | null>(null);
  const [config, setConfig] = useState<ScreensaverConfig>(getScreensaverConfig);

  useEffect(() => {
    const handleConfigChange = (e: any) => {
      if (e.detail) setConfig(e.detail);
    };
    window.addEventListener("screensaver-config-changed", handleConfigChange);
    return () => window.removeEventListener("screensaver-config-changed", handleConfigChange);
  }, []);

  const theme = THEME_STYLES[config.theme] || THEME_STYLES.pastelPink;

  const safeEvents = Array.isArray(eventsList) ? eventsList : [];
  const safeMembers = Array.isArray(memberList) ? memberList : [];

  const weekDays = useMemo(() => {
    const monday = startOfWeek(now);
    return Array.from({ length: 7 }, (_, i) => addDaysL(monday, i));
  }, [now]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const e of safeEvents) {
      if (!e || !e.starts_at) continue;
      const arr = map.get(e.starts_at) ?? [];
      arr.push(e);
      map.set(e.starts_at, arr);
    }
    return map;
  }, [safeEvents]);

  const fontClass = 
    config.fontFamily === "mono" ? "font-mono" :
    config.fontFamily === "serif" ? "font-serif" :
    config.fontFamily === "comic" ? "font-sans tracking-wide" : "font-sans";

  const columnHeightClass = 
    config.cardDensity === "compact" ? "min-h-[110px] md:min-h-[140px]" :
    config.cardDensity === "normal" ? "min-h-[140px] md:min-h-[190px]" :
    "min-h-[160px] md:min-h-[260px]";

  return (
    <div 
      id="kiosk-screensaver-root"
      className={`fixed inset-0 z-[9999] ${theme.bgCanvas} ${fontClass} flex flex-col justify-between p-3.5 sm:p-5 select-none overflow-hidden h-[100dvh] max-h-[100dvh] pt-[max(env(safe-area-inset-top),0.875rem)] pb-[max(env(safe-area-inset-bottom),0.875rem)] pl-[max(env(safe-area-inset-left),0.875rem)] pr-[max(env(safe-area-inset-right),0.875rem)] cursor-pointer`}
      /* SMART WAKE: Tapping the background smoothly wakes the tablet straight to Choose Hero */
      onClick={() => onOpenHeroSelect()}
    >
      {/* Ambient Animated Glows */}
      {config.ambientGlow && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-50">
          <div className={`absolute -top-[15%] -left-[10%] w-[55vw] h-[55vw] ${theme.glow1} rounded-full blur-[140px] animate-pulse`} style={{ animationDuration: '8s' }} />
          <div className={`absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] ${theme.glow2} rounded-full blur-[160px] animate-pulse`} style={{ animationDuration: '10s' }} />
        </div>
      )}

      {/* TOP HEADER */}
      <header 
        className={`relative z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${theme.headerBg} backdrop-blur-2xl px-4 py-3 rounded-2xl sm:rounded-3xl border shadow-lg shrink-0`}
        onClick={(e) => e.stopPropagation()} // Prevent header background from waking screen prematurely
      >
        
        {/* Left: Clock & Date */}
        <div className="flex items-center gap-3">
          <div className="size-10 sm:size-11 rounded-2xl bg-indigo-500/10 border border-indigo-400/30 flex items-center justify-center text-indigo-500 shrink-0">
            <Clock size={20} className="animate-pulse" />
          </div>
          
          <div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl sm:text-3xl font-black tracking-tight ${theme.clockColor} font-mono leading-none`}>
                {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className={`text-[10px] sm:text-xs font-black uppercase ${theme.dateColor} tracking-wider`}>
                {now.toLocaleDateString(undefined, { weekday: 'short' })}
              </span>
            </div>
            <p className={`text-[9px] sm:text-[10px] font-bold ${theme.subTextColor} uppercase tracking-widest mt-0.5`}>
              {now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            type="button"
            onClick={onOpenHeroSelect}
            className={`flex-1 sm:flex-none ${theme.btnChoose} hover:brightness-105 active:scale-95 px-4 sm:px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all min-h-[44px] border border-white/30`}
          >
            <UserCircle size={18} /> Choose Hero
          </button>

          <button 
            type="button"
            onClick={onOpenAdmin}
            className={`flex-1 sm:flex-none ${theme.btnAdmin} active:scale-95 border-2 px-4 sm:px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all min-h-[44px] shadow-xs`}
          >
            <ShieldCheck size={16} /> Admin
          </button>
        </div>
      </header>

      {/* MAIN SCREEN AREA: 7-DAY HORIZON */}
      <main className="relative z-10 flex-1 my-2 sm:my-3 flex flex-col min-h-0" onClick={(e) => e.stopPropagation()}>
        <div className={`${theme.horizonCard} backdrop-blur-3xl border-2 sm:border-4 rounded-3xl sm:rounded-[3rem] p-3 sm:p-5 shadow-xl flex-1 flex flex-col min-h-0`}>
          
          <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className={theme.dateColor} />
              <h2 className="text-xs sm:text-sm font-black uppercase italic tracking-tight">
                Weekly Family Schedule & Routines
              </h2>
            </div>
            <span className={`text-[9px] font-bold ${theme.dateColor} uppercase tracking-widest flex items-center gap-1`}>
              <Heart size={10} className="fill-current" /> Tap Day for Full Details
            </span>
          </div>

          {/* 7-Day Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-2.5 sm:gap-3.5 flex-1 min-h-0 pt-3 overflow-y-auto md:overflow-hidden scrollbar-thin">
            {weekDays.map((dayDate) => {
              const dayKey = ymd(dayDate);
              const isToday = dayKey === ymd(now);
              const daysEvents = eventsByDay.get(dayKey) ?? [];

              const tintedShift = daysEvents.find((e: any) => e.tile_color || e.is_recurring === 1);
              const tintColor = tintedShift?.tile_color || tintedShift?.color;
              const individualEvents = daysEvents.filter((e: any) => e.id !== tintedShift?.id);

              return (
                <div 
                  key={dayKey}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedScreensaverDay(dayDate);
                  }}
                  style={{
                    backgroundColor: isToday 
                      ? theme.cardToday 
                      : tintColor 
                      ? `${tintColor}22` 
                      : theme.cardDefault,
                    borderColor: isToday 
                      ? theme.cardTodayBorder 
                      : tintColor 
                      ? `${tintColor}80` 
                      : theme.cardBorder
                  }}
                  className={`rounded-2xl sm:rounded-3xl p-3 border-2 flex flex-col justify-between transition-all cursor-pointer select-none active:scale-98 hover:shadow-md overflow-hidden relative shadow-xs ${columnHeightClass} ${
                    isToday ? "ring-4 ring-pink-400/40 shadow-xl" : ""
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-1.5 shrink-0">
                    <span className={`text-[10px] sm:text-xs font-black uppercase tracking-wider ${
                      isToday ? theme.todayText : "opacity-60"
                    }`}>
                      {dayDate.toLocaleDateString(undefined, { weekday: "short" })}
                    </span>
                    <span className={`text-sm sm:text-base font-black ${
                      isToday ? theme.todayBadgeBg + " px-2.5 py-0.5 rounded-xl shadow-xs" : "opacity-80"
                    }`}>
                      {dayDate.getDate()}
                    </span>
                  </div>

                  {/* EVENT CARDS */}
                  <div className="space-y-1.5 my-2 flex-1 overflow-y-auto pr-0.5 scrollbar-none">
                    {config.showShiftBanners && tintedShift && (() => {
                      const shiftHero = safeMembers.find(m => m.id === tintedShift.member_id);
                      const shiftAvatar = parseAvatarConfig(shiftHero?.avatar_config);

                      return (
                        <div 
                          className="rounded-xl p-2 text-left space-y-0.5 border shadow-xs"
                          style={{ 
                            backgroundColor: tintColor ? `${tintColor}30` : "rgba(244, 114, 182, 0.35)",
                            borderColor: tintColor || "#f472b6"
                          }}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-tight truncate flex items-center gap-1">
                              <Briefcase size={10} /> {tintedShift.title}
                            </span>
                            {config.showAvatars && shiftHero && (
                              <Avatar config={shiftAvatar} className="size-4 rounded-full shrink-0 shadow-xs border border-white" />
                            )}
                          </div>
                          {tintedShift.time_from && (
                            <p className="text-[7px] sm:text-[8px] font-bold opacity-80 tracking-wider">
                              {tintedShift.time_from} {tintedShift.time_to ? `-${tintedShift.time_to}` : ""}
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {individualEvents.length === 0 && !tintedShift ? (
                      <div className="h-full flex items-center justify-center py-4 text-center opacity-30">
                        <p className="text-[8px] font-black uppercase tracking-widest">
                          Clear Day
                        </p>
                      </div>
                    ) : (
                      individualEvents.map((e: any) => {
                        const hero = safeMembers.find(m => m.id === e.member_id);
                        const avatarConfig = parseAvatarConfig(hero?.avatar_config);

                        return (
                          <div 
                            key={e.id} 
                            className={`${theme.eventBadgeBg} rounded-xl p-2 text-left space-y-0.5 border shadow-xs transition-colors`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-[9px] sm:text-[10px] font-black truncate leading-tight flex-1 uppercase">
                                {e.title}
                              </p>
                              {config.showAvatars && hero && (
                                <Avatar config={avatarConfig} className="size-3.5 rounded-full shrink-0 border border-white" />
                              )}
                            </div>
                            
                            {e.time_from && (
                              <p className={`text-[7px] sm:text-[8px] font-bold ${theme.dateColor} tracking-wider flex items-center gap-0.5`}>
                                <Clock size={8} /> {e.time_from} {e.time_to ? `-${e.time_to}` : ""}
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Bottom Day Status */}
                  <div className="pt-1.5 border-t border-black/5 dark:border-white/10 shrink-0 text-center">
                    {isToday ? (
                      <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${theme.todayText} flex items-center justify-center gap-1`}>
                        <Heart size={8} className="fill-current animate-pulse" /> TODAY
                      </span>
                    ) : (
                      <span className="text-[8px] font-bold uppercase tracking-wider opacity-60">
                        {daysEvents.length} {daysEvents.length === 1 ? 'Event' : 'Events'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* DETAIL MODAL */}
      {selectedScreensaverDay && (() => {
        const dateKey = ymd(selectedScreensaverDay);
        const dayEvents = eventsByDay.get(dateKey) ?? [];

        return (
          <div 
            className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedScreensaverDay(null);
            }}
          >
            <div 
              className="bg-white text-slate-900 border-4 border-pink-100 w-full max-w-lg rounded-3xl sm:rounded-[3rem] p-6 sm:p-8 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 text-left my-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black uppercase italic tracking-tight text-slate-900">
                    {selectedScreensaverDay.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                  </h3>
                  <p className="text-[10px] font-bold text-pink-600 uppercase tracking-widest mt-0.5">
                    {dayEvents.length} Scheduled {dayEvents.length === 1 ? "Quest" : "Quests"}
                  </p>
                </div>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedScreensaverDay(null);
                  }}
                  className="p-2.5 bg-pink-50 hover:bg-rose-100 rounded-full transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center text-pink-700"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1 scrollbar-thin">
                {dayEvents.length === 0 ? (
                  <p className="text-center py-10 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    No quests scheduled for this day
                  </p>
                ) : (
                  dayEvents.map((e: any) => {
                    const hero = safeMembers.find(m => m.id === e.member_id);
                    const avatarConfig = parseAvatarConfig(hero?.avatar_config);

                    return (
                      <div 
                        key={e.id} 
                        className="p-4 bg-pink-50/50 border border-pink-100 rounded-2xl flex items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div 
                            className="size-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm" 
                            style={{ backgroundColor: e.color || '#ec4899' }}
                          >
                            <Sword size={18} />
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <p className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight truncate">
                              {e.title}
                            </p>
                            
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {e.location && (
                                <span className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-0.5">
                                  <MapPin size={10} /> {e.location}
                                </span>
                              )}
                              {e.time_from && (
                                <span className="flex items-center gap-1 text-[9px] font-black text-pink-600 uppercase">
                                  <Clock size={10} /> {e.time_from} {e.time_to ? ` - ${e.time_to}` : ""}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {hero && (
                          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-pink-200/60 shrink-0 shadow-xs">
                            <Avatar config={avatarConfig} className="size-5 rounded-full" />
                            <span className="text-[9px] font-bold uppercase text-slate-700">{hero.name}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
