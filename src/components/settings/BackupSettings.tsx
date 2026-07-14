import { useState } from "react";
import { toast } from "sonner";
import { exportBackup } from "@/lib/hub-api";
import { encryptBundle, downloadBundle, type BackupBundle } from "@/lib/backup-crypto";
import { Download } from "lucide-react";

export function BackupSettings() {
  const [exportPass, setExportPass] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    if (exportPass.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }
    setBusy(true);
    try {
      const bundle = (await exportBackup()) as BackupBundle;
      const encrypted = await encryptBundle(bundle, exportPass);
      downloadBundle(`familyhub-backup.fhb`, encrypted);
      toast.success("Backup Ready!");
      setExportPass("");
    } catch (e) {
      toast.error("Backup Export Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[3rem] border-4 border-slate-50 bg-white p-8 shadow-sm animate-in fade-in duration-300">
      <div className="mb-4 flex items-center gap-2">
        <Download className="size-5 text-indigo-500" />
        <h2 className="font-display text-lg font-black uppercase italic">Extract Archive</h2>
      </div>
      <div className="space-y-4">
        <input 
          type="password" 
          value={exportPass} 
          onChange={(e) => setExportPass(e.target.value)} 
          placeholder="Set Archive Password (8+ chars)" 
          className="w-full rounded-2xl bg-slate-50 p-4 text-sm font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all" 
        />
        <button 
          onClick={handleExport} 
          disabled={busy || exportPass.length < 8} 
          className="w-full rounded-2xl bg-slate-900 py-4 text-xs font-black uppercase text-white shadow-lg disabled:opacity-20 flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all cursor-pointer"
        >
          <Download size={16} /> {busy ? "GENERATING BACKUP..." : "GENERATE BACKUP"}
        </button>
      </div>
    </section>
  );
}
