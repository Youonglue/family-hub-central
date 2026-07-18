import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { getMe, getPinStatus, verifyPin } from "@/lib/auth-client";
import { ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";

// Sub-component Imports (Compartmentalized)
import { LeaderboardRoster } from "@/components/settings/LeaderboardRoster";
import { FamilyApprovals } from "@/components/settings/FamilyApprovals"; // Consolidated Approvals Center
import { IdentityForms } from "@/components/settings/IdentityForms";
import { BackupSettings } from "@/components/settings/BackupSettings";

export const Route = createFileRoute("/_authenticated/settings")({
  ssr: false,
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const pinStatus = useQuery({ queryKey: ["pin-status"], queryFn: () => getPinStatus() });
  
  // MUSCLE: Strictly local state. Resetting this on mount ensures the lock is always active on entry.
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPinInput] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  const isAdmin = me.data?.role?.toLowerCase() === "admin";

  // --- HARD ROUTE GUARD ---
  // If the user is loaded and they are NOT an Admin, completely lock them out!
  if (me.isSuccess && !isAdmin) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[85vh] p-6 text-center animate-in fade-in duration-300">
          <ShieldAlert className="size-16 text-rose-500 mb-6 animate-bounce" />
          <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 mb-2">Access Denied</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Only administrators are permitted in Settings.</p>
        </div>
      </AppShell>
    );
  }

  // If a PIN exists and we haven't unlocked yet, show the gate.
  const gateActive = pinStatus.data?.has_pin === true && !unlocked;

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setUnlocking(true);
    try {
      await verifyPin(pin);
      setUnlocked(true);
      setPinInput("");
      toast.success("Settings Unlocked");
    } catch (err) {
      toast.error("Invalid Admin PIN");
      setPinInput("");
    } finally { setUnlocking(false); }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-10 space-y-6">
        <header>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-indigo-500 font-black">Fortress Security</p>
          <h1 className="font-display text-4xl font-black italic uppercase tracking-tighter">Settings</h1>
          <p className="mt-2 text-xs font-bold text-slate-400 uppercase">
            System Admin: <span className="text-slate-900">{me.data?.username || "..."}</span>
          </p>
        </header>

        {gateActive ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <form onSubmit={handleUnlock} className="rounded-[3rem] border-8 border-slate-50 bg-white p-10 shadow-2xl space-y-6 text-center">
                <div className="size-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto text-indigo-500">
                <ShieldCheck size={40} />
                </div>
                <h2 className="font-display text-2xl font-black uppercase italic">Identity Verification</h2>
                <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">Enter Admin PIN to modify Hub data</p>
                
                <input
                type="password" inputMode="numeric" autoFocus autoComplete="off"
                value={pin} onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                placeholder="••••" maxLength={8}
                className="w-full max-w-xs mx-auto rounded-[2rem] border-4 border-slate-50 bg-slate-50 px-3 py-5 text-center text-3xl tracking-[0.5em] outline-none focus:border-indigo-500 transition-all"
                />
                
                <button type="submit" disabled={unlocking || pin.length < 4}
                className="w-full py-5 rounded-[2rem] bg-slate-900 text-white font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl disabled:opacity-20">
                {unlocking ? "DECRYPTING..." : "UNLOCK SETTINGS"}
                </button>
            </form>
          </div>
        ) : (
          <div className="animate-in zoom-in-95 duration-300">
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
    <div className="space-y-8">
      {/* 1. Roster and Point Deductions Administration */}
      <LeaderboardRoster />

      {/* 2. Consolidated Family Approvals Center (Quest Approvals & Co-Op Claims) */}
      <FamilyApprovals />

      {/* 3. Hero Identity & Admin Security Credentials */}
      <IdentityForms 
        hasPin={hasPin} 
        onPinChanged={onPinChanged} 
        onUsernameChanged={onUsernameChanged} 
      />

      {/* 4. Encrypted Backup Extraction Tool */}
      <BackupSettings />
    </div>
  );
}
