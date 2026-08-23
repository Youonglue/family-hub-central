// src/components/settings/ScreensaverCustomizer.tsx
import React, { useState } from "react";
import { toast } from "sonner";
import { 
  Palette, 
  Sparkles, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  Clock, 
  Briefcase,
  Layers
} from "lucide-react";

export interface ScreensaverConfig {
  theme: "pastelPink" | "cyberNebula" | "sunnyMeadow" | "lavenderMist" | "mintForest" | "oledBlack";
  fontFamily: "display" | "mono" | "comic" | "serif";
  cardDensity: "compact" | "normal" | "massive";
  showAvatars: boolean;
  showShiftBanners: boolean;
  ambientGlow: boolean;
}

export const DEFAULT_SCREENSAVER_CONFIG: ScreensaverConfig = {
  theme: "pastelPink",
  fontFamily: "display",
  cardDensity: "massive",
  showAvatars: true,
  showShiftBanners: true,
  ambientGlow: true,
};

export function getScreensaverConfig(): ScreensaverConfig {
  try {
    const saved = localStorage.getItem("fh_screensaver_config");
    return saved ? { ...DEFAULT_SCREENSAVER_CONFIG, ...JSON.parse(saved) } : DEFAULT_SCREENSAVER_CONFIG;
  } catch {
    return DEFAULT_SCREENSAVER_CONFIG;
  }
}

// THEME PALETTES
const THEMES = [
  { 
    id: "pastelPink", 
    label: "Pastel Rose 🌸", 
    preview: "from-pink-100 to-rose-200", 
    bgClass: "bg-gradient-to-br from-pink-50 via-rose-50/80 to-purple-50 text-slate-900",
    headerBg: "bg-white/80 border-pink-100 shadow-pink-200/40 text-slate-900",
    clockColor: "text-slate-900",
    dateColor: "text-pink-600",
    cardToday: "rgba(253, 242, 248, 0.95)",
    cardTodayBorder: "#f472b6",
    cardDefault: "rgba(255, 255, 255, 0.70)",
    cardBorder: "#fbcfe8",
    todayBadgeBg: "bg-pink-500 text-white",
    todayText: "text-pink-600",
    eventBadgeBg: "bg-white/90 border-pink-100/80 text-slate-800",
    glowColor: "bg-pink-200/80"
  },
  { 
    id: "cyberNebula", 
    label: "Cyber Nebula 🌌", 
    preview: "from-indigo-900 to-purple-900", 
    bgClass: "bg-slate-950 text-white",
    headerBg: "bg-slate-900/85 border-white/15 shadow-black/60 text-white",
    clockColor: "text-white",
    dateColor: "text-indigo-400",
    cardToday: "rgba(79, 70, 229, 0.35)",
    cardTodayBorder: "#818cf8",
    cardDefault: "rgba(255, 255, 255, 0.04)",
    cardBorder: "rgba(255, 255, 255, 0.12)",
    todayBadgeBg: "bg-indigo-600 text-white",
    todayText: "text-indigo-300",
    eventBadgeBg: "bg-slate-950/80 border-white/15 text-white",
    glowColor: "bg-indigo-600/60"
  },
  { 
    id: "sunnyMeadow", 
    label: "Sunny Meadow ☀️", 
    preview: "from-amber-100 to-orange-200", 
    bgClass: "bg-gradient-to-br from-amber-50 via-orange-50/60 to-yellow-50 text-slate-900",
    headerBg: "bg-white/85 border-amber-100 shadow-amber-200/40 text-slate-900",
    clockColor: "text-slate-900",
    dateColor: "text-amber-600",
    cardToday: "rgba(254, 243, 199, 0.95)",
    cardTodayBorder: "#f59e0b",
    cardDefault: "rgba(255, 255, 255, 0.70)",
    cardBorder: "#fde68a",
    todayBadgeBg: "bg-amber-500 text-white",
    todayText: "text-amber-600",
    eventBadgeBg: "bg-white/90 border-amber-100 text-slate-800",
    glowColor: "bg-amber-200/80"
  },
  { 
    id: "lavenderMist", 
    label: "Lavender Mist 💜", 
    preview: "from-purple-100 to-indigo-100", 
    bgClass: "bg-gradient-to-br from-purple-50 via-indigo-50/60 to-violet-50 text-slate-900",
    headerBg: "bg-white/85 border-purple-100 shadow-purple-200/40 text-slate-900",
    clockColor: "text-slate-900",
    dateColor: "text-purple-600",
    cardToday: "rgba(243, 232, 255, 0.95)",
    cardTodayBorder: "#a855f7",
    cardDefault: "rgba(255, 255, 255, 0.70)",
    cardBorder: "#e9d5ff",
    todayBadgeBg: "bg-purple-600 text-white",
    todayText: "text-purple-600",
    eventBadgeBg: "bg-white/90 border-purple-100 text-slate-800",
    glowColor: "bg-purple-200/80"
  },
  { 
    id: "mintForest", 
    label: "Minty Fresh 🌿", 
    preview: "from-emerald-100 to-teal-100", 
    bgClass: "bg-gradient-to-br from-emerald-50 via-teal-50/60 to-cyan-50 text-slate-900",
    headerBg: "bg-white/85 border-emerald-100 shadow-emerald-200/40 text-slate-900",
    clockColor: "text-slate-900",
    dateColor: "text-emerald-600",
    cardToday: "rgba(236, 253, 245, 0.95)",
    cardTodayBorder: "#10b981",
    cardDefault: "rgba(255, 255, 255, 0.70)",
    cardBorder: "#a7f3d0",
    todayBadgeBg: "bg-emerald-600 text-white",
    todayText: "text-emerald-600",
    eventBadgeBg: "bg-white/90 border-emerald-100 text-slate-800",
    glowColor: "bg-emerald-200/80"
  },
  { 
    id: "oledBlack", 
    label: "OLED Minimal 🖤", 
    preview: "from-slate-950 to-black", 
    bgClass: "bg-black text-white",
    headerBg: "bg-slate-950 border-white/20 shadow-none text-white",
    clockColor: "text-white",
    dateColor: "text-indigo-400",
    cardToday: "#111827",
    cardTodayBorder: "#6366f1",
    cardDefault: "#000000",
    cardBorder: "#334155",
    todayBadgeBg: "bg-indigo-600 text-white",
    todayText: "text-indigo-300",
    eventBadgeBg: "bg-slate-900 border-white/20 text-white",
    glowColor: "bg-transparent"
  }
];

