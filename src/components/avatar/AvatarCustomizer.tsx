// src/components/avatar/AvatarCustomizer.tsx
import React, { useState } from "react";
import { 
  Avatar, 
  AvatarConfig, 
  DEFAULT_AVATAR, 
  BackdropTheme, 
  HeroSuit, 
  FaceExpression, 
  HairStyle, 
  AccessoryType 
} from "./Avatar";
import { Check, ArrowLeft, Sparkles, Shield, Smile, Wand2 } from "lucide-react";

interface Props {
  initialConfig?: AvatarConfig;
  onSave: (config: AvatarConfig) => void;
  onClose: () => void;
}

export function AvatarCustomizer({ initialConfig, onSave, onClose }: Props) {
  const [current, setCurrent] = useState<AvatarConfig>(initialConfig || DEFAULT_AVATAR);
  const [activeTab, setActiveTab] = useState<"backdrops" | "suits" | "faces" | "hair" | "gear">("backdrops");

  // --- THEMED OPTIONS ---
  const marvelBackdrops: { id: BackdropTheme; label: string; previewColor: string }[] = [
    { id: "spiderVerse", label: "Spider-Verse", previewColor: "#831843" },
    { id: "starkTech", label: "Stark Tech", previewColor: "#0369a1" },
    { id: "bifrost", label: "Rainbow Bifrost", previewColor: "#8b5cf6" },
    { id: "wakandaSunset", label: "Wakanda Sunset", previewColor: "#701a75" },
    { id: "cosmicSpace", label: "Cosmic Galaxy", previewColor: "#1e1b4b" },
  ];

  const blueyBackdrops: { id: BackdropTheme; label: string; previewColor: string }[] = [
    { id: "heelerBackyard", label: "Heeler Backyard", previewColor: "#38bdf8" },
    { id: "keepyUppy", label: "Keepy Uppy 🎈", previewColor: "#60a5fa" },
    { id: "danceMode", label: "Dance Mode Disco", previewColor: "#f43f5e" },
    { id: "magicAsparagus", label: "Magic Asparagus", previewColor: "#15803d" },
    { id: "fairyGarden", label: "Fairy Garden", previewColor: "#c084fc" },
  ];

  const classicColors: BackdropTheme[] = ["amber", "pink", "emerald", "sky", "rose", "violet"];

  const heroSuits: { id: HeroSuit; label: string }[] = [
    { id: "classic", label: "Classic Hero" },
    { id: "spiderSuit", label: "🕷️ Web Slinger" },
    { id: "ironArmor", label: "⚡ Iron Armor" },
    { id: "blueyPup", label: "🐶 Bluey Heeler" },
    { id: "bingoPup", label: "🐾 Bingo Heeler" },
  ];

  const faceOptions: { id: FaceExpression; label: string }[] = [
    { id: "happy", label: "😊 Happy" },
    { id: "playful", label: "😜 Playful" },
    { id: "determined", label: "😤 Fierce" },
    { id: "cool", label: "😎 Cool Shades" },
    { id: "starEyes", label: "🤩 Star Power" },
    { id: "superhero", label: "🦸 Masked Hero" },
  ];

  const hairOptions: { id: HairStyle; label: string }[] = [
    { id: "none", label: "None" },
    { id: "blueyEars", label: "🐶 Bluey Ears" },
    { id: "bingoEars", label: "🐾 Bingo Ears" },
    { id: "spiky", label: "⚡ Spiky Hero" },
    { id: "wizard", label: "🧙 Magic Hat" },
    { id: "heroCowl", label: "🦇 Hero Cowl" },
    { id: "braids", label: "✨ Braids" },
    { id: "curls", label: "🌀 Curls" },
    { id: "cap", label: "🧢 Cap" },
  ];

  const accessoryOptions: { id: AccessoryType; label: string }[] = [
    { id: "none", label: "None" },
    { id: "magicWand", label: "🪄 Featherwand" },
    { id: "webShooter", label: "🕸️ Web Blast" },
    { id: "lightning", label: "⚡ Lightning Bolt" },
    { id: "sword", label: "⚔️ Quest Sword" },
    { id: "crown", label: "👑 Royal Crown" },
    { id: "headphones", label: "🎧 Headphones" },
    { id: "glasses", label: "👓 Red Glasses" },
  ];

  return (
    <div className="bg-white rounded-3xl sm:rounded-[3.5rem] border-2 sm:border-4 border-slate-50 p-4 sm:p-8 shadow-2xl w-full max-w-3xl mx-auto space-y-5 sm:space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose} 
            className="size-10 sm:size-11 rounded-2xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer min-h-[44px] min-w-[44px]"
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-black uppercase italic tracking-tight text-slate-900">Hero Customizer</h2>
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Choose Marvel, Bluey & Superhero Styles</p>
          </div>
        </div>

        <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase px-3 py-1.5 rounded-xl flex items-center gap-1">
          <Sparkles size={12} /> Offline
        </span>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-8 items-start">
        
        {/* Large SVG Preview Column */}
        <div className="md:col-span-4 flex flex-col items-center justify-center gap-3 bg-slate-50 p-4 sm:p-6 rounded-3xl border border-slate-100">
          <Avatar config={current} className="size-36 sm:size-48" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full shadow-sm">
            Live Preview
          </span>
        </div>

        {/* Categories & Selector Column */}
        <div className="md:col-span-8 space-y-4">
          
          {/* Category Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: "backdrops", label: "Backdrops 🎨", icon: Wand2 },
              { id: "suits", label: "Suit 🦸", icon: Shield },
              { id: "faces", label: "Face 😊", icon: Smile },
              { id: "hair", label: "Hair & Ears 🐶", icon: Sparkles },
              { id: "gear", label: "Gear ⚔️", icon: Wand2 },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap min-h-[40px] cursor-pointer ${
                  activeTab === tab.id 
                    ? "bg-slate-900 text-white shadow-md" 
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="max-h-[300px] sm:max-h-[340px] overflow-y-auto pr-1 space-y-4 scrollbar-thin">
            
            {/* TAB 1: BACKDROPS (Marvel, Bluey & Classic) */}
            {activeTab === "backdrops" && (
              <div className="space-y-4">
                
                {/* Marvel Backdrops */}
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Marvel Universes</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {marvelBackdrops.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setCurrent({ ...current, bg: b.id })}
                        className={`p-2.5 rounded-2xl border-2 flex items-center justify-between transition-all cursor-pointer min-h-[44px] ${
                          current.bg === b.id 
                            ? "border-indigo-600 bg-indigo-50 shadow-sm" 
                            : "border-slate-100 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="size-4 rounded-full" style={{ backgroundColor: b.previewColor }} />
                          <span className="text-[10px] font-black uppercase text-slate-800">{b.label}</span>
                        </div>
                        {current.bg === b.id && <Check size={14} className="text-indigo-600" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bluey Backdrops */}
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-sky-600">Bluey Adventures</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {blueyBackdrops.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setCurrent({ ...current, bg: b.id })}
                        className={`p-2.5 rounded-2xl border-2 flex items-center justify-between transition-all cursor-pointer min-h-[44px] ${
                          current.bg === b.id 
                            ? "border-sky-600 bg-sky-50 shadow-sm" 
                            : "border-slate-100 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="size-4 rounded-full" style={{ backgroundColor: b.previewColor }} />
                          <span className="text-[10px] font-black uppercase text-slate-800">{b.label}</span>
                        </div>
                        {current.bg === b.id && <Check size={14} className="text-sky-600" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Classic Colors */}
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Classic Colors</h4>
                  <div className="flex flex-wrap gap-2">
                    {classicColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setCurrent({ ...current, bg: color })}
                        className={`size-10 rounded-xl border-4 transition-all flex items-center justify-center cursor-pointer min-h-[40px] min-w-[40px] ${
                          current.bg === color ? "border-slate-900 scale-105" : "border-transparent"
                        }`}
                        style={{ backgroundColor: `var(--kid-${color})` }}
                        aria-label={color}
                      >
                        {current.bg === color && <Check className="size-4 text-white stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: HERO SUITS */}
            {activeTab === "suits" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {heroSuits.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCurrent({ ...current, suit: s.id })}
                    className={`p-3 rounded-2xl border-2 flex items-center justify-between transition-all cursor-pointer min-h-[44px] ${
                      (current.suit || "classic") === s.id
                        ? "bg-slate-900 text-white border-slate-900 shadow-md"
                        : "bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-xs font-black uppercase">{s.label}</span>
                    {(current.suit || "classic") === s.id && <Check size={14} className="text-white" />}
                  </button>
                ))}
              </div>
            )}

            {/* TAB 3: EXPRESSIONS */}
            {activeTab === "faces" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {faceOptions.map((face) => (
                  <button
                    key={face.id}
                    type="button"
                    onClick={() => setCurrent({ ...current, face: face.id })}
                    className={`p-3 rounded-2xl border-2 flex items-center justify-between transition-all cursor-pointer min-h-[44px] ${
                      current.face === face.id
                        ? "bg-slate-900 text-white border-slate-900 shadow-md"
                        : "bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-xs font-black uppercase">{face.label}</span>
                    {current.face === face.id && <Check size={14} className="text-white" />}
                  </button>
                ))}
              </div>
            )}

            {/* TAB 4: HAIR & EARS */}
            {activeTab === "hair" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {hairOptions.map((hair) => (
                  <button
                    key={hair.id}
                    type="button"
                    onClick={() => setCurrent({ ...current, hair: hair.id })}
                    className={`p-3 rounded-2xl border-2 flex items-center justify-between transition-all cursor-pointer min-h-[44px] ${
                      current.hair === hair.id
                        ? "bg-slate-900 text-white border-slate-900 shadow-md"
                        : "bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-xs font-black uppercase">{hair.label}</span>
                    {current.hair === hair.id && <Check size={14} className="text-white" />}
                  </button>
                ))}
              </div>
            )}

            {/* TAB 5: ACCESSORIES & GEAR */}
            {activeTab === "gear" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {accessoryOptions.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setCurrent({ ...current, accessory: acc.id })}
                    className={`p-3 rounded-2xl border-2 flex items-center justify-between transition-all cursor-pointer min-h-[44px] ${
                      current.accessory === acc.id
                        ? "bg-slate-900 text-white border-slate-900 shadow-md"
                        : "bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-xs font-black uppercase">{acc.label}</span>
                    {current.accessory === acc.id && <Check size={14} className="text-white" />}
                  </button>
                ))}
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Action CTA */}
      <button
        type="button"
        onClick={() => onSave(current)}
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest shadow-xl transition-all cursor-pointer min-h-[48px] flex items-center justify-center gap-2"
      >
        <Check size={18} /> LOCK IN NEW LOOK
      </button>

    </div>
  );
}
