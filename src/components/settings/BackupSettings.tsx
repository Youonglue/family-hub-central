// src/components/settings/BackupSettings.tsx
import { useState } from "react";
import { toast } from "sonner";
import { exportBackup } from "@/lib/hub-api";
import { encryptBundle, downloadBundle, type BackupBundle } from "@/lib/backup-crypto";
import { Download, Key, Database, ShieldAlert, Copy, Check } from "lucide-react";

export function BackupSettings() {
  const [exportPass, setExportPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  const [recoveryKeyBusy, setRecoveryKeyBusy] = useState(false);
  
  const [activeRecoveryKey, setActiveRecoveryKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // 1. Export Encrypted Full Backup Archive
  async function handleExport() {
    if (exportPass.length < 8) {
      toast.error("Archive password must be at least 8 characters long");
      return;
    }
    setBusy(true);
    try {
      const bundle = (await exportBackup()) as BackupBundle;
      const encrypted = await encryptBundle(bundle, exportPass);
      downloadBundle(`familyhub-backup.fhb`, encrypted);
      toast.success("Backup Archive Ready!");
      setExportPass("");
    } catch (e) {
      toast.error("Backup Export Failed");
    } finally {
      setBusy(false);
    }
  }

  // 2. Generate Emergency Master Recovery Key
  async function handleGenerateRecoveryKey() {
    setRecoveryKeyBusy(true);
    try {
      const res = await fetch("/api/auth/generate-recovery-key", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate recovery key");

      setActiveRecoveryKey(data.key);
      toast.success("New Master Recovery Key generated!");
    } catch (err) {
      toast.error((err as Error).message || "Recovery key generation failed");
    } finally {
      setRecoveryKeyBusy(false);
    }
  }

  // 3. Trigger Instant SQLite Snapshot on Server Disk
  async function handleCreateSnapshot() {
    setSnapshotBusy(true);
    try {
      const res = await fetch("/api/auth/create-snapshot", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Snapshot failed");

      toast.success(`Server snapshot created: ${data.filename}`);
    } catch (err) {
      toast.error((err as Error).message || "Failed to create database snapshot");
    } finally {
      setSnapshotBusy(false);
    }
  }

  const copyKeyToClipboard = () => {
    if (!activeRecoveryKey) return;
    navigator.clipboard.writeText(activeRecoveryKey);
    setCopied(true);
    toast.success("Recovery Key copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      
      {/* 1. MASTER EMERGENCY RECOVERY KEY */}
      <section className="rounded-3xl sm:rounded-[3rem] border-2 sm:border-4 border-slate-50 bg-white p-5 sm:p-8 shadow-sm">
        <div className="mb-4 sm:mb-6 flex items-center gap-3">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
            <Key className="size-5" />
          </div>
          <div>
            <h2 className="font-display text-base sm:text-lg font-black uppercase italic tracking-tight text-slate-900">
              Emergency Master Recovery
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Emergency fallback if you forget your Admin PIN or password
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs text-slate-500 font-bold leading-relaxed">
            Generate an Emergency Master Key. Keep this written down safely in your home. If you are ever locked out of your admin dashboard or PIN pad, you can use this key to immediately elevate access and reset credentials.
          </p>

          {activeRecoveryKey ? (
            <div className="bg-amber-50/80 border-2 border-amber-200 rounded-2xl p-4 sm:p-5 space-y-3 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-700">Active Recovery Key</span>
                <span className="text-[8px] font-bold uppercase text-amber-600">Save this now</span>
              </div>
              
              <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-amber-200 font-mono text-sm sm:text-base font-black text-slate-900 tracking-wider">
                <span>{activeRecoveryKey}</span>
                <button 
                  onClick={copyKeyToClipboard}
                  className="p-2 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                  title="Copy Key"
                >
                  {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                </button>
              </div>
            </div>
          ) : null}

          <button
            onClick={handleGenerateRecoveryKey}
            disabled={recoveryKeyBusy}
            className="w-full rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-95 py-4 text-xs font-black uppercase text-white shadow-lg transition-all cursor-pointer min-h-[48px] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <ShieldAlert size={16} /> {recoveryKeyBusy ? "GENERATING KEY..." : "GENERATE MASTER RECOVERY KEY"}
          </button>
        </div>
      </section>

      {/* 2. AUTOMATED SERVER SNAPSHOTS */}
      <section className="rounded-3xl sm:rounded-[3rem] border-2 sm:border-4 border-slate-50 bg-white p-5 sm:p-8 shadow-sm">
        <div className="mb-4 sm:mb-6 flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Database className="size-5" />
          </div>
          <div>
            <h2 className="font-display text-base sm:text-lg font-black uppercase italic tracking-tight text-slate-900">
              Database Snapshots
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Create instant backup copies in /data/backups/
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs text-slate-500 font-bold leading-relaxed">
            Create an immediate SQLite snapshot copy on your server disk. The system rotates and retains the latest 7 daily snapshots automatically.
          </p>

          <button
            onClick={handleCreateSnapshot}
            disabled={snapshotBusy}
            className="w-full rounded-2xl bg-slate-900 hover:bg-indigo-600 active:scale-95 py-4 text-xs font-black uppercase text-white shadow-lg transition-all cursor-pointer min-h-[48px] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Database size={16} /> {snapshotBusy ? "SAVING SNAPSHOT..." : "CREATE DATABASE SNAPSHOT NOW"}
          </button>
        </div>
      </section>

      {/* 3. ENCRYPTED ARCHIVE EXPORT TOOL */}
      <section className="rounded-3xl sm:rounded-[3rem] border-2 sm:border-4 border-slate-50 bg-white p-5 sm:p-8 shadow-sm">
        <div className="mb-4 sm:mb-6 flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Download className="size-5" />
          </div>
          <div>
            <h2 className="font-display text-base sm:text-lg font-black uppercase italic tracking-tight text-slate-900">
              Download Encrypted Archive
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Download an offline AES-encrypted file to your device
            </p>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <input 
            type="password" 
            value={exportPass} 
            onChange={(e) => setExportPass(e.target.value)} 
            placeholder="Set Archive Decryption Password (8+ chars)" 
            className="w-full rounded-2xl bg-slate-50 p-4 text-sm font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all min-h-[48px]" 
          />
          <button 
            onClick={handleExport} 
            disabled={busy || exportPass.length < 8} 
            className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 py-4 text-xs font-black uppercase text-white shadow-lg disabled:opacity-20 flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[48px]"
          >
            <Download size={16} /> {busy ? "GENERATING ARCHIVE..." : "DOWNLOAD ENCRYPTED ARCHIVE (.FHB)"}
          </button>
        </div>
      </section>

    </div>
  );
}
