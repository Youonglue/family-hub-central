import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { UserPlus, ShieldCheck, Loader2 } from "lucide-react";

export function FamilyAccounts() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function createAccount(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const name = username.trim();

    if (!name || name.length > 64) {
      toast.error("Enter a username up to 64 characters.");
      return;
    }

    if (password.length < 8 || password.length > 256) {
      toast.error("Password must be 8–256 characters.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: name,
          password
        })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error || "Could not create account."
        );
      }

      toast.success(`Account "${name}" created successfully`);

      setUsername("");
      setPassword("");
      setConfirmPassword("");

    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Account creation failed"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border-2 border-slate-100 bg-white p-5 sm:p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
          <UserPlus size={24} />
        </div>
        <div>
          <h2 className="font-display text-lg font-black uppercase italic text-slate-900">
            Family Account Management
          </h2>
          <p className="text-xs text-slate-500 font-bold">
            Administrator-only account creation
          </p>
        </div>
      </div>

      <form onSubmit={createAccount} className="space-y-4">
        <div>
          <label htmlFor="new-family-username" className="block text-xs font-bold mb-2">
            Username
          </label>
          <input
            id="new-family-username"
            type="text"
            autoComplete="off"
            maxLength={64}
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Family member username"
            className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="new-family-password" className="block text-xs font-bold mb-2">
            Password
          </label>
          <input
            id="new-family-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={256}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="confirm-family-password" className="block text-xs font-bold mb-2">
            Confirm Password
          </label>
          <input
            id="confirm-family-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck size={18} className="text-emerald-600" />
          New accounts receive standard user permissions.
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full min-h-[48px] rounded-2xl bg-indigo-600 px-5 py-4 text-white font-black uppercase text-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? (
            <span className="flex justify-center items-center gap-2">
              <Loader2 size={18} className="animate-spin" />
              Creating Account...
            </span>
          ) : (
            "Create Family Account"
          )}
        </button>
      </form>
    </section>
  );
}
