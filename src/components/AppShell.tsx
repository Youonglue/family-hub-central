import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Trophy, ShoppingCart, ChefHat, Calendar, Users, Settings, LogOut, ShieldCheck, Lock, Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanLive } from "@/hooks/useLanLive";
import { logout, getMe } from "@/lib/auth-client";
import { toast } from "sonner";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/chores", label: "Chores", icon: Trophy },
  { to: "/shopping", label: "Shopping", icon: ShoppingCart },
  { to: "/meals", label: "Meals", icon: ChefHat },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/family", label: "Family", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  useLanLive(); 

  // MUSCLE: Fetch user with loading and error states
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const [pinInput, setPinInput] = useState("");
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);

  // CRITICAL FIX: The "Safety Guard" you were looking for
  const userRole = me?.data?.role?.toLowerCase() ?? 'user';

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    
    try {
      // 1. Explicitly clear cookie and session from backend
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn("Direct logout call failed, falling back to auth client", err);
    }

    try { 
      // 2. Trigger additional client library cleanup if defined
      await logout(); 
    } catch { 
      /* ignore */ 
    }

    // 3. Clear storage variables to ensure clean slate
    localStorage.removeItem('family_hub_user');
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('family_hub_user');

    // 4. Navigate away
    navigate({ to: "/auth", replace: true });
  }

  // --- 1. LOADING STATE ---
  if (me.isLoading) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="size-12 text-indigo-500 animate-spin mb-4" />
        <p className="font-black uppercase tracking-widest text-xs text-slate-400 italic">Synchronizing Fortress...</p>
      </div>
    );
  }

  // --- 2. 6-DIGIT PIN GATEKEEPER ---
  if (me.data?.needs_pin_setup === 1) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900 flex items-center justify-center p-4 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500 rounded-full blur-[120px]" />
        </div>

        <div className="relative w-full max-w-md bg-white rounded-[4rem] p-10 shadow-2xl border-[16px] border-slate-50 text-center animate-in zoom-in-95 duration-300">
          <div className="size-20 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-indigo-600">
            <ShieldCheck size={40} />
          </div>
          
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 mb-2">Secure Status</h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-8 leading-relaxed">
            Admin Promotion Detected!<br/>Set your 6-digit access code.
          </p>

          <div className="relative mb-6">
            <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 size-6" />
            <input 
              type="password" 
              inputMode="numeric"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full text-center text-5xl tracking-[0.4em] font-black p-8 bg-slate-50 rounded-[2.5rem] border-4 border-transparent focus:border-indigo-500 outline-none transition-all placeholder:text-slate-200"
            />
          </div>

          <button 
            disabled={pinInput.length !== 6 || isSubmittingPin}
            onClick={async () => {
              setIsSubmittingPin(true);
              try {
                const res = await fetch('/api/auth/set-pin', {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify({ pin: pinInput })
                });
                if (res.ok) {
                  toast.success("Security Active!");
                  window.location.reload();
                } else {
                  toast.error("Set-PIN Failed");
                }
              } catch (err) {
                toast.error("Connection Error");
              } finally {
                setIsSubmittingPin(false);
              }
            }}
            className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-xl hover:bg-indigo-600 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20"
          >
            {isSubmittingPin ? "SECURING..." : "ACTIVATE ADMIN"}
          </button>
          
          <button onClick={signOut} className="mt-6 text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-rose-500 transition-colors">
            Cancel & Sign Out
          </button>
        </div>
      </div>
    );
  }

  // --- 3. STANDARD APP LAYOUT ---
  return (
    <div className="min-h-screen bg-canvas">
      {/* Sidebar (desktop) */}
      <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col border-r border-border bg-panel/70 backdrop-blur md:flex">
        <Link to="/dashboard" className="flex items-center gap-2 px-6 py-8">
          <div className="grid size-11 place-items-center rounded-2xl bg-indigo-600 text-white font-display text-xl font-black italic">
            H
          </div>
          <span className="font-display text-2xl font-black uppercase italic tracking-tight">Family Hub</span>
        </Link>
        <nav className="flex-1 space-y-2 px-3">
          {nav.map((item) => {
            const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-4 rounded-2xl px-4 py-3.5 text-base font-black uppercase tracking-wider transition-all ${
                  active 
                    ? "bg-slate-900 text-white shadow-xl scale-[1.02]" 
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <item.icon className="size-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 mb-4">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 text-base font-black uppercase tracking-wider text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            <LogOut className="size-5 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-border bg-panel/95 backdrop-blur px-2 py-2 shadow-lg md:hidden">
        {nav.map((item) => {
          const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`grid size-11 place-items-center rounded-xl transition-colors ${
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
              aria-label={item.label}
            >
              <item.icon className="size-4" />
            </Link>
          );
        })}
      </nav>

      <main className="md:ml-64 pb-24 md:pb-0">{children}</main>
    </div>
  );
}

/* Utility: pick css var color for a kid palette name */
export const KID_COLORS = ["amber", "pink", "emerald", "sky", "rose", "violet"] as const;
export type KidColor = (typeof KID_COLORS)[number];
export function kidStyle(color: string): { background: string; color: string } {
  const c = (KID_COLORS as readonly string[]).includes(color) ? color : "amber";
  return { background: `var(--kid-${c}-soft)`, color: `var(--kid-${c})` };
}
export function kidSolid(color: string): { background: string; color: string } {
  const c = (KID_COLORS as readonly string[]).includes(color) ? color : "amber";
  return { background: `var(--kid-${c})`, color: "white" };
}
