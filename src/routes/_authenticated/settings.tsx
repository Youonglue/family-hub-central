import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AppShell, kidStyle } from "@/components/AppShell";
import { exportBackup, importBackup, listMembers } from "@/lib/hub-api";
import { changePassword, changeUsername, getMe, getPinStatus, setPin, clearPin, verifyPin } from "@/lib/auth-client";
import { encryptBundle, decryptBundle, downloadBundle, type BackupBundle } from "@/lib/backup-crypto";
import { Download, Upload, Lock, ShieldAlert, KeyRound, User, ShieldCheck, Users, ArrowUpCircle, Shield, Trash2 } from "lucide-react";

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
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
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
      if (!res.ok) {
        throw new Error("Promotion failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("User Promoted to Admin!");
      qc.invalidateQueries({ queryKey: ["known-users"] });
      qc.invalidateQueries({ queryKey: ["members"] });
    },
    onError: () => {
      toast.error("Failed to promote user");
    }
  });

  const demote = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch('/api/auth/demote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Demotion failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("User Demoted to standard user");
      qc.invalidateQueries({ queryKey: ["known-users"] });
      qc.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to demote");
    }
  });

  const deleteAccount = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/auth/users/${userId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete account");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Account deleted successfully");
      qc.invalidateQueries({ queryKey: ["known-users"] });
      qc.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete account");
    }
  });

  const linkAccount = useMutation({
    mutationFn: async ({ memberId, userId }: { memberId: string | null, userId: string }) => {
      const res = await fetch('/api/auth/link-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, userId })
      });
      if (!res.ok) {
        throw new Error("Failed to link account");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Account link updated!");
      qc.invalidateQueries({ queryKey: ["known-users"] });
      qc.invalidateQueries({ queryKey: ["members"] });
    },
    onError: () => {
      toast.error("Failed to link account");
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
      {/* KNOWN USERS & ADMIN MANAGEMENT */}
      <section className="rounded-[3rem] border-4 border-slate-50 bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <Users className="size-6 text-indigo-500" />
          <h2 className="font-display text-xl font-black uppercase italic">Known Heroes</h2>
        </div>
        <div className="space-y-4">
          {Array.isArray(users.data) && users.data.map((u: any) => {
            const memberList = Array.isArray(members.data) ? members.data : [];
            // Find which family hero is linked to this login user account
            const linkedMember = memberList.find((m: any) => m.user_id === u.id);
            const totalAdminsCount = users.data.filter((usr: any) => usr.role === 'admin').length;
            const isSelf = u.username === me.data?.username;

            return (
              <div key={u.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl bg-slate-50 p-6 border-2 border-slate-100">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <div className={`px-2 py-1 rounded-lg font-black text-[9px] ${u.role === 'admin' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {u.role === 'admin' ? 'ADMIN' : 'USER'}
                    </div>
                    <p className="font-black text-lg uppercase tracking-tighter text-slate-800">{u.username}</p>
                    {isSelf && <span className="text-[10px] font-bold text-slate-400 italic font-mono">(You)</span>}
                  </div>
                  
                  {/* Account linking selector */}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Associated Hero:</span>
                    <select
                      value={linkedMember?.id || ""}
                      onChange={(e) => {
                        const selectedMemberId = e.target.value || null;
                        linkAccount.mutate({ memberId: selectedMemberId, userId: u.id });
                      }}
                      className="bg-white border-2 border-slate-100 rounded-lg px-2 py-1 text-[10px] font-bold uppercase outline-none focus:border-indigo-500"
                    >
                      <option value="">-- No Hero Linked --</option>
                      {memberList.map((m: any) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Promotion / Demotion & Deletion Buttons */}
                {!isSelf && (
                  <div className="flex items-center gap-2">
                    {u.role === 'admin' ? (
                      totalAdminsCount > 1 ? (
                        <button
                          onClick={() => demote.mutate(u.id)}
                          disabled={demote.isPending}
                          className="px-4 py-2 bg-rose-50 border-2 border-rose-100 text-rose-600 rounded-xl font-black text-[10px] uppercase hover:bg-rose-100 transition-all"
                        >
                          {demote.isPending ? "Demoting..." : "Demote"}
                        </button>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-400 uppercase italic">
                          (Only Admin)
                        </span>
                      )
                    ) : (
                      <button
                        onClick={() => promote.mutate(u.id)}
                        disabled={promote.isPending}
                        className="px-4 py-2 bg-white border-2 border-slate-100 text-slate-700 rounded-xl font-black text-[10px] uppercase hover:border-indigo-500 transition-all"
                      >
                        {promote.isPending ? "Promoting..." : "Promote"}
                      </button>
                    )}

                    {/* Delete Account Button */}
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to permanently delete the account "${u.username}"?`)) {
                          deleteAccount.mutate(u.id);
                        }
                      }}
                      disabled={deleteAccount.isPending}
                      className="p-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-xl text-slate-400 transition-all border-2 border-transparent hover:border-rose-100"
                      title="Delete User Account"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
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

      {/* Adult PIN (Confirm PIN field restored) */}
      <section className="rounded-[3rem] border-4 border-slate-50 bg-white p-8 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="size-5 text-indigo-500" />
          <h2 className="font-display text-lg font-black uppercase italic">{hasPin ? "Update Admin PIN" : "Initialize PIN"}</h2>
        </div>
        <form onSubmit={handleSetPin} className="space-y-4">
          <input type="password" value={pinPwd} onChange={(e) => setPinPwd(e.target.value)} placeholder="Verify Password" required className="w-full rounded-2xl bg-slate-50 p-4 text-sm font-bold outline-none" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-4">New PIN</label>
              <input type="password" inputMode="numeric" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} placeholder="000000" required maxLength={6} className="w-full rounded-2xl bg-slate-50 p-4 text-center text-2xl tracking-[0.5em] font-black outline-none border-2 border-transparent focus:border-indigo-500" />
            </div>
            
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-4">Confirm PIN</label>
              <input type="password" inputMode="numeric" value={newPin2} onChange={(e) => setNewPin2(e.target.value.replace(/\D/g, ""))} placeholder="000000" required maxLength={6} className="w-full rounded-2xl bg-slate-50 p-4 text-center text-2xl tracking-[0.5em] font-black outline-none border-2 border-transparent focus:border-indigo-500" />
            </div>
          </div>
          
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
