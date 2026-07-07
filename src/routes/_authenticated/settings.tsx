import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, kidStyle } from "@/components/AppShell";
import {
  exportBackup, importBackup, listMembers,
} from "@/lib/hub-api";
import {
  changePassword, changeUsername, getMe, getPinStatus, setPin, clearPin, verifyPin,
} from "@/lib/auth-client";
import { encryptBundle, decryptBundle, downloadBundle, type BackupBundle } from "@/lib/backup-crypto";
import { Download, Upload, Lock, ShieldAlert, KeyRound, User, ShieldCheck } from "lucide-react";

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

  // If no PIN has been set yet, the gate is bypassed so adults can set one.
  const gateActive = pinStatus.data?.has_pin === true && !unlocked;

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setUnlocking(true);
    try {
      await verifyPin(pin);
      setUnlocked(true);
      setPinInput("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setUnlocking(false); }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-10 space-y-6">
        <header>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Adults only</p>
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Settings</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Signed in as <span className="font-semibold text-foreground">{me.data && "username" in me.data ? me.data.username : "…"}</span>
          </p>
        </header>

        {gateActive ? (
          <form onSubmit={handleUnlock} className="rounded-3xl border border-border bg-panel p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              <h2 className="font-display text-lg font-bold">Enter adult PIN</h2>
            </div>
            <p className="text-sm text-muted-foreground">Settings are locked. Enter your PIN to make account and data changes.</p>
            <input
              type="password" inputMode="numeric" autoFocus autoComplete="off"
              value={pin} onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
              placeholder="PIN" maxLength={8}
              className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-center text-lg tracking-widest outline-none"
            />
            <button type="submit" disabled={unlocking || pin.length < 4}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {unlocking ? "Checking…" : "Unlock"}
            </button>
          </form>
        ) : (
          <UnlockedSettings
            hasPin={!!pinStatus.data?.has_pin}
            onPinChanged={() => qc.invalidateQueries({ queryKey: ["pin-status"] })}
            onUsernameChanged={() => qc.invalidateQueries({ queryKey: ["me"] })}
          />
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

  // Account state
  const [newUsername, setNewUsername] = useState("");
  const [unamePwd, setUnamePwd] = useState("");
  const [curPwd, setCurPwd] = useState("");
  const [nextPwd, setNextPwd] = useState("");
  const [nextPwd2, setNextPwd2] = useState("");
  const [pinPwd, setPinPwd] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPin2, setNewPin2] = useState("");

  // Backup state
  const [exportPass, setExportPass] = useState("");
  const [importPass, setImportPass] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [replaceConfirm, setReplaceConfirm] = useState("");
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
    if (nextPwd !== nextPwd2) { toast.error("New passwords don't match"); return; }
    try {
      await changePassword(curPwd, nextPwd);
      toast.success("Password updated");
      setCurPwd(""); setNextPwd(""); setNextPwd2("");
    } catch (err) { toast.error((err as Error).message); }
  }

  async function handleSetPin(e: React.FormEvent) {
    e.preventDefault();
    if (newPin !== newPin2) { toast.error("PINs don't match"); return; }
    try {
      await setPin(pinPwd, newPin);
      toast.success(hasPin ? "PIN updated" : "PIN set");
      setPinPwd(""); setNewPin(""); setNewPin2("");
      onPinChanged();
    } catch (err) { toast.error((err as Error).message); }
  }

  async function handleClearPin() {
    if (!confirm("Remove the PIN? Anyone with an adult account will reach settings without one.")) return;
    const pwd = prompt("Confirm your password to remove the PIN:");
    if (!pwd) return;
    try {
      await clearPin(pwd);
      toast.success("PIN removed");
      onPinChanged();
    } catch (err) { toast.error((err as Error).message); }
  }

  async function handleExport() {
    if (exportPass.length < 8) { toast.error("Passphrase must be at least 8 characters"); return; }
    setBusy(true);
    try {
      const bundle = (await exportBackup()) as BackupBundle;
      const encrypted = await encryptBundle(bundle, exportPass);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadBundle(`familyhub-backup-${stamp}.fhb`, encrypted);
      toast.success("Backup downloaded");
      setExportPass("");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  async function handleImport() {
    if (!importFile) { toast.error("Pick a .fhb file first"); return; }
    if (!importPass) { toast.error("Enter the passphrase"); return; }
    if (mode === "replace" && replaceConfirm !== "REPLACE") { toast.error('Type REPLACE to confirm wiping existing data'); return; }
    setBusy(true);
    try {
      const text = await importFile.text();
      const bundle = await decryptBundle(text, importPass);
      await importBackup({ data: { bundle: { version: 1, tables: bundle.tables as Record<string, Record<string, unknown>[]> }, mode } });
      toast.success("Backup restored");
      setImportFile(null); setImportPass(""); setReplaceConfirm("");
      await qc.invalidateQueries();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  const approvers = (members.data ?? []).filter((m: { is_parent?: boolean }) => m.is_parent);

  return (
    <>
      {!hasPin && (
        <div className="flex items-start gap-3 rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <ShieldAlert className="mt-0.5 size-5 text-primary" />
          <div className="text-sm">
            <p className="font-semibold">No adult PIN set</p>
            <p className="text-muted-foreground">Set a PIN below so kids can't reach settings even if an adult account stays signed in.</p>
          </div>
        </div>
      )}

      {/* Account: username */}
      <section className="rounded-3xl border border-border bg-panel p-6">
        <div className="mb-4 flex items-center gap-2">
          <User className="size-5 text-primary" />
          <h2 className="font-display text-lg font-bold">Change username</h2>
        </div>
        <form onSubmit={handleChangeUsername} className="space-y-3">
          <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)}
            placeholder="New username" autoComplete="off" required minLength={2} maxLength={40}
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm outline-none" />
          <input type="password" value={unamePwd} onChange={(e) => setUnamePwd(e.target.value)}
            placeholder="Current password" autoComplete="current-password" required
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm outline-none" />
          <button className="w-full rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background">Update username</button>
        </form>
      </section>

      {/* Account: password */}
      <section className="rounded-3xl border border-border bg-panel p-6">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="size-5 text-primary" />
          <h2 className="font-display text-lg font-bold">Change password</h2>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <input type="password" value={curPwd} onChange={(e) => setCurPwd(e.target.value)}
            placeholder="Current password" autoComplete="current-password" required
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm outline-none" />
          <input type="password" value={nextPwd} onChange={(e) => setNextPwd(e.target.value)}
            placeholder="New password (min 6)" autoComplete="new-password" required minLength={6}
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm outline-none" />
          <input type="password" value={nextPwd2} onChange={(e) => setNextPwd2(e.target.value)}
            placeholder="Confirm new password" autoComplete="new-password" required minLength={6}
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm outline-none" />
          <button className="w-full rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background">Update password</button>
        </form>
      </section>

      {/* Adult PIN */}
      <section className="rounded-3xl border border-border bg-panel p-6">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <h2 className="font-display text-lg font-bold">{hasPin ? "Change adult PIN" : "Set adult PIN"}</h2>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">
          A 4–8 digit PIN required to open Settings. Kids don't have accounts, and this stops them from making changes if an adult is already signed in.
        </p>
        <form onSubmit={handleSetPin} className="space-y-3">
          <input type="password" value={pinPwd} onChange={(e) => setPinPwd(e.target.value)}
            placeholder="Current account password" autoComplete="current-password" required
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm outline-none" />
          <input type="password" inputMode="numeric" value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
            placeholder="New PIN (4–8 digits)" required minLength={4} maxLength={8}
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-center text-lg tracking-widest outline-none" />
          <input type="password" inputMode="numeric" value={newPin2}
            onChange={(e) => setNewPin2(e.target.value.replace(/\D/g, ""))}
            placeholder="Confirm PIN" required minLength={4} maxLength={8}
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-center text-lg tracking-widest outline-none" />
          <button className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground">
            {hasPin ? "Update PIN" : "Set PIN"}
          </button>
          {hasPin && (
            <button type="button" onClick={handleClearPin}
              className="w-full rounded-xl border border-destructive/40 py-2 text-xs font-semibold text-destructive">
              Remove PIN
            </button>
          )}
        </form>
      </section>

      {approvers.length === 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-panel p-4">
          <ShieldAlert className="mt-0.5 size-5 text-primary" />
          <div className="text-sm">
            <p className="font-semibold">No approvers yet</p>
            <p className="text-muted-foreground">Head to Family and mark at least one grown-up as an approver so chore completions can be confirmed.</p>
          </div>
        </div>
      )}

      <section className="rounded-3xl border border-border bg-panel p-6">
        <div className="mb-4 flex items-center gap-2">
          <Download className="size-5 text-primary" />
          <h2 className="font-display text-lg font-bold">Export backup</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Downloads an encrypted .fhb file with your family, chores, points, shopping list, meals and calendar.
          The passphrase never leaves your device.
        </p>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-muted-foreground" />
            <input type="password" value={exportPass} onChange={(e) => setExportPass(e.target.value)}
              placeholder="Passphrase (8+ characters)" autoComplete="new-password"
              className="flex-1 rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm outline-none" />
          </div>
          <button onClick={handleExport} disabled={busy || exportPass.length < 8}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-50">
            <Download className="size-4" /> Download encrypted backup
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-panel p-6">
        <div className="mb-4 flex items-center gap-2">
          <Upload className="size-5 text-primary" />
          <h2 className="font-display text-lg font-bold">Import backup</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Restore data from a .fhb file exported from another device. Merge keeps existing rows; Replace wipes them first.
        </p>
        <div className="space-y-3">
          <input type="file" accept=".fhb,application/octet-stream,application/json"
            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm" />
          <input type="password" value={importPass} onChange={(e) => setImportPass(e.target.value)}
            placeholder="Passphrase" autoComplete="current-password"
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm outline-none" />
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode("merge")}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${mode === "merge" ? "bg-primary text-primary-foreground" : "bg-canvas text-foreground"}`}>
              Merge
            </button>
            <button type="button" onClick={() => setMode("replace")}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${mode === "replace" ? "bg-primary text-primary-foreground" : "bg-canvas text-foreground"}`}>
              Replace
            </button>
          </div>
          {mode === "replace" && (
            <input value={replaceConfirm} onChange={(e) => setReplaceConfirm(e.target.value)}
              placeholder='Type REPLACE to confirm'
              className="w-full rounded-xl border border-destructive/40 bg-canvas px-3 py-2.5 text-sm outline-none" />
          )}
          <button onClick={handleImport} disabled={busy || !importFile || !importPass}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-50">
            <Upload className="size-4" /> Restore
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-panel p-6">
        <h2 className="mb-2 font-display text-lg font-bold">Approvers</h2>
        {approvers.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {approvers.map((m: { id: string; name: string; avatar_color: string }) => (
              <li key={m.id} className="inline-flex items-center gap-2 rounded-full bg-canvas px-3 py-1.5 text-sm">
                <span className="grid size-6 place-items-center rounded-full font-display text-xs font-bold" style={kidStyle(m.avatar_color)}>
                  {m.name.charAt(0).toUpperCase()}
                </span>
                {m.name}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
