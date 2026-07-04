import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { login, register, getMe } from "@/lib/auth-client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [firstRun, setFirstRun] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // If we already have a session, skip the form. If the DB is empty,
    // switch to signup so the first person becomes the admin.
    getMe().then((me) => {
      if (me && "id" in me) {
        navigate({ to: "/dashboard", replace: true });
      } else if (me && (me as { first_run?: boolean }).first_run) {
        setFirstRun(true);
        setMode("register");
      }
    }).catch(() => { /* server offline; stay on form */ });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setBusy(true);
    try {
      if (mode === "register") {
        await register(username.trim(), password);
        toast.success(firstRun ? "Admin account created — welcome!" : "Account created");
      } else {
        await login(username.trim(), password);
        toast.success("Signed in");
      }
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-3xl border border-border bg-panel p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground font-display text-2xl font-bold">H</div>
          <h1 className="font-display text-2xl font-bold">Family Hub</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {firstRun
              ? "Set up the admin account for this server."
              : mode === "login" ? "Sign in to continue" : "Create a new family account"}
          </p>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">Username</span>
          <input
            autoFocus
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-canvas px-3 py-2 text-sm"
            required
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">Password</span>
          <input
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-canvas px-3 py-2 text-sm"
            minLength={6}
            required
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
        </button>

        {!firstRun && (
          <p className="text-center text-xs text-muted-foreground">
            {mode === "login" ? "Need an account?" : "Already have one?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              {mode === "login" ? "Register" : "Sign in"}
            </button>
          </p>
        )}
      </form>
    </main>
  );
}
