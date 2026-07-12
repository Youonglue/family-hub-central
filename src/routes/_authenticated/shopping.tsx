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
import { Check, Plus, Trash2, Eraser, ShoppingBag, Grid, X } from "lucide-react";
import { getMe } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated/shopping")({
  ssr: false,
  component: ShoppingPage,
});

const CATEGORIES = ["general", "produce", "dairy", "bakery", "pantry", "frozen", "meal-plan"];

function ShoppingPage() {
  const qc = useQueryClient();
  
  // Fetch active user session safely
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const list = useQuery({ queryKey: ["shopping"], queryFn: () => listShopping() });
  
  // Fetch custom staples from dynamic database library
  const staples = useQuery({ 
    queryKey: ["staples"], 
    queryFn: () => fetch('/api/shopping/staples').then(res => res.json()) 
  });

  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [category, setCategory] = useState("general");
  const [showEssentials, setShowEssentials] = useState(false);

  // Admin states for master library customization
  const [newStapleName, setNewStapleName] = useState("");
  const [newStapleCategory, setNewStapleCategory] = useState("general");

  const isAdmin = me.data?.role?.toLowerCase() === "admin";

  const inv = () => {
    qc.invalidateQueries({ queryKey: ["shopping"] });
    qc.invalidateQueries({ queryKey: ["staples"] });
  };

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

  const updateQty = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: string }) => 
      fetch(`/api/shopping/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity })
      }).then(res => res.json()),
    onSuccess: inv,
  });
  
  const del = useMutation({
    mutationFn: (id: string) => deleteShopping({ data: { id } }),
    onSuccess: inv,
  });

  // Mutations to customize master staples library (Admin Only check handled securely on backend)
  const addMasterStaple = useMutation({
    mutationFn: (data: { name: string; category: string }) => 
      fetch('/api/shopping/staples', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then(res => res.json()),
    onSuccess: () => {
      setNewStapleName("");
      inv();
      toast.success("Added to Master Staples!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add staple");
    }
  });

  const deleteMasterStaple = useMutation({
    mutationFn: (id: string) => 
      fetch(`/api/shopping/staples/${id}`, {
        method: "DELETE"
      }).then(res => res.json()),
    onSuccess: () => {
      inv();
      toast.success("Removed from Master Staples");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete staple");
    }
  });
  
  const clear = useMutation({
    mutationFn: () => clearCheckedShopping(),
    onSuccess: () => {
      inv();
      toast.success("Cleared checked items");
    },
  });

  // --- SESSION LOADING GUARD ---
  if (me.isLoading || list.isLoading || staples.isLoading) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[85vh] p-6">
          <p className="font-black text-slate-400 uppercase tracking-widest text-xs italic animate-pulse">Synchronizing Pantry...</p>
        </div>
      </AppShell>
    );
  }

  const items = list.data ?? [];
  const open = items.filter((i) => !i.checked);
  const done = items.filter((i) => i.checked);

  // Group and sort staples alphabetically on load to guarantee alphabetical order
  const stapleList = Array.isArray(staples.data) 
    ? [...staples.data].sort((a, b) => a.name.localeCompare(b.name)) 
    : [];

  // Group items by category for rendering
  const byCategory = new Map<string, typeof open>();
  for (const it of open) {
    const key = it.category ?? "general";
    const arr = byCategory.get(key) ?? [];
    arr.push(it);
    byCategory.set(key, arr);
  }

  // Toggle function for quick-add essentials
  const handleToggleEssential = (essName: string, essCategory: string) => {
    const existing = items.find((i) => i.name.toLowerCase() === essName.toLowerCase() && !i.checked);
    if (existing) {
      del.mutate(existing.id);
    } else {
      add.mutate({ name: essName, quantity: "1", category: essCategory });
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-10 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">To buy</p>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Shopping</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowEssentials(!showEssentials)}
              className={`inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold shadow-sm transition-all ${showEssentials ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-panel hover:bg-muted'}`}
            >
              <Grid className="size-3.5" /> {showEssentials ? "Hide Staples" : "Staples Grid"}
            </button>
            {done.length > 0 && (
              <button
                onClick={() => clear.mutate()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-panel px-3 py-2 text-xs font-semibold hover:bg-muted"
              >
                <Eraser className="size-3.5" /> Clear done
              </button>
            )}
          </div>
        </header>

        {/* --- DYNAMIC STAPLES PANEL (Admin Customizable & Alphabetical) --- */}
        {showEssentials && (
          <section className="p-6 bg-slate-900 text-white rounded-[2.5rem] shadow-xl border-4 border-slate-800 animate-in zoom-in-95 duration-200 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="size-5 text-indigo-400" />
                <h2 className="font-display text-lg font-black uppercase italic">Custom Staples Library</h2>
              </div>
              
              {/* ALWAYS VISIBLE ADD STAPLE FORM (Disabled/labeled for non-admins) */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!isAdmin) {
                    toast.error("Admin privilege required!");
                    return;
                  }
                  if (!newStapleName.trim()) return;
                  addMasterStaple.mutate({ name: newStapleName.trim(), category: newStapleCategory });
                }}
                className="flex items-center gap-2 bg-white/5 p-2 rounded-2xl border border-white/10"
              >
                <input
                  value={newStapleName}
                  onChange={(e) => setNewStapleName(e.target.value)}
                  placeholder={isAdmin ? "New Master Staple..." : "Admin Only"}
                  disabled={!isAdmin}
                  className="p-2 text-xs bg-transparent border-none outline-none font-bold text-white placeholder:text-white/30 disabled:opacity-50"
                  required
                />
                <select
                  value={newStapleCategory}
                  disabled={!isAdmin}
                  onChange={(e) => setNewStapleCategory(e.target.value)}
                  className="bg-slate-800 border-none outline-none text-[10px] font-black uppercase rounded-lg p-2 cursor-pointer disabled:opacity-50"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button 
                  type="submit" 
                  disabled={!isAdmin || addMasterStaple.isPending}
                  className="p-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Plus size={14} />
                </button>
              </form>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {stapleList.map((ess: any) => {
                const isActive = items.some((i) => i.name.toLowerCase() === ess.name.toLowerCase() && !i.checked);
                return (
                  <div
                    key={ess.id}
                    className={`relative rounded-xl transition-all border-2 flex items-center group overflow-hidden ${
                      isActive 
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md scale-[1.01]' 
                        : 'bg-white/5 text-slate-300 border-transparent hover:bg-white/10'
                    }`}
                  >
                    {/* Toggle button: pr-8 leaves safe space for the absolute (X) button */}
                    <button
                      onClick={() => handleToggleEssential(ess.name, ess.category)}
                      className="p-3 pr-8 font-bold text-[10px] sm:text-xs uppercase tracking-wider text-left flex-1 h-full flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate pr-1" title={ess.name}>{ess.name}</span>
                      {isActive && <Check className="size-3.5 text-white shrink-0 ml-1" />}
                    </button>

                    {/* Admin library deletion button: Absolutely positioned so long text never pushes it off-screen */}
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isAdmin) {
                            toast.error("Admin privilege required to delete staples");
                            return;
                          }
                          if (confirm(`Remove "${ess.name}" from your master staples library?`)) {
                            deleteMasterStaple.mutate(ess.id);
                          }
                        }}
                        className="absolute top-1/2 -translate-y-1/2 right-2 size-5 bg-slate-800 text-slate-400 rounded-md border border-white/5 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all hidden group-hover:flex cursor-pointer z-10"
                        title={isAdmin ? "Delete from Master Library" : "Admin Privilege Required"}
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <form
          className="rounded-3xl border border-border bg-panel p-4"
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
                      
                      {/* Interactive Quantity Input (Updates as you type) */}
                      <input
                        type="text"
                        value={it.quantity || ""}
                        onChange={(e) => updateQty.mutate({ id: it.id, quantity: e.target.value })}
                        placeholder="qty"
                        className="w-16 text-center text-xs font-black bg-panel border-2 border-slate-100 rounded-xl py-1.5 px-2 focus:border-indigo-500 outline-none transition-all"
                      />

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
