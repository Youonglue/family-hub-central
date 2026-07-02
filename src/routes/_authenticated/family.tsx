import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, KID_COLORS, kidStyle } from "@/components/AppShell";
import { addMember, deleteMember, listMembers } from "@/lib/hub.functions";
import { Trash2, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/family")({
  ssr: false,
  component: FamilyPage,
});

function FamilyPage() {
  const qc = useQueryClient();
  const members = useQuery({ queryKey: ["members"], queryFn: () => listMembers() });
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>("amber");
  const [isKid, setIsKid] = useState(true);

  const add = useMutation({
    mutationFn: (v: { name: string; avatar_color: string; is_kid: boolean }) => addMember({ data: v }),
    onSuccess: () => {
      setName("");
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["points"] });
      toast.success("Added");
    },
    onError: (e) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteMember({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["points"] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-10">
        <header className="mb-8">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Setup</p>
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Family</h1>
        </header>

        <section className="mb-8 rounded-3xl border border-border bg-panel p-6">
          <h2 className="mb-4 font-display text-lg font-bold">Add a family member</h2>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              add.mutate({ name: name.trim(), avatar_color: color, is_kid: isKid });
            }}
          >
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm outline-none focus:border-foreground/40"
                placeholder="e.g. Ada"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Colour
              </label>
              <div className="flex flex-wrap gap-2">
                {KID_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColor(c)}
                    className={`size-10 rounded-2xl border-2 transition-transform ${
                      color === c ? "border-foreground scale-105" : "border-transparent"
                    }`}
                    style={kidStyle(c)}
                    aria-label={c}
                  >
                    <span className="font-display text-sm font-bold">{c[0]?.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsKid(true)}
                className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                  isKid ? "bg-primary text-primary-foreground" : "bg-canvas text-foreground"
                }`}
              >
                Kid
              </button>
              <button
                type="button"
                onClick={() => setIsKid(false)}
                className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                  !isKid ? "bg-primary text-primary-foreground" : "bg-canvas text-foreground"
                }`}
              >
                Grown-up
              </button>
            </div>
            <button
              type="submit"
              disabled={add.isPending || !name.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-50"
            >
              <UserPlus className="size-4" /> Add member
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-border bg-panel p-6">
          <h2 className="mb-4 font-display text-lg font-bold">Members</h2>
          {(members.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No one here yet.</p>
          ) : (
            <ul className="space-y-2">
              {(members.data ?? []).map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-2xl bg-canvas p-3">
                  <span
                    className="grid size-10 place-items-center rounded-2xl font-display text-base font-bold"
                    style={kidStyle(m.avatar_color ?? "amber")}
                  >
                    {(m.name ?? "?").charAt(0).toUpperCase()}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.is_kid ? "Kid" : "Grown-up"}</p>
                  </div>
                  <button
                    onClick={() => del.mutate(m.id)}
                    className="rounded-xl p-2 text-muted-foreground hover:bg-panel hover:text-foreground"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