export function ScreensaverCustomizer() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ScreensaverConfig>(getScreensaverConfig);

  const activeTheme = THEMES.find(t => t.id === config.theme) || THEMES[0];

  const updateConfig = (newConfig: ScreensaverConfig) => {
    setConfig(newConfig);
    localStorage.setItem("fh_screensaver_config", JSON.stringify(newConfig));
    toast.success("Screensaver Updated!");
  };

  const fontClass = 
    config.fontFamily === "mono" ? "font-mono" :
    config.fontFamily === "serif" ? "font-serif" :
    config.fontFamily === "comic" ? "font-sans tracking-wide" : "font-sans";

  return (
    <section className="rounded-3xl sm:rounded-[3rem] border-2 sm:border-4 border-slate-50 bg-white shadow-sm overflow-hidden transition-all">
      
      {/* COLLAPSIBLE HEADER BAR */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="p-5 sm:p-7 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/60 transition-colors select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-pink-50 text-pink-600 rounded-2xl shadow-xs shrink-0">
            <Palette className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-base sm:text-lg font-black uppercase italic tracking-tight text-slate-900">
                Screensaver Studio
              </h2>
              <span className="bg-pink-100 text-pink-700 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full">
                {activeTheme.label}
              </span>
              <span className="bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full">
                {config.cardDensity.toUpperCase()} CARDS
              </span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              {isOpen ? "Click to collapse customizer studio" : "Customize colors, column sizing, fonts & live preview"}
            </p>
          </div>
        </div>

        <button 
          type="button"
          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
        >
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* EXPANDABLE STUDIO WITH LIVE PREVIEW */}
      {isOpen && (
        <div className="p-5 sm:p-8 pt-0 border-t border-slate-100 space-y-6 sm:space-y-8 animate-in slide-in-from-top-4 duration-300">
          
          {/* --- 1. REAL-TIME LIVE PREVIEW SIMULATOR --- */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Eye size={14} className="text-indigo-600" /> Real-Time Live Tablet Preview:
              </span>
              <span className="text-[9px] font-bold text-pink-600 uppercase tracking-widest bg-pink-50 px-2 py-0.5 rounded-md">
                Simulated Kitchen Tablet
              </span>
            </div>

            {/* Live Mini Tablet Canvas */}
            <div className={`w-full rounded-2xl sm:rounded-3xl border-4 border-slate-800 p-3 sm:p-4 shadow-2xl relative overflow-hidden aspect-video flex flex-col justify-between ${activeTheme.bgClass} ${fontClass} transition-all select-none`}>
              
              {config.ambientGlow && (
                <div className="absolute inset-0 pointer-events-none opacity-40">
                  <div className={`absolute -top-10 -left-10 w-36 h-36 ${activeTheme.glowColor} rounded-full blur-2xl animate-pulse`} />
                </div>
              )}

              {/* Simulated Header */}
              <div className={`relative z-10 flex items-center justify-between p-2 rounded-xl border shadow-xs ${activeTheme.headerBg}`}>
                <div className="flex items-center gap-2">
                  <Clock size={12} className="text-pink-500" />
                  <span className="text-xs font-black font-mono">14:30</span>
                  <span className={`text-[8px] font-black uppercase ${activeTheme.dateColor}`}>Wed • Aug 26</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[7px] font-black uppercase bg-pink-500 text-white px-1.5 py-0.5 rounded shadow-xs">
                    Choose Hero
                  </span>
                  <span className="text-[7px] font-bold uppercase bg-white/10 px-1 py-0.5 rounded border border-white/20">
                    Admin
                  </span>
                </div>
              </div>

              {/* Simulated 7-Day Columns (Dynamically sized by cardDensity) */}
              <div className="relative z-10 grid grid-cols-7 gap-1 my-auto pt-1">
                {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d, i) => {
                  const isToday = i === 2;
                  const simHeight = 
                    config.cardDensity === "compact" ? "h-12 sm:h-16" :
                    config.cardDensity === "normal" ? "h-14 sm:h-20" : "h-16 sm:h-24";

                  return (
                    <div 
                      key={d}
                      style={{
                        backgroundColor: isToday ? activeTheme.cardToday : activeTheme.cardDefault,
                        borderColor: isToday ? activeTheme.cardTodayBorder : activeTheme.cardBorder
                      }}
                      className={`rounded-lg p-1 border flex flex-col justify-between shadow-xs ${simHeight} ${
                        isToday ? "ring-2 ring-pink-400" : ""
                      }`}
                    >
                      <div className="flex justify-between items-center text-[7px] font-black">
                        <span className={isToday ? activeTheme.todayText : "opacity-60"}>{d}</span>
                        <span className={isToday ? activeTheme.todayBadgeBg + " px-1 rounded" : "opacity-80"}>
                          {24 + i}
                        </span>
                      </div>

                      <div className="space-y-0.5 overflow-hidden">
                        {i === 2 && config.showShiftBanners && (
                          <div className="bg-pink-500/20 text-pink-700 dark:text-pink-200 border border-pink-400/40 rounded p-0.5 text-[5px] sm:text-[6px] font-black truncate flex items-center gap-0.5">
                            <Briefcase size={5} /> Work Shift
                          </div>
                        )}
                        <div className={`p-0.5 rounded text-[5px] sm:text-[6px] font-black truncate ${activeTheme.eventBadgeBg}`}>
                          {i === 0 ? "🎒 School" : i === 2 ? "⚽ Football" : i === 5 ? "🍿 Movie" : "• Quest"}
                        </div>
                      </div>

                      <div className="text-[5px] font-black text-center opacity-60">
                        {isToday ? "● TODAY" : "1 Quest"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* --- 2. 7-DAY COLUMN SIZING & CARD DENSITY --- */}
          <div className="space-y-2.5 border-t border-slate-100 pt-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <Layers size={14} className="text-indigo-600" /> 7-Day Column Sizing & Day Card Density
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { 
                  id: "compact", 
                  label: "Compact Columns", 
                  desc: "Shorter columns for minimal vertical footprint" 
                },
                { 
                  id: "normal", 
                  label: "Standard Balanced", 
                  desc: "Medium height columns with balanced padding" 
                },
                { 
                  id: "massive", 
                  label: "Massive Ultra-Readable", 
                  desc: "Extra-tall columns that fill the entire tablet screen" 
                },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => updateConfig({ ...config, cardDensity: d.id as any })}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between active:scale-95 ${
                    config.cardDensity === d.id
                      ? "border-indigo-600 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-300"
                      : "border-slate-100 bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-tight text-slate-800">{d.label}</span>
                    {config.cardDensity === d.id && <Check size={16} className="text-indigo-600" />}
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 mt-1">{d.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* --- 3. THEME PALETTES --- */}
          <div className="space-y-2.5 border-t border-slate-100 pt-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
              Color Theme & Atmosphere
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => updateConfig({ ...config, theme: t.id as any })}
                  className={`p-3 rounded-2xl border-2 flex flex-col justify-between text-left transition-all cursor-pointer min-h-[68px] active:scale-95 ${
                    config.theme === t.id
                      ? "border-pink-500 bg-pink-50/60 shadow-sm ring-2 ring-pink-300/40"
                      : "border-slate-100 bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-tight text-slate-800">{t.label}</span>
                    {config.theme === t.id && <Check size={14} className="text-pink-600" />}
                  </div>
                  <div className={`h-2 w-full rounded-full bg-gradient-to-r ${t.preview} mt-1.5 shadow-xs`} />
                </button>
              ))}
            </div>
          </div>

          {/* --- 4. FONT STYLE --- */}
          <div className="space-y-2.5 border-t border-slate-100 pt-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
              Typography & Font Family
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "display", label: "Modern Display" },
                { id: "mono", label: "Cyber Mono" },
                { id: "comic", label: "Playful Fun" },
                { id: "serif", label: "Classic Serif" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => updateConfig({ ...config, fontFamily: f.id as any })}
                  className={`p-3 rounded-xl border-2 font-black text-xs uppercase transition-all cursor-pointer flex items-center justify-between min-h-[44px] ${
                    config.fontFamily === f.id
                      ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                      : "border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>{f.label}</span>
                  {config.fontFamily === f.id && <Check size={14} />}
                </button>
              ))}
            </div>
          </div>

          {/* --- 5. TOGGLES --- */}
          <div className="space-y-2.5 border-t border-slate-100 pt-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
              Display Features
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-2 select-none min-h-[44px]">
                <span className="text-xs font-black uppercase text-slate-800">Hero Mini-Avatars</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showAvatars}
                    onChange={(e) => updateConfig({ ...config, showAvatars: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-500"></div>
                </label>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-2 select-none min-h-[44px]">
                <span className="text-xs font-black uppercase text-slate-800">Shift Full Banners</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showShiftBanners}
                    onChange={(e) => updateConfig({ ...config, showShiftBanners: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-500"></div>
                </label>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-2 select-none min-h-[44px]">
                <span className="text-xs font-black uppercase text-slate-800">Ambient Glow Orbs</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.ambientGlow}
                    onChange={(e) => updateConfig({ ...config, ambientGlow: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-500"></div>
                </label>
              </div>
            </div>
          </div>

        </div>
      )}

    </section>
  );
}
