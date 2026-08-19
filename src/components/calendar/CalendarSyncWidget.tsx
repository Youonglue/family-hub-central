// src/components/calendar/CalendarSyncWidget.tsx
import React, { useMemo } from "react";
import { toast } from "sonner";
import { Smartphone, QrCode } from "lucide-react";

export function CalendarSyncWidget() {
  const calendarSubUrl = useMemo(() => {
    const origin = window.location.origin;
    const cleanUrl = origin.replace(/^https?:\/\//i, "webcal://");
    return `${cleanUrl}/api/events/calendar.ics`;
  }, []);

  return (
    <section className="bg-slate-900 text-white p-5 sm:p-8 rounded-3xl sm:rounded-[3rem] shadow-xl space-y-4">
      <div className="flex items-center gap-2">
        <Smartphone className="size-5 text-indigo-400 shrink-0" />
        <h3 className="text-base sm:text-lg font-black uppercase italic tracking-tight">Sync with Mobile</h3>
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
        Scan the QR code with your iPhone or Android camera to instantly subscribe without the cloud!
      </p>

      <div className="flex flex-col items-center gap-3 pt-2">
        <div className="p-3 bg-white rounded-2xl shadow-lg">
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(calendarSubUrl)}`} 
            alt="Calendar Sub QR Code"
            className="size-32 sm:size-36"
          />
        </div>
        
        <div className="w-full text-center space-y-1">
          <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Local Feed URL:</span>
          <input 
            readOnly
            onClick={(e) => { 
              (e.target as any).select(); 
              navigator.clipboard.writeText(calendarSubUrl.replace(/^webcal:\/\//i, "http://"));
              toast.success("Calendar URL copied!"); 
            }}
            value={calendarSubUrl.replace(/^webcal:\/\//i, "http://")}
            className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-[9px] font-mono text-center text-slate-300 outline-none select-all cursor-pointer"
          />
        </div>
      </div>
    </section>
  );
}
