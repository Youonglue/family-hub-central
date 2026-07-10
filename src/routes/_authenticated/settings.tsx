import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AppShell, kidStyle } from "@/components/AppShell";
import { exportBackup, importBackup, listMembers } from "@/lib/hub-api";
import { changePassword, changeUsername, getMe, getPinStatus, setPin, clearPin, verifyPin } from "@/lib/auth-client";
import { encryptBundle, decryptBundle, downloadBundle, type BackupBundle } from "@/lib/backup-crypto";
import { Download, Upload, Lock, ShieldAlert, KeyRound, User, ShieldCheck, Users, ArrowUpCircle } from "lucide-react";

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
  const qc = useQueryClient();
  const members = useQuery({ queryKey: ["members"], queryFn: () => listMembers() });
  
  const users = useQuery({ 
    queryKey: ["known-users"], 
    queryFn: () => fetch('/api/auth/users').then(res => res.json()) 
  });

  const promote = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch('/api/auth/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      return res.json();
    },
    onSuccess: () => {
      toast.success("User Promoted!");
      qc.invalidateQueries({ queryKey: ["known-users"] });
    }
  });

  const [newUsername, setNewUsername] = useState("");
  const [unamePwd, setUnamePwd] = useState("");
  const [curPwd, setCurPwd] = useState("");
  const [nextPwd, setNextPwd] = useState("");
  const [nextPwd2, setNextPwd2] = useState("");
  const [pinPwd, setPinPwd] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPin2, setNewPin2] = useState("");
  const [exportPass, setExportPass] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleChangeUsername(e: React.FormEvent) {
    e.preventDefault();
    try {
      await changeUsername(unamePwd, newUsername.trim());
      toast.success("Username updated");
      setNewUsername(""); setUnamePwd("");
      onUsernameChanged();
    } catch (err) { toast.error((err as Error).message); }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (nextPwd !== nextPwd2) { toast.error("Passwords mismatch"); return; }
    try {
      await changePassword(curPwd, nextPwd);
      toast.success("Password updated");
      setCurPwd(""); setNextPwd(""); setNextPwd2("");
    } catch (err) { toast.error((err as Error).message); }
  }

  async function handleSetPin(e: React.FormEvent) {
    e.preventDefault();
    if (newPin !== newPin2) { toast.error("PINs mismatch"); return; }
    try {
      await setPin(pinPwd, newPin);
      toast.success(hasPin ? "PIN updated" : "PIN set");
      setPinPwd(""); setNewPin(""); setNewPin2("");
      onPinChanged();
    } catch (err) { toast.error((err as Error).message); }
  }

  async function handleExport() {
    if (exportPass.length < 8) { toast.error("Need 8+ chars"); return; }
    setBusy(true);
    try {
      const bundle = (await exportBackup()) as BackupBundle;
      const encrypted = await encryptBundle(bundle, exportPass);
      downloadBundle(`familyhub-backup.fhb`, encrypted);
      toast.success("Backup Ready");
      setExportPass("");
    } catch (e) { toast.error("Export Failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-8">
      {/* KNOWN USERS */}
      <section className="rounded-[3rem] border-4 border-slate-50 bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <Users className="size-6 text-indigo-500" />
          <h2 className="font-display text-xl font-black uppercase italic">Known Heroes</h2>
        </div>
        <div className="space-y-3">
          {Array.isArray(users.data) && users.data.map((u: any) => (
            <div key={u.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl font-black text-[10px] ${u.role === 'admin' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {u.role === 'admin' ? 'ADM' : 'USR'}
                </div>
                <p className="font-black text-lg uppercase tracking-tighter text-slate-800">{u.username}</p>
              </div>
              {u.role !== 'admin' && (
                <button onClick={() => promote.mutate(u.id)} className="px-4 py-2 bg-white border-2 border-slate-100 rounded-xl font-black text-[10px] uppercase hover:border-indigo-500 transition-all">Promote</button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Account: username */}
      <section className="rounded-[3rem] border-4 border-slate-50 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <User className="size-5 text-indigo-500" />
          <h2 className="font-display text-lg font-black uppercase italic">Hero Identity</h2>
        </div>
        <form onSubmit={handleChangeUsername} className="space-y-4">
          <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="New Hero Name" className="w-full rounded-2xl bg-slate-50 p-4 text-sm font-bold outline-none border-2 border-transparent focus:border-indigo-500" />
          <input type="password" value={unamePwd} onChange={(e) => setUnamePwd(e.target.value)} placeholder="Verify Password" className="w-full rounded-2xl bg-slate-50 p-4 text-sm font-bold outline-none border-2 border-transparent focus:border-indigo-500" />
          <button className="w-full rounded-2xl bg-slate-900 py-4 text-xs font-black uppercase text-white shadow-lg">Update Identity</button>
        </form>
      </section>

      {/* Adult PIN */}
      <section className="rounded-[3rem] border-4 border-slate-50 bg-white p-8 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="size-5 text-indigo-500" />
          <h2 className="font-display text-lg font-black uppercase italic">{hasPin ? "Update Admin PIN" : "Initialize PIN"}</h2>
        </div>
        <form onSubmit={handleSetPin} className="space-y-4">
          <input type="password" value={pinPwd} onChange={(e) => setPinPwd(e.target.value)} placeholder="Verify Password" required className="w-full rounded-2xl bg-slate-50 p-4 text-sm font-bold outline-none" />
          <input type="password" inputMode="numeric" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} placeholder="New 6-Digit PIN" required maxLength={6} className="w-full rounded-2xl bg-slate-50 p-4 text-center text-2xl tracking-[0.5em] font-black outline-none border-2 border-transparent focus:border-indigo-500" />
          <button className="w-full rounded-2xl bg-indigo-600 py-4 text-xs font-black uppercase text-white shadow-lg">Save Security Code</button>
        </form>
      </section>

      {/* Backup */}
      <section className="rounded-[3rem] border-4 border-slate-50 bg-white p-8 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Download className="size-5 text-indigo-500" />
          <h2 className="font-display text-lg font-black uppercase italic">Extract Archive</h2>
        </div>
        <div className="space-y-4">
          <input type="password" value={exportPass} onChange={(e) => setExportPass(e.target.value)} placeholder="Set Archive Password (8+ chars)" className="w-full rounded-2xl bg-slate-50 p-4 text-sm font-bold outline-none" />
          <button onClick={handleExport} disabled={busy || exportPass.length < 8} className="w-full rounded-2xl bg-slate-900 py-4 text-xs font-black uppercase text-white shadow-lg disabled:opacity-20 flex items-center justify-center gap-2">
            <Download size={16} /> GENERATE BACKUP
          </button>
        </div>
      </section>
    </div>
  );
}
