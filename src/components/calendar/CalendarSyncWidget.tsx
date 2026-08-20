// src/components/calendar/CalendarSyncWidget.tsx
import React, { useMemo, useEffect, useState } from "react";
import { toast } from "sonner";
import { Smartphone, QrCode, ShieldCheck } from "lucide-react";
import QRCode from "qrcode";

export function CalendarSyncWidget() {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const calendarSubUrl = useMemo(() => {
    const origin = window.location.origin;
    const cleanUrl = origin.replace(/^https?:\/\//i, "webcal://");
    return `${cleanUrl}/api/events/calendar.ics`;
  }, []);

  // 100% Local, Offline Vector QR Code Generation (Zero External APIs)
  useEffect(() => {
    QRCode.toDataURL(calendarSubUrl, {
      width: 180,
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff"
      }
    })
      .then(url => setQrDataUrl(url))
      .catch(() => {});
  }, [calendarSubUrl]);

  return (
    <section className="bg-slate-900 text-white p-5 sm:p-8 rounded-3xl sm:rounded-[3rem] shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="size-5 text-indigo-400 shrink-0" />
          <h3 className="text-base sm:text-lg font-black uppercase italic tracking-tight">Sync with Mobile</h3>
        </div>
        <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border border-emerald-500/30 flex items-center gap-1">
          <ShieldCheck size={10} /> Local Only
        </span>
      </div>

      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
        Scan the QR code on your home WiFi to subscribe your iPhone or Android calendar without cloud servers!
      </p>

      <div className="flex flex-col items-center gap-3 pt-2">
        <div className="p-2.5 bg-white rounded-2xl shadow-lg">
          {qrDataUrl ? (
            <img 
              src={qrDataUrl} 
              alt="Offline Calendar Sync QR"
              className="size-32 sm:size-36"
            />
          ) : (
            <div className="size-32 sm:size-36 flex items-center justify-center text-slate-400">
              <QrCode size={32} />
            </div>
          )}
        </div>
        
        <div className="w-full text-center space-y-1">
          <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Local Feed URL:</span>
          <input 
            readOnly
            onClick={(e) => { 
              (e.target as any).select(); 
              navigator.clipboard.writeText(calendarSubUrl.replace(/^webcal:\/\//i, "http://"));
              toast.success("Local Calendar URL copied!"); 
            }}
            value={calendarSubUrl.replace(/^webcal:\/\//i, "http://")}
            className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-[9px] font-mono text-center text-slate-300 outline-none select-all cursor-pointer"
          />
        </div>
      </div>
    </section>
  );
}
