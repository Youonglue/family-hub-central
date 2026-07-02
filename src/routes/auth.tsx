import { createFileRoute, useNavigate, redirect, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: s.mode === "signup" ? ("signup" as const) : ("signin" as const),
  }),
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(mode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => setIsSignup(mode === "signup"), [mode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Welcome! Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Sign-in failed");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <main className="min-h-screen bg-canvas grid place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="grid size-9 place-items-center rounded-2xl bg-primary text-primary-foreground font-display font-bold">
            H
          </div>
          <span className="font-display text-lg font-bold">Family Hub</span>
        </Link>

        <div className="rounded-3xl bg-panel border border-border shadow-sm p-6">
          <h1 className="font-display text-2xl font-bold text-center">
            {isSignup ? "Create your hub" : "Welcome back"}
          </h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            {isSignup ? "Set up your family in under a minute." : "Sign in to your family hub."}
          </p>

          <button
            type="button"
            onClick={google}
            disabled={busy}
            className="mt-6 w-full rounded-xl border border-border bg-panel py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.8c2.3-2.1 3.6-5.2 3.6-8.6z"/>
              <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.8-3c-1.1.7-2.5 1.1-4.1 1.1-3.2 0-5.8-2.1-6.8-5H1.3v3.1C3.2 21.3 7.3 24 12 24z"/>
              <path fill="#FBBC05" d="M5.2 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.6H1.3C.5 8.2 0 10.1 0 12s.5 3.8 1.3 5.4l3.9-3.1z"/>
              <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4C18 1.2 15.2 0 12 0 7.3 0 3.2 2.7 1.3 6.6l3.9 3.1C6.2 6.9 8.8 4.8 12 4.8z"/>
            </svg>
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or email
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {isSignup && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border border-border bg-panel px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@family.com"
              className="w-full rounded-xl border border-border bg-panel px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 chars)"
              className="w-full rounded-xl border border-border bg-panel px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? "…" : isSignup ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {isSignup ? "Already have an account?" : "New here?"}{" "}
            <button
              type="button"
              onClick={() => setIsSignup((v) => !v)}
              className="font-semibold text-primary hover:underline"
            >
              {isSignup ? "Sign in" : "Create your hub"}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
