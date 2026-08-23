// src/routes/_authenticated/settings.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { getMe, getPinStatus } from "@/lib/auth-client";
import { ShieldCheck, ShieldAlert, Loader2, Lock, Maximize2, Minimize2, Monitor } from "lucide-react";

// Sub-component Imports
import { LeaderboardRoster } from "@/components/settings/LeaderboardRoster";
import { FamilyApprovals } from "@/components/settings/FamilyApprovals";
import { IdentityForms } from "@/components/settings/IdentityForms";
import { BackupSettings } from "@/components/settings/BackupSettings";
import { TrustedDevices } from "@/components/settings/TrustedDevices";
import { ScreensaverCustomizer } from "@/components/settings/ScreensaverCustomizer";

export const Route = createFileRoute("/_authenticated/settings")({
  ssr: false,
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const pinStatus = useQuery({ queryKey: ["pin-status"], queryFn: () => getPinStatus() });
  
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPinInput] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  const [isFullscreenEnabled, setIsFullscreenEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem("fh_fullscreen_enabled") === "true";
    } catch {
      return false;
    }
  });

  const toggleFullScreenKiosk = () => {
    if (!isFullscreenEnabled) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      localStorage.setItem("fh_fullscreen_enabled", "true");
      setIsFullscreenEnabled(true);
      toast.success("Borderless Kiosk Mode Enabled (Locked Across Wakes)");
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      localStorage.setItem("fh_fullscreen_enabled", "false");
      setIsFullscreenEnabled(false);
      toast.info("Borderless Kiosk Mode Disabled");
    }
  };

  const isAdmin = me.data?.role?.toLowerCase() === "admin";

  if (me.isLoading) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
          <Loader2 className="size-10 text-indigo-500 animate-spin mb-4" />
          <p className="font-black uppercase tracking-widest text-[10px] text-slate-400">Verifying Clearance...</p>
        </div>
      </AppShell>
    );
  }

  if (me.isSuccess && !isAdmin) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[75vh] p-6 text-center animate-in fade-in duration-300">
          <ShieldAlert className="size-16 text-rose-500 mb-6 animate-bounce" />
          <h1 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tight text-slate-900 mb-2">Access Denied</h1>
          <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest max-w-sm">
            Only administrators with an elevated session are permitted in Settings.
          </p>
        </div>
      </AppShell>
    );
  }

  const gateActive = pinStatus.data?.has_pin === true && !isAdmin && !unlocked;

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!me.data?.id || pin.length !== 6) return;
    
    setUnlocking(true);
    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: me.data.id, pin })
      });

      if (res.ok) {
        setUnlocked(true);
        setPinInput("");
        toast.success("Settings Unlocked");
        qc.invalidateQueries({ queryKey: ["me"] });
      } else {
        toast.error("Invalid Admin PIN");
        setPinInput("");
      }
    } catch (err) {
      toast.error("Network connection error");
    } finally { 
      setUnlocking(false); 
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-4 sm:py-6 md:px-8 md:py-10 space-y-6">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.3em] text-indigo-500 font-black">
              Fortress Security
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-black italic uppercase tracking-tighter text-slate-900">
              Settings
            </h1>
          </div>
          <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl self-start sm:self-auto">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              System Admin: <span className="text-indigo-600 font-bold">{me.data?.username || "Admin"}</span>
            </p>
          </div>
        </header>

        {gateActive ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-md mx-auto py-8">
            <form onSubmit={handleUnlock} className="rounded-3xl sm:rounded-[3rem] border-4 sm:border-8 border-slate-50 bg-white p-6 sm:p-10 shadow-2xl space-y-6 text-center">
              <div className="size-16 sm:size-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto text-indigo-500 shadow-inner">
                <ShieldCheck size={36} />
              </div>
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-black uppercase italic tracking-tight text-slate-900">Identity Verification</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Enter your 6-digit Admin PIN</p>
              </div>
              
              <div className="relative max-w-xs mx-auto">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 size-5" />
                <input
                  type="password" 
                  inputMode="numeric" 
                  autoFocus 
                  autoComplete="off"
                  value={pin} 
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••" 
                  maxLength={6}
                  className="w-full rounded-2xl sm:rounded-[2rem] border-4 border-slate-100 bg-slate-50 px-4 py-4 text-center text-2xl sm:text-3xl tracking-[0.4em] outline-none focus:border-indigo-500 transition-all font-black"
                />
              </div>
              
              <button 
                type="submit" 
                disabled={unlocking || pin.length !== 6}
                className="w-full py-4 sm:py-5 rounded-2xl sm:rounded-[2rem] bg-slate-900 text-white font-black text-xs sm:text-sm uppercase tracking-widest hover:bg-indigo-600 active:scale-95 transition-all shadow-xl disabled:opacity-20 cursor-pointer min-h-[48px]"
              >
                {unlocking ? "DECRYPTING..." : "UNLOCK SETTINGS"}
              </button>
            </form>
          </div>
        ) : (
          <div className="animate-in zoom-in-95 duration-200 space-y-6 sm:space-y-8">
            
            {/* FULLSCREEN DISPLAY CONTROLS */}
            <section className="rounded-3xl sm:rounded-[3rem] border-2 sm:border-4 border-slate-50 bg-white p-5 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl text-white transition-colors ${
                  isFullscreenEnabled ? "bg-indigo-600" : "bg-slate-300"
                }`}>
                  <Monitor className="size-6" />
                </div>
                <div>
                  <h2 className="font-display text-base sm:text-lg font-black uppercase italic tracking-tight text-slate-900">
                    Tablet Display & Fullscreen Kiosk
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {isFullscreenEnabled 
                      ? "Locked ON: Permanently hides browser address bars on touch & wake" 
                      : "Standard View: Address bar visible"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleFullScreenKiosk}
                className={`px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer min-h-[48px] w-full sm:w-auto ${
                  isFullscreenEnabled 
                    ? "bg-slate-900 text-white hover:bg-slate-800" 
                    : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200"
                }`}
              >
                {isFullscreenEnabled ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                {isFullscreenEnabled ? "Turn Off Kiosk Mode" : "Lock In Fullscreen Kiosk"}
              </button>
            </section>

            {/* 1. SCREENSAVER CUSTOMIZER STUDIO */}
            <ScreensaverCustomizer />

            <UnlockedSettings
              hasPin={!!pinStatus.data?.has_pin}
              onPinChanged={() => qc.invalidateQueries({ queryKey: ["pin-status"] })}
              onUsernameChanged={() => qc.invalidateQueries({ queryKey: ["me"] })}
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}

function UnlockedSettings({
  hasPin, onPinChanged, onUsernameChanged,
}: { hasPin: boolean; onPinChanged: () => void; onUsernameChanged: () => void }) {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 2. Device Pairing & Zero-Trust Access */}
      <TrustedDevices />

      {/* 3. Roster and Point Deductions Administration */}
      <LeaderboardRoster />

      {/* 4. Consolidated Family Approvals Center */}
      <FamilyApprovals />

      {/* 5. Hero Identity & Admin Security Credentials */}
      <IdentityForms 
        hasPin={hasPin} 
        onPinChanged={onPinChanged} 
        onUsernameChanged={onUsernameChanged} 
      />

      {/* 6. Automated Snapshots & Backup Tool */}
      <BackupSettings />
    </div>
  );
}
