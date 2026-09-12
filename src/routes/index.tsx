// src/routes/index.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, UserPlus, Loader2, Sparkles, Lock } from "lucide-react";
import { getMe, register } from "@/lib/auth-client";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  ssr: false,
  component: EntryGatekeeper,
});

function EntryGatekeeper() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [isFirstRun, setIsFirstRun] = useState(false);

  // First Run Setup States
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Check if system has users or if it's the first ever boot
    getMe()
      .then((me: any) => {
        if (me?.first_run === true) {
          // 0 users in database -> Show First-Time Admin Initialization Screen
          setIsFirstRun(true);
          setLoading(false);
        } else {
          // Normal state -> Bypass landing page completely and boot straight into Kiosk!
          navigate({ to: "/dashboard", replace: true });
        }
      })
      .catch(() => {
        // Fallback directly to kiosk dashboard
        navigate({ to: "/dashboard", replace: true });
      });
  }, [navigate]);

  // Handle First-Ever Admin Account Creation (Automatically assigned Admin privileges)
  const handleCreateFirstAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername.trim() || adminPassword.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      await register(adminUsername.trim(), adminPassword);
      toast.success("Primary Administrator Created! Welcome to Family Hub! 🛡️", { position: "top-center" });
      navigate({ to: "/dashboard", replace: true });
    } catch (err: any) {
      toast.error(err.message || "Failed to initialize admin account");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. Loading Spinner during Instant Kiosk Boot
  if (loading) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-canvas">
        <div className="text-center space-y-3 animate-pulse">
          <Loader2 className="size-10 text-indigo-600 animate-spin mx-auto" />
          <p className="font-black text-slate-400 uppercase tracking-widest text-[10px] italic">
            Launching Kiosk...
          </p>
        </div>
      </main>
    );
  }

  // 2. First-Ever Boot Screen (Only visible if 0 users exist in the database)
  if (isFirstRun) {
    return (
      <main className="min-h-[100dvh] bg-slate-950 flex items-center justify-center p-4 sm:p-6 select-none">
        <div className="w-full max-w-md bg-slate-900 border-2 sm:border-4 border-slate-800 rounded-3xl sm:rounded-[3.5rem] p-6 sm:p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-300 my-auto text-white">
          
          <div className="size-16 sm:size-20 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck size={36} />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest border border-indigo-500/30 mb-2">
              <Sparkles size={12} /> First-Time Setup
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tight text-white">
              Initialize Family Hub
            </h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
              Create your primary administrator account
            </p>
          </div>

          <form onSubmit={handleCreateFirstAdmin} className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-2">
                Admin Username
              </label>
              <input
                type="text"
                required
                value={adminUsername}
                onChange={e => setAdminUsername(e.target.value)}
                placeholder="e.g. Mum or Dad"
                className="w-full p-4 bg-slate-950 border-2 border-slate-800 focus:border-indigo-500 rounded-2xl text-sm font-black outline-none text-white min-h-[48px]"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-2">
                Admin Password
              </label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                placeholder="Choose Password (4+ characters)"
                className="w-full p-4 bg-slate-950 border-2 border-slate-800 focus:border-indigo-500 rounded-2xl text-sm font-black outline-none text-white min-h-[48px]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !adminUsername.trim() || adminPassword.length < 4}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all cursor-pointer min-h-[48px] flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin size-4" />
                ) : (
                  <UserPlus size={16} />
                )}
                {isSubmitting ? "Creating Admin..." : "Initialize Fortress"}
              </button>
            </div>
          </form>

          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
            This account receives automatic primary admin privileges. Additional heroes can be added in Settings.
          </p>
        </div>
      </main>
    );
  }

  return null;
}
