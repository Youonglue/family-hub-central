import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { login, register, getMe } from "@/lib/auth-client";
import { LogIn, UserPlus, MonitorPlay, ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

type AuthViewMode = "gateway" | "login" | "register";

function AuthPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<AuthViewMode>("gateway");
  const [firstRun, setFirstRun] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    // If we already have a session, skip the forms. If the DB is empty,
    // switch to signup so the first person becomes the admin.
    getMe().then((me) => {
      if (me && "id" in me && me.id) {
        navigate({ to: "/dashboard", replace: true });
      } else if (me && (me as { first_run?: boolean }).first_run) {
        setFirstRun(true);
        setViewMode("register");
      }
    }).catch(() => { 
      /* server offline; stay on form */ 
    }).finally(() => {
      setLoadingSession(false);
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setBusy(true);
    try {
      if (viewMode === "register") {
        await register(username.trim(), password);
        toast.success(firstRun ? "Admin account created — welcome!" : "Account created");
      } else {
        await login(username.trim(), password);
        toast.success("Signed in");
      }
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  // Safe unprivileged guest bypass for shared tablet kiosk mode
  const handleEnterKioskMode = async () => {
    setBusy(true);
    try {
      // Attempt to log in to the unprivileged shared kiosk guest account
      try {
        await login("kiosk_guest", "kiosk_guest_password");
      } catch {
        // If account doesn't exist yet, silently register it and then log in
        await register("kiosk_guest", "kiosk_guest_password");
        await login("kiosk_guest", "kiosk_guest_password");
      }
      toast.success("Kiosk Mode Activated");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error("Failed to activate Kiosk Mode");
    } finally {
      setBusy(false);
    }
  };

  // --- LOADING GUARDEE ---
  if (loadingSession) {
    return (
      <main className="grid min-h-screen place-items-center bg-canvas">
        <div className="text-center space-y-4">
          <Loader2 className="size-10 text-indigo-500 animate-spin mx-auto" />
          <p className="font-black text-slate-400 uppercase tracking-widest text-[10px] italic">Securing Portal...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 py-8 relative">
      <div className="w-full max-w-md bg-white rounded-[3rem] border-8 border-slate-50 p-6 sm:p-10 shadow-2xl animate-in zoom-in-95 duration-300">
        
        {/* --- SCREEN A: GATEWAY LANDING VIEW --- */}
        {viewMode === "gateway" && !firstRun && (
          <div className="space-y-8">
            <div className="text-center">
              <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-indigo-600 text-white font-display text-2xl font-black italic">H</div>
              <h1 className="font-display text-3xl font-black uppercase italic tracking-tighter text-slate-900">Family Hub</h1>
              <p className="mt-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest">Select Portal Gateway</p>
            </div>

            {/* Touch-Friendly Gateway Options */}
            <div className="flex flex-col gap-4">
              <button
                onClick={() => setViewMode("login")}
                disabled={busy}
                className="w-full py-4 sm:py-5 bg-slate-900 hover:bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-sm tracking-wider shadow-lg flex items-center justify-center gap-3 transition-all cursor-pointer min-h-[48px]"
              >
                <LogIn size={18} /> Log In
              </button>

              <button
                onClick={() => setViewMode("register")}
                disabled={busy}
                className="w-full py-4 sm:py-5 bg-white border-4 border-slate-50 text-slate-800 hover:border-indigo-500 rounded-[2rem] font-black uppercase text-sm tracking-wider shadow-md flex items-center justify-center gap-3 transition-all cursor-pointer min-h-[48px]"
              >
                <UserPlus size={18} /> Make Account
              </button>

              <div className="border-t border-slate-100 my-2" />

              <button
                onClick={handleEnterKioskMode}
                disabled={busy}
                className="w-full py-4 sm:py-5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-[2rem] font-black uppercase text-sm tracking-wider shadow-sm flex items-center justify-center gap-3 transition-all cursor-pointer min-h-[48px]"
              >
                <MonitorPlay size={18} /> Enter Kiosk Mode
              </button>
            </div>
          </div>
        )}

        {/* --- SCREEN B: LOGIN / REGISTER FORMS --- */}
        {(viewMode !== "gateway" || firstRun) && (
          <form onSubmit={submit} className="space-y-6">
            <div className="text-center">
              <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-indigo-600 text-white font-display text-xl font-black italic">H</div>
              <h1 className="font-display text-2xl sm:text-3xl font-black uppercase italic tracking-tighter text-slate-900">
                {firstRun ? "Admin Setup" : viewMode === "login" ? "Sign In" : "Register"}
              </h1>
              <p className="mt-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {firstRun
                  ? "Set up the primary admin account"
                  : viewMode === "login" ? "Enter Credentials" : "Create Family Account"}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Username</span>
                <input
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-2xl border-4 border-slate-50 bg-slate-50 p-4 font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Password</span>
                <input
                  type="password"
                  autoComplete={viewMode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border-4 border-slate-50 bg-slate-50 p-4 font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="submit"
                disabled={busy || !username.trim() || !password}
                className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-sm tracking-wider shadow-lg hover:bg-indigo-600 transition-all disabled:opacity-50 cursor-pointer min-h-[48px]"
              >
                {busy ? "Securing Portal..." : viewMode === "login" ? "Sign In" : "Create Account"}
              </button>

              {/* Back to Gateway Navigation */}
              {!firstRun && (
                <button
                  type="button"
                  onClick={() => {
                    setName("");
                    setPassword("");
                    setViewMode("gateway");
                  }}
                  className="w-full py-4 text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2 hover:text-slate-900 transition-all cursor-pointer"
                >
                  <ArrowLeft size={14} /> Back to Gateway
                </button>
              )}
            </div>

            {!firstRun && (
              <p className="text-center text-xs font-black uppercase tracking-widest text-slate-400 mt-4">
                {viewMode === "login" ? "Need an account?" : "Already have one?"}{" "}
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === "login" ? "register" : "login")}
                  className="font-black text-indigo-600 underline underline-offset-4"
                >
                  {viewMode === "login" ? "Register" : "Sign In"}
                </button>
              </p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
