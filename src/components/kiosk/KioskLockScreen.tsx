// src/components/kiosk/KioskLockScreen.tsx
import React from "react";
import { Calendar, ShieldCheck } from "lucide-react";

interface KioskLockScreenProps {
  now: Date;
  upcomingEvent: any;
  onWake: () => void;
  onOpenAdmin: () => void;
}

export function KioskLockScreen({ now, upcomingEvent, onWake, onOpenAdmin }: KioskLockScreenProps) {
  return (
    <div 
      className="fixed inset-0 z-[9999] bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-1000 cursor-pointer select-none" 
      onClick={onWake}
    >
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onOpenAdmin();
        }}
        className="absolute top-4 right-4 bg-white/10 border border-white/20 hover:bg-white/20 text-white px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all z-50 min-h-[44px]"
      >
        <ShieldCheck size={16} /> Admin Login
      </button>

      <p className="text-xl sm:text-3xl font-light tracking-[0.4em] sm:tracking-[0.5em] text-indigo-500 uppercase mb-2 sm:mb-4 animate-pulse">
        Family Hub
      </p>
      <h1 className="text-6xl sm:text-9xl md:text-[12rem] font-black leading-none tracking-tighter">
        {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </h1>
      <p className="text-xl sm:text-3xl md:text-4xl text-slate-400 font-medium mt-2 sm:mt-4">
        {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>
      
      <div className="mt-8 sm:mt-16 flex items-center gap-3 sm:gap-4 bg-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10 max-w-lg w-full">
        <Calendar className="size-6 sm:size-8 text-indigo-500 shrink-0 animate-pulse" />
        <div className="text-left min-w-0">
           <p className="text-[9px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest">Next Event</p>
           <p className="text-sm sm:text-xl font-bold truncate">{upcomingEvent ? upcomingEvent.title : "No more events today"}</p>
        </div>
      </div>
      
      <p className="absolute bottom-6 sm:bottom-8 text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-slate-500">
        Tap Screen To Wake
      </p>
    </div>
  );
}
