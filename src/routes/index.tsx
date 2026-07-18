import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Calendar, Trophy, ShoppingCart, ChefHat, Home, Sparkles, LogIn, MonitorPlay, Loader2 } from "lucide-react";
import { getMe, login, register } from "@/lib/auth-client";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Landing,
});

function Feature({ icon: Icon, title, desc, tint }: { icon: typeof Calendar; title: string; desc: string; tint: string }) {
  return (
    <div className="rounded-[2.5rem] bg-panel border-4 border-slate-50 p-6 md:p-8 shadow-xl flex flex-col items-center sm:items-start text-center sm:text-left gap-3">
      <div
        className="inline-flex size-12 items-center justify-center rounded-2xl shadow-inner shrink-0"
        style={{ background: `var(--kid-${tint}-soft)`, color: `var(--kid-${tint})` }}
      >
        <Icon className="size-6" />
      </div>
      <div>
        <h3 className="font-display text-xl font-black uppercase italic tracking-tight text-slate-800">{title}</h3>
        <p className="mt-1 text-sm font-medium text-slate-400 leading-relaxed uppercase text-[11px]">{desc}</p>
      </div>
    </div>
  );
}

function Landing() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [checkingSession, setCheckingSession] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Session Guard: If a login session already exists, bypass landing and go straight to dashboard
    getMe().then((me) => {
      if (me && "id" in me && me.id) {
        navigate({ to: "/dashboard", replace: true });
      }
    }).catch(() => {
      // Stay on page if offline
    }).finally(() => {
      setCheckingSession(false);
    });
  }, [navigate]);

  // Safe unprivileged guest bypass for shared tablet kiosk mode (matches auth.tsx)
  const handleEnterKioskMode = async () => {
    setBusy(true);
    try {
      try {
        await login("kiosk_guest", "kiosk_guest_password");
      } catch {
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

  // --- SESSION CHECKING LOADER ---
  if (checkingSession) {
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
    <main className="min-h-screen bg-canvas flex flex-col justify-between">
      
      {/* Header */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8 shrink-0">
        <div className="flex items-center gap-2">
          <div className="grid size-11 place-items-center rounded-2xl bg-indigo-600 text-white font-display text-xl font-black italic">
            H
          </div>
          <span className="font-display text-2xl font-black uppercase italic tracking-tight text-slate-900">Family Hub</span>
        </div>
        <div>
          <Link
            to="/auth"
            className="rounded-2xl border-4 border-slate-50 bg-white px-6 py-3 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-all shadow-sm"
          >
            Sign In / Register
          </Link>
        </div>
      </header>

      {/* Hero Welcome Section */}
      <section className="mx-auto max-w-4xl px-6 pt-10 pb-16 text-center space-y-6">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border-2 border-slate-100 bg-white px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 shadow-sm">
          <Sparkles className="size-3.5 text-indigo-500 animate-pulse" /> Self-Hosted Family Portal
        </div>
        
        <h1 className="mx-auto max-w-3xl font-display text-5xl md:text-6xl font-black italic uppercase leading-[1.05] tracking-tighter text-slate-900">
          The warm, kid-friendly dashboard for your family.
        </h1>
        
        <p className="mx-auto max-w-xl text-sm md:text-base font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
          Shared calendar, gamified chores with points and a leaderboard, meal planner, and shopping list. Made to sit on your shared kitchen tablet.
        </p>

        {/* Tablet-friendly large button actions */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/auth"
            className="w-full sm:w-auto py-5 px-10 bg-slate-900 hover:bg-indigo-600 text-white rounded-[2.5rem] font-black uppercase text-sm tracking-wider shadow-lg flex items-center justify-center gap-3 transition-all cursor-pointer min-h-[48px]"
          >
            <LogIn size={18} /> Enter Fortress
          </Link>
          <button
            onClick={handleEnterKioskMode}
            disabled={busy}
            className="w-full sm:w-auto py-5 px-10 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-[2.5rem] font-black uppercase text-sm tracking-wider shadow-sm flex items-center justify-center gap-3 transition-all cursor-pointer min-h-[48px] disabled:opacity-50"
          >
            <MonitorPlay size={18} /> {busy ? "Loading..." : "Launch Kiosk"}
          </button>
        </div>
      </section>

      {/* Features Grid (Optimized responsive columns for Tablet/Mobile) */}
      <section className="mx-auto max-w-6xl px-6 pb-24 w-full">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Feature icon={Trophy} title="Chores & points" tint="amber" desc="Kids tap to complete, earn points, and unlock rewards you set." />
          <Feature icon={Calendar} title="Shared calendar" tint="sky" desc="Every family member colour-coded. Add events and see today at a glance." />
          <Feature icon={ShoppingCart} title="Shopping list" tint="emerald" desc="Categorised, live for everyone. Auto-fills ingredients from your meal plan." />
          <Feature icon={ChefHat} title="Meal planner" tint="rose" desc="Plan the week, save recipes, and one-click generate the shopping list." />
          <Feature icon={Trophy} title="Leaderboard" tint="pink" desc="Weekly ranking, streaks, and badges — big satisfying numbers." />
          <Feature icon={Home} title="Home Assistant ready" tint="violet" desc="Publishes chore events so you can trigger smart home automations." />
        </div>
      </section>
    </main>
  );
}
