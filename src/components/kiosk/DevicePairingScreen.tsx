// src/components/kiosk/DevicePairingScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import { ShieldCheck, Smartphone, Lock, RefreshCcw, CheckCircle2, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";

interface DevicePairingScreenProps {
  onPairedSuccess: (token: string) => void;
}

export function DevicePairingScreen({ onPairedSuccess }: DevicePairingScreenProps) {
  const [pairingCode, setPairingCode] = useState<string>(() => {
    return sessionStorage.getItem("fh_active_pairing_code") || "";
  });
  const [requestId, setRequestId] = useState<string>(() => {
    return sessionStorage.getItem("fh_active_pairing_req_id") || "";
  });
  
  const [deviceName, setDeviceName] = useState<string>("Kitchen Tablet / Phone");
  const [showPinInput, setShowPinInput] = useState(false);
  const [pin, setPin] = useState("");
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  const hasApprovedRef = useRef(false);

  // 1. Generate or Restore Single Persistent Pairing Request
  useEffect(() => {
    const existingReqId = sessionStorage.getItem("fh_active_pairing_req_id");
    const existingCode = sessionStorage.getItem("fh_active_pairing_code");

    if (existingReqId && existingCode) {
      setRequestId(existingReqId);
      setPairingCode(existingCode);
      return;
    }

    fetch("/api/auth/request-pairing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        deviceName: navigator.userAgent.includes("Mobile") ? "Mobile Phone" : "Wall Tablet" 
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.pairingCode && data.requestId) {
          sessionStorage.setItem("fh_active_pairing_code", data.pairingCode);
          sessionStorage.setItem("fh_active_pairing_req_id", data.requestId);
          setPairingCode(data.pairingCode);
          setRequestId(data.requestId);
        }
      })
      .catch(() => {});
  }, []);

  // 2. Continuous Polling: Auto-transitions into Kiosk Screen instantly upon Parent Approval
  useEffect(() => {
    if (!requestId) return;

    const interval = setInterval(async () => {
      if (hasApprovedRef.current) return;

      try {
        const res = await fetch(`/api/auth/check-pairing/${requestId}`);
        const data = await res.json();
        
        if (data.status === "approved" && data.deviceToken) {
          hasApprovedRef.current = true;
          sessionStorage.removeItem("fh_active_pairing_code");
          sessionStorage.removeItem("fh_active_pairing_req_id");

          localStorage.setItem("fh_device_token", data.deviceToken);
          toast.success("Device Authorized by Parent! Welcome to Family Hub! 🎉", { position: "top-center" });
          
          onPairedSuccess(data.deviceToken);
          
          // Instant reload ensures all components and WebSockets boot with the new authorization token
          setTimeout(() => {
            window.location.reload();
          }, 300);
        }
      } catch (e) {}
    }, 1500);

    return () => clearInterval(interval);
  }, [requestId, onPairedSuccess]);

  // 3. Instant On-Device Admin PIN Unlock
  const handlePairWithPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6) return;

    setIsVerifyingPin(true);
    try {
      const res = await fetch("/api/auth/pair-with-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, requestId, deviceName })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid Admin PIN");

      sessionStorage.removeItem("fh_active_pairing_code");
      sessionStorage.removeItem("fh_active_pairing_req_id");
      localStorage.setItem("fh_device_token", data.deviceToken);

      toast.success("Device Paired & Authorized! 🛡️", { position: "top-center" });
      onPairedSuccess(data.deviceToken);
      
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch (err: any) {
      toast.error(err.message || "PIN pairing failed");
      setPin("");
    } finally {
      setIsVerifyingPin(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 text-white flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-md bg-slate-900 border-2 sm:border-4 border-slate-800 rounded-3xl sm:rounded-[3.5rem] p-6 sm:p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-300 my-auto">
        
        <div className="size-16 sm:size-20 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
          <Smartphone size={36} />
        </div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tight">Pair New Device</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
            Authorize this device to access Family Hub
          </p>
        </div>

        {!showPinInput ? (
          <div className="space-y-5">
            {/* Pairing Code Box */}
            <div className="bg-slate-950 p-5 rounded-2xl border-2 border-indigo-500/40 space-y-2 shadow-inner">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                Pairing Code for Parent Approval:
              </span>
              <p className="text-3xl sm:text-4xl font-mono font-black text-white tracking-[0.2em]">
                {pairingCode || <Loader2 className="animate-spin size-6 mx-auto text-indigo-400" />}
              </p>
              <p className="text-[9px] text-slate-500 font-bold uppercase">
                Approve this code on a parent phone in Settings → Devices
              </p>
            </div>

            <div className="border-t border-slate-800 pt-3 space-y-2">
              <button
                onClick={() => setShowPinInput(true)}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              >
                <KeyRound size={16} /> Authorize with Admin PIN on This Device
              </button>
            </div>
          </div>
        ) : (
          /* Instant On-Device PIN Unlock */
          <form onSubmit={handlePairWithPin} className="space-y-4 animate-in fade-in duration-200">
            <div className="space-y-1 text-left">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-3">
                Enter 6-Digit Admin PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
                className="w-full p-4 bg-slate-950 border-2 border-indigo-500/50 rounded-2xl text-center text-3xl font-black tracking-[0.4em] outline-none text-white focus:border-indigo-400"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={pin.length !== 6 || isVerifyingPin}
              className="w-full py-4 bg-green-500 hover:bg-green-600 active:scale-95 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] disabled:opacity-30"
            >
              {isVerifyingPin ? <Loader2 className="animate-spin size-4" /> : <ShieldCheck size={16} />} 
              {isVerifyingPin ? "Authorizing..." : "Pair & Unlock Instantly"}
            </button>

            <button
              type="button"
              onClick={() => { setShowPinInput(false); setPin(""); }}
              className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-200 p-2"
            >
              Back to Pairing Code
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
