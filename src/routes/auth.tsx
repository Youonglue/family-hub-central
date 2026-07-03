import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: s.mode === "signup" ? ("signup" as const) : ("signin" as const),
  }),
  ssr: false,
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{1,30}$/;

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
      // Simulation of auth for self-hosted mode
      await new Promise((resolve) => setTimeout(resolve, 500));

      const fakeSession = {
        user: { id: "local-user", email: `${uname}@family.local` },
      };
      localStorage.setItem("fake_session", JSON.stringify(fakeSession));

      toast.success(`Welcome, ${uname}!`);
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error("Error signing in.");
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
      </div>
    </main>
  );
}
