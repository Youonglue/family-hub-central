import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, kidStyle } from "@/components/AppShell";
import {
  exportBackup, importBackup, listMembers,
} from "@/lib/hub-api";
import { encryptBundle, decryptBundle, downloadBundle, type BackupBundle } from "@/lib/backup-crypto";
import { Download, Upload, Lock, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  ssr: false,
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const members = useQuery({ queryKey: ["members"], queryFn: () => listMembers() });
  const [exportPass, setExportPass] = useState("");
  const [importPass, setImportPass] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [replaceConfirm, setReplaceConfirm] = useState("");
  const [busy, setBusy] = useState(false);

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
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  async function handleImport() {
    if (!importFile) { toast.error("Pick a .fhb file first"); return; }
    if (!importPass) { toast.error("Enter the passphrase"); return; }
    if (mode === "replace" && replaceConfirm !== "REPLACE") {
      toast.error('Type REPLACE to confirm wiping existing data'); return;
    }
    setBusy(true);
    try {
      const text = await importFile.text();
      const bundle = await decryptBundle(text, importPass);
      await importBackup({ data: { bundle: { version: 1, tables: bundle.tables as Record<string, Record<string, unknown>[]> }, mode } });
      toast.success("Backup restored");
      setImportFile(null); setImportPass(""); setReplaceConfirm("");
      await qc.invalidateQueries();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  const approvers = (members.data ?? []).filter((m: { is_parent?: boolean }) => m.is_parent);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-10 space-y-6">
        <header>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Data & devices</p>
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Settings</h1>
        </header>

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
      </div>
    </AppShell>
  );
}
