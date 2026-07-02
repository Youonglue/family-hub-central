import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import {
  addShopping,
  clearCheckedShopping,
  deleteShopping,
  listShopping,
  toggleShopping,
} from "@/lib/hub-api";
import { Check, Plus, Trash2, Eraser } from "lucide-react";

export const Route = createFileRoute("/_authenticated/shopping")({
  ssr: false,
  component: ShoppingPage,
});

const CATEGORIES = ["general", "produce", "dairy", "bakery", "pantry", "frozen", "meal-plan"];

function ShoppingPage() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["shopping"], queryFn: () => listShopping() });
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [category, setCategory] = useState("general");

  const inv = () => qc.invalidateQueries({ queryKey: ["shopping"] });

  const add = useMutation({
    mutationFn: (v: { name: string; quantity: string; category: string }) => addShopping({ data: v }),
    onSuccess: () => {
      setName("");
      setQty("");
      inv();
    },
    onError: (e) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: (v: { id: string; checked: boolean }) => toggleShopping({ data: v }),
    onSuccess: inv,
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteShopping({ data: { id } }),
    onSuccess: inv,
  });
  const clear = useMutation({
    mutationFn: () => clearCheckedShopping(),
    onSuccess: () => {
      inv();
      toast.success("Cleared checked items");
    },
  });

  const items = list.data ?? [];
  const open = items.filter((i) => !i.checked);
  const done = items.filter((i) => i.checked);

  const byCategory = new Map<string, typeof open>();
  for (const it of open) {
    const key = it.category ?? "general";
    const arr = byCategory.get(key) ?? [];
    arr.push(it);
    byCategory.set(key, arr);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-10">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">To buy</p>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Shopping</h1>
          </div>
          {done.length > 0 && (
            <button
              onClick={() => clear.mutate()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-panel px-3 py-2 text-xs font-semibold hover:bg-muted"
            >
              <Eraser className="size-3.5" /> Clear done
            </button>
          )}
        </header>

        <form
          className="mb-6 rounded-3xl border border-border bg-panel p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            add.mutate({ name: name.trim(), quantity: qty.trim(), category });
          }}
        >
          <div className="grid gap-2 md:grid-cols-[1fr_140px_150px_auto]">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Add item…"
              className="rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm outline-none focus:border-foreground/40"
            />
            <input
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="qty"
              className="rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm outline-none"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!name.trim() || add.isPending}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-50"
            >
              <Plus className="size-4" /> Add
            </button>
          </div>
        </form>

        {open.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nothing to buy — you’re all set.
          </p>
        ) : (
          <div className="space-y-4">
            {Array.from(byCategory.entries()).map(([cat, arr]) => (
              <section key={cat} className="rounded-3xl border border-border bg-panel p-4">
                <h2 className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">{cat}</h2>
                <ul className="space-y-1.5">
                  {arr.map((it) => (
                    <li
                      key={it.id}
                      className="flex items-center gap-3 rounded-2xl bg-canvas px-3 py-2.5"
                    >
                      <button
                        onClick={() => toggle.mutate({ id: it.id, checked: true })}
                        className="grid size-6 place-items-center rounded-full border-2 border-border hover:border-foreground"
                        aria-label="Check"
                      />
                      <span className="flex-1 font-medium">{it.name}</span>
                      {it.quantity && <span className="text-xs text-muted-foreground">{it.quantity}</span>}
                      <button
                        onClick={() => del.mutate(it.id)}
                        className="rounded-xl p-1.5 text-muted-foreground hover:text-foreground"
                        aria-label="Delete"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        {done.length > 0 && (
          <section className="mt-6 rounded-3xl border border-border bg-panel p-4">
            <h2 className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Done</h2>
            <ul className="space-y-1.5">
              {done.map((it) => (
                <li key={it.id} className="flex items-center gap-3 rounded-2xl bg-canvas px-3 py-2.5 opacity-60">
                  <button
                    onClick={() => toggle.mutate({ id: it.id, checked: false })}
                    className="grid size-6 place-items-center rounded-full bg-primary text-primary-foreground"
                    aria-label="Uncheck"
                  >
                    <Check className="size-3.5" />
                  </button>
                  <span className="flex-1 font-medium line-through">{it.name}</span>
                  <button
                    onClick={() => del.mutate(it.id)}
                    className="rounded-xl p-1.5 text-muted-foreground hover:text-foreground"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </AppShell>
  );
}
