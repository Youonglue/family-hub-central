import React, { useState } from "react";
import { Avatar, AvatarConfig, DEFAULT_AVATAR } from "./Avatar";
import { Check, ArrowLeft } from "lucide-react";

interface Props {
  initialConfig?: AvatarConfig;
  onSave: (config: AvatarConfig) => void;
  onClose: () => void;
}

export function AvatarCustomizer({ initialConfig, onSave, onClose }: Props) {
  const [current, setCurrent] = useState<AvatarConfig>(initialConfig || DEFAULT_AVATAR);

  // Styling arrays
  const backgroundOptions: AvatarConfig["bg"][] = ["amber", "pink", "emerald", "sky", "rose", "violet"];
  const faceOptions: AvatarConfig["face"][] = ["happy", "determined", "cool", "starEyes"];
  const hairOptions: AvatarConfig["hair"][] = ["none", "spiky", "wizard", "braids", "curls", "cap"];
  const accessoryOptions: AvatarConfig["accessory"][] = ["none", "crown", "glasses", "headphones", "sword"];

  return (
    <div className="bg-white rounded-[2.5rem] border-4 border-slate-50 p-6 md:p-8 shadow-xl w-full max-w-2xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onClose} 
          className="size-10 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">Customizer</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Design your hero avatar</p>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-center">
        
        {/* Large SVG Preview Column */}
        <div className="md:col-span-2 flex flex-col items-center justify-center gap-4">
          <Avatar config={current} className="size-40 sm:size-48" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-1.5 rounded-full">
            Live Preview
          </span>
        </div>

        {/* Selectors Column */}
        <div className="md:col-span-3 space-y-6 max-h-[400px] overflow-y-auto pr-2 scrollbar-none">
          
          {/* Background Selection */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Background Color</h3>
            <div className="flex flex-wrap gap-2">
              {backgroundOptions.map((color) => (
                <button
                  key={color}
                  onClick={() => setCurrent({ ...current, bg: color })}
                  className={`size-10 rounded-xl border-4 transition-all flex items-center justify-center cursor-pointer ${
                    current.bg === color ? "border-slate-900 scale-105" : "border-transparent"
                  }`}
                  style={{ backgroundColor: `var(--kid-${color})` }}
                  aria-label={color}
                >
                  {current.bg === color && <Check className="size-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Expressions */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Expression</h3>
            <div className="flex flex-wrap gap-2">
              {faceOptions.map((face) => (
                <button
                  key={face}
                  onClick={() => setCurrent({ ...current, face })}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all cursor-pointer ${
                    current.face === face 
                      ? "bg-slate-900 text-white border-slate-900" 
                      : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100"
                  }`}
                >
                  {face}
                </button>
              ))}
            </div>
          </div>

          {/* Hair Styles */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Hair Style</h3>
            <div className="flex flex-wrap gap-2">
              {hairOptions.map((hair) => (
                <button
                  key={hair}
                  onClick={() => setCurrent({ ...current, hair })}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all cursor-pointer ${
                    current.hair === hair 
                      ? "bg-slate-900 text-white border-slate-900" 
                      : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100"
                  }`}
                >
                  {hair}
                </button>
              ))}
            </div>
          </div>

          {/* Accessories */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Accessories</h3>
            <div className="flex flex-wrap gap-2">
              {accessoryOptions.map((acc) => (
                <button
                  key={acc}
                  onClick={() => setCurrent({ ...current, accessory: acc })}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all cursor-pointer ${
                    current.accessory === acc 
                      ? "bg-slate-900 text-white border-slate-900" 
                      : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100"
                  }`}
                >
                  {acc}
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Action CTA */}
      <button
        onClick={() => onSave(current)}
        className="w-full py-4 sm:py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
      >
        Lock in New Look
      </button>

    </div>
  );
}
