import { createFileRoute, useNavigate, redirect, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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

// Family Hub uses username + password only. No email is ever sent — the
// backend just needs *some* unique identifier per account, so we normalise
// the username into a synthetic address (`<username>@family.local`). The
// local part is what the user types; the domain is never shown or emailed.
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{1,30}$/;

function toSyntheticEmail(username: string) {
  return `${username.trim().toLowerCase()}@family.local`;
}

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(mode === "signup");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => setIsSignup(mode === "signup"), [mode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const uname = username.trim().toLowerCase();
    if (!USERNAME_RE.test(uname)) {
      toast.error("Username must be 2–31 chars, letters/numbers/._- only.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password needs at least 6 characters.");
      return;
    }

    setBusy(true);
    try {
      const email = toSyntheticEmail(uname);
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Auto-confirm is on server-side, so no email is ever sent.
            emailRedirectTo: window.location.origin,
            data: { display_name: uname, username: uname },
          },
        });
        if (error) throw error;
        // If the session didn't hydrate from signUp, sign in explicitly.
        const { data: sess } = await supabase.auth.getSession();
        if (!sess.session) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
          if (signInErr) throw signInErr;
        }
        toast.success(`Welcome, ${uname}!`);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (/invalid/i.test(error.message)) throw new Error("Wrong username or password.");
          throw error;
        }
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
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
            {isSignup
              ? "Pick a username and password — no email needed."
              : "Sign in with your family username."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Username</span>
              <input
                autoFocus
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. mum, dad, olivia"
                className="w-full rounded-xl border border-border bg-panel px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Password</span>
              <input
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-xl border border-border bg-panel px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
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

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Usernames stay on your family hub. No email is ever sent.
        </p>
      </div>
    </main>
  );
}
