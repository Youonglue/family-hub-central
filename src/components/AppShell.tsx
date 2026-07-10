import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { 
  LayoutDashboard, Trophy, ShoppingCart, ChefHat, 
  Calendar, Users, Settings, LogOut, ShieldCheck, Lock, Loader2 
} from "lucide-react";
import { useState, type ReactNode, useEffect } from "react";
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
  
  // Connect real-time muscle
  useLanLive(); 

  const [pinInput, setPinInput] = useState("");
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);

  // MUSCLE: Check Auth Status with full error safety
  const { data: me, isLoading, isError } = useQuery({ 
    queryKey: ["me"], 
    queryFn: () => getMe(),
    retry: 1
  });

  const isKiosk = pathname.startsWith("/kiosk");

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    try { await logout(); } catch { /* silient */ }
    navigate({ to: "/auth", replace: true });
  }

  // 1. SPLASH SCREEN (Prevents UI Jitter)
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center">
        <div className="size-20 bg-slate-900 rounded-[2rem] flex items-center justify-center shadow-2xl animate-bounce">
          <span className="text-white font-black text-3xl italic">H</span>
        </div>
        <div className="mt-8 flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-[0.3em]">
          <Loader2 className="animate-spin size-4" />
          Synchronizing Hub
        </div>
      </div>
    );
  }

  // 2. REDIRECT IF SESSION LOST
  if (isError || !me) {
    navigate({ to: "/auth" });
    return null;
  }

  // 3. THE ARMORED PIN GATE (Muscle Version)
  if (me?.needs_pin_setup === 1) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/20 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-500/20 rounded-full blur-[120px] animate-pulse" />
        </div>

        <div className="relative w-full max-w-md bg-white rounded-[4rem] p-10 shadow-[0_0_100px_rgba(0,0,0,0.5)] border-[12px] border-slate-50 text-center">
          <div className="size-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 text-indigo-400 shadow-2xl border-4 border-indigo-500/20">
            <ShieldCheck size={48} />
          </div>
          
          <h2 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 mb-2">Elevate Security</h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-10 leading-relaxed">
            Admin status detected.<br/>Set your 6-digit access code.
          </p>

          <div className="relative mb-8">
            <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 size-6" />
            <input 
              type="password" 
              inputMode="numeric"
              maxLength={6}
              autoFocus
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
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
                  toast.success("Identity Verified. Welcome Admin.");
                  window.location.reload(); 
                } else {
                  toast.error("Security mismatch. Try again.");
                }
              } catch (err) {
                toast.error("Network interface error.");
              } finally {
                setIsSubmittingPin(false);
              }
            }}
            className="w-full py-6 bg-slate-900 text-white rounded-[2.5rem] font-black text-2xl shadow-xl hover:bg-indigo-600 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20"
          >
            {isSubmittingPin ? "ENCRYPTING..." : "ACTIVATE ARMOR"}
          </button>
          
          <button onClick={signOut} className="mt-8 text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-rose-500 transition-colors">
            Exit to Gateway
          </button>
        </div>
      </div>
    );
  }

  // 4. MAIN LAYOUT
  return (
    <div className="min-h-screen bg-white">
      {/* Sidebar - Hidden on Kiosk */}
      {!isKiosk && (
        <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r-4 border-slate-50 bg-white md:flex z-40">
            <Link to="/dashboard" className="flex items-center gap-3 px-8 py-10">
            <div className="grid size-10 place-items-center rounded-2xl bg-slate-900 text-white font-black text-xl italic shadow-lg">
                H
            </div>
            <span className="font-display text-xl font-black uppercase italic tracking-tighter">The Hub</span>
            </Link>
            
            <nav className="flex-1 space-y-2 px-4">
            {nav.map((item) => {
                const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
                return (
                <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-4 rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-widest transition-all ${
                    active 
                        ? 'bg-slate-900 text-white shadow-xl translate-x-2' 
                        : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                    }`}
                >
                    <item.icon className={`size-5 ${active ? 'text-indigo-400' : ''}`} />
                    {item.label}
                </Link>
                );
            })}
            </nav>

            <div className="p-4 border-t-4 border-slate-50">
            <button
                onClick={signOut}
                className="flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-widest text-rose-300 hover:bg-rose-50 hover:text-rose-500 transition-all"
            >
                <LogOut className="size-5" />
                Disconnect
            </button>
            </div>
        </aside>
      )}

      {/* Mobile Nav - Hidden on Kiosk */}
      {!isKiosk && (
        <nav className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-[2.5rem] border-4 border-white bg-slate-900/90 backdrop-blur-xl px-3 py-3 shadow-2xl md:hidden">
            {nav.slice(0, 5).map((item) => {
            const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
            return (
                <Link
                key={item.to}
                to={item.to}
                className={`grid size-14 place-items-center rounded-[1.5rem] transition-all ${
                    active ? "bg-white text-slate-900 scale-110 shadow-lg" : "text-slate-400 hover:bg-white/10"
                }`}
                >
                <item.icon className="size-6" />
                </Link>
            );
            })}
        </nav>
      )}

      <main className={`${!isKiosk ? 'md:ml-64' : ''} min-h-screen transition-all`}>
        {children}
      </main>
    </div>
  );
}

/* Utility Styles for Family Heroes */
export const KID_COLORS = ["amber", "pink", "emerald", "sky", "rose", "violet", "indigo", "cyan"] as const;

export function kidStyle(color: string) {
  return { 
    backgroundColor: color || '#f1f5f9',
    boxShadow: `0 10px 25px -5px ${color}44`
  };
}
