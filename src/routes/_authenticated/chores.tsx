import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, kidStyle } from "@/components/AppShell";
import {
  addChore,
  addReward,
  approveCompletion,
  completeChore,
  deleteChore,
  deleteReward,
  listChores,
  listMembers,
  listPoints,
  listRewards,
  pendingApprovals,
  recentCompletions,
  redeemReward,
  rejectCompletion,
} from "@/lib/hub-api";
import { CheckCircle2, Clock, Gift, Plus, Sparkles, Trash2, Trophy, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chores")({
  ssr: false,
  component: ChoresPage,
});

function ChoresPage() {
  const qc = useQueryClient();
  const members = useQuery({ queryKey: ["members"], queryFn: () => listMembers() });
  const chores = useQuery({ queryKey: ["chores"], queryFn: () => listChores() });
  const points = useQuery({ queryKey: ["points"], queryFn: () => listPoints() });
  const rewards = useQuery({ queryKey: ["rewards"], queryFn: () => listRewards() });
  const recent = useQuery({ queryKey: ["completions"], queryFn: () => recentCompletions() });
  const pending = useQuery({ queryKey: ["pending-approvals"], queryFn: () => pendingApprovals() });

  const [tab, setTab] = useState<"chores" | "leaderboard" | "rewards" | "approvals">("leaderboard");
  const [choreTitle, setChoreTitle] = useState("");
  const [chorePoints, setChorePoints] = useState(10);
  const [choreMember, setChoreMember] = useState<string>("");
  const [rewardTitle, setRewardTitle] = useState("");
  const [rewardCost, setRewardCost] = useState(50);
  const [popId, setPopId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<string>("");

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["chores"] });
    qc.invalidateQueries({ queryKey: ["points"] });
    qc.invalidateQueries({ queryKey: ["completions"] });
    qc.invalidateQueries({ queryKey: ["rewards"] });
    qc.invalidateQueries({ queryKey: ["pending-approvals"] });
  };

  const approve = useMutation({
    mutationFn: (v: { id: string; approver_id: string }) => approveCompletion({ data: v }),
    onSuccess: () => { invalidateAll(); toast.success("Approved · points awarded 🎉"); },
    onError: (e) => toast.error(e.message),
  });
  const reject = useMutation({
    mutationFn: (v: { id: string; approver_id: string }) => rejectCompletion({ data: v }),
    onSuccess: () => { invalidateAll(); toast.success("Rejected"); },
    onError: (e) => toast.error(e.message),
  });

  const addC = useMutation({
    mutationFn: (v: { title: string; points: number; member_id: string | null }) =>
      addChore({ data: { ...v, recurrence: "daily" } }),
    onSuccess: () => {
      setChoreTitle("");
      setChorePoints(10);
      setChoreMember("");
      invalidateAll();
      toast.success("Chore added");
    },
    onError: (e) => toast.error(e.message),
  });
  const delC = useMutation({
    mutationFn: (id: string) => deleteChore({ data: { id } }),
    onSuccess: invalidateAll,
  });
  const complete = useMutation({
    mutationFn: (v: { chore_id: string; member_id: string }) => completeChore({ data: v }),
    onSuccess: (_res, v) => {
      setPopId(v.chore_id);
      setTimeout(() => setPopId(null), 700);
      toast.success("Sent for approval ✅", { icon: "⏳" });
      invalidateAll();
    },
    onError: (e) => toast.error(e.message),
  });
  const addR = useMutation({
    mutationFn: (v: { title: string; cost_points: number }) => addReward({ data: v }),
    onSuccess: () => {
      setRewardTitle("");
      setRewardCost(50);
      invalidateAll();
      toast.success("Reward added");
    },
    onError: (e) => toast.error(e.message),
  });
  const delR = useMutation({
    mutationFn: (id: string) => deleteReward({ data: { id } }),
    onSuccess: invalidateAll,
  });
  const redeem = useMutation({
    mutationFn: (v: { reward_id: string; member_id: string }) => redeemReward({ data: v }),
    onSuccess: () => {
      toast.success("Redeemed! 🎁");
      invalidateAll();
    },
    onError: (e) => toast.error(e.message),
  });

  const memberList = members.data ?? [];
  const activeMember = selectedMember || memberList[0]?.id || "";

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-10">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Points & tasks</p>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Chores</h1>
          </div>
          <Trophy className="size-6 text-primary" />
        </header>

        <div className="mb-6 inline-flex flex-wrap rounded-2xl border border-border bg-panel p-1">
          {(["leaderboard", "chores", "approvals", "rewards"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative rounded-xl px-4 py-2 text-sm font-semibold capitalize ${
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {t}
              {t === "approvals" && (pending.data ?? []).length > 0 && (
                <span className="ml-1.5 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                  {(pending.data ?? []).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "approvals" && (
          <section className="rounded-3xl border border-border bg-panel p-6">
            <h2 className="mb-1 font-display text-lg font-bold">Pending approvals</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Points are only awarded once a grown-up confirms the chore is done.
            </p>
            {(pending.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing waiting — all caught up! 🎉</p>
            ) : (
              <ul className="space-y-2">
                {((pending.data ?? []) as Array<{
                  id: string;
                  points_awarded: number;
                  completed_at: string;
                  chores: { title: string } | null;
                  family_members: { name: string; avatar_color: string } | null;
                }>).map((p) => {
                  const approver = memberList.find((m) => m.is_parent) ?? memberList[0];
                  return (
                    <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-canvas p-3">
                      <Clock className="size-4 text-muted-foreground" />
                      <span className="grid size-9 place-items-center rounded-xl font-display text-sm font-bold"
                        style={kidStyle(p.family_members?.avatar_color ?? "amber")}>
                        {(p.family_members?.name ?? "?").charAt(0).toUpperCase()}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{p.chores?.title ?? "Chore"}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.family_members?.name} · {new Date(p.completed_at).toLocaleString()} · +{p.points_awarded} pts
                        </p>
                      </div>
                      <button
                        onClick={() => approver && approve.mutate({ id: p.id, approver_id: approver.id })}
                        disabled={!approver}
                        className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        <CheckCircle2 className="size-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => approver && reject.mutate({ id: p.id, approver_id: approver.id })}
                        disabled={!approver}
                        className="inline-flex items-center gap-1 rounded-xl bg-panel px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
                      >
                        <X className="size-3.5" /> Reject
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {tab === "leaderboard" && (
          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-3xl border border-border bg-panel p-6">
              <h2 className="mb-4 font-display text-lg font-bold">Standings</h2>
              {(points.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Add family members to start earning.</p>
              ) : (
                <ol className="space-y-2">
                  {(points.data ?? []).map((m, i) => (
                    <li
                      key={m.member_id}
                      className={`flex items-center gap-3 rounded-2xl p-3 ${
                        i === 0 ? "bg-primary/10" : "bg-canvas"
                      }`}
                    >
                      <span className="grid size-9 place-items-center rounded-xl bg-panel font-display text-sm font-bold">
                        {i + 1}
                      </span>
                      <span
                        className="grid size-11 place-items-center rounded-2xl font-display text-lg font-bold"
                        style={kidStyle(m.avatar_color ?? "amber")}
                      >
                        {(m.name ?? "?").charAt(0).toUpperCase()}
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold">{m.name}</p>
                        <p className="text-xs text-muted-foreground">
                          This week: {m.week_points ?? 0} pts
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-3xl font-bold tabular-nums">{m.balance ?? 0}</p>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">pts</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
            <section className="rounded-3xl border border-border bg-panel p-6">
              <h2 className="mb-4 font-display text-lg font-bold">Recent wins</h2>
              {(recent.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing yet — complete a chore!</p>
              ) : (
                <ul className="space-y-2">
                  {(recent.data ?? []).slice(0, 8).map((r) => {
                    const rr = r as unknown as {
                      id: string;
                      points_awarded: number;
                      completed_at: string;
                      chores: { title: string } | null;
                      family_members: { name: string; avatar_color: string } | null;
                    };
                    return (
                      <li key={rr.id} className="flex items-center gap-3 rounded-2xl bg-canvas p-3">
                        <span
                          className="grid size-9 place-items-center rounded-xl font-display text-sm font-bold"
                          style={kidStyle(rr.family_members?.avatar_color ?? "amber")}
                        >
                          {(rr.family_members?.name ?? "?").charAt(0).toUpperCase()}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{rr.chores?.title ?? "Chore"}</p>
                          <p className="text-xs text-muted-foreground">
                            {rr.family_members?.name} · {new Date(rr.completed_at).toLocaleString()}
                          </p>
                        </div>
                        <span className="font-display text-lg font-bold text-primary">+{rr.points_awarded}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}

        {tab === "chores" && (
          <div className="grid gap-4 md:grid-cols-5">
            <section className="rounded-3xl border border-border bg-panel p-6 md:col-span-2">
              <h2 className="mb-4 font-display text-lg font-bold">New chore</h2>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!choreTitle.trim()) return;
                  addC.mutate({
                    title: choreTitle.trim(),
                    points: chorePoints,
                    member_id: choreMember || null,
                  });
                }}
              >
                <input
                  value={choreTitle}
                  onChange={(e) => setChoreTitle(e.target.value)}
                  placeholder="e.g. Tidy your room"
                  className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm outline-none focus:border-foreground/40"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    min={1}
                    value={chorePoints}
                    onChange={(e) => setChorePoints(Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm outline-none"
                  />
                  <select
                    value={choreMember}
                    onChange={(e) => setChoreMember(e.target.value)}
                    className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm outline-none"
                  >
                    <option value="">Anyone</option>
                    {memberList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={addC.isPending || !choreTitle.trim()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-50"
                >
                  <Plus className="size-4" /> Add chore
                </button>
              </form>
            </section>
            <section className="rounded-3xl border border-border bg-panel p-6 md:col-span-3">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold">Active chores</h2>
                {memberList.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">For</span>
                    <select
                      value={activeMember}
                      onChange={(e) => setSelectedMember(e.target.value)}
                      className="rounded-xl border border-border bg-canvas px-2 py-1.5 text-xs"
                    >
                      {memberList.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              {(chores.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No chores yet.</p>
              ) : (
                <ul className="space-y-2">
                  {(chores.data ?? []).map((c) => {
                    const assigned = memberList.find((m) => m.id === c.member_id);
                    const popping = popId === c.id;
                    return (
                      <li
                        key={c.id}
                        className={`flex items-center gap-3 rounded-2xl bg-canvas p-3 transition-transform ${
                          popping ? "animate-pop scale-[1.02]" : ""
                        }`}
                      >
                        {popping && <Sparkles className="size-4 text-primary" />}
                        <div className="flex-1">
                          <p className="font-semibold">{c.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {assigned ? `For ${assigned.name}` : "Anyone"} · +{c.points} pts
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            const target = c.member_id || activeMember;
                            if (!target) {
                              toast.error("Pick a family member first");
                              return;
                            }
                            complete.mutate({ chore_id: c.id, member_id: target });
                          }}
                          className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                        >
                          <CheckCircle2 className="size-3.5" /> Done
                        </button>
                        <button
                          onClick={() => delC.mutate(c.id)}
                          className="rounded-xl p-2 text-muted-foreground hover:text-foreground"
                          aria-label="Delete"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}

        {tab === "rewards" && (
          <div className="grid gap-4 md:grid-cols-5">
            <section className="rounded-3xl border border-border bg-panel p-6 md:col-span-2">
              <h2 className="mb-4 font-display text-lg font-bold">New reward</h2>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!rewardTitle.trim()) return;
                  addR.mutate({ title: rewardTitle.trim(), cost_points: rewardCost });
                }}
              >
                <input
                  value={rewardTitle}
                  onChange={(e) => setRewardTitle(e.target.value)}
                  placeholder="e.g. 30 min screen time"
                  className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm outline-none"
                />
                <input
                  type="number"
                  min={1}
                  value={rewardCost}
                  onChange={(e) => setRewardCost(Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm outline-none"
                />
                <button
                  type="submit"
                  disabled={addR.isPending || !rewardTitle.trim()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-50"
                >
                  <Plus className="size-4" /> Add reward
                </button>
              </form>
            </section>
            <section className="rounded-3xl border border-border bg-panel p-6 md:col-span-3">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold">Rewards</h2>
                {memberList.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">For</span>
                    <select
                      value={activeMember}
                      onChange={(e) => setSelectedMember(e.target.value)}
                      className="rounded-xl border border-border bg-canvas px-2 py-1.5 text-xs"
                    >
                      {memberList.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              {(rewards.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No rewards yet.</p>
              ) : (
                <ul className="space-y-2">
                  {(rewards.data ?? []).map((r) => (
                    <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-canvas p-3">
                      <div className="grid size-9 place-items-center rounded-xl bg-panel">
                        <Gift className="size-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{r.title}</p>
                        <p className="text-xs text-muted-foreground">{r.cost_points} pts</p>
                      </div>
                      <button
                        onClick={() => {
                          if (!activeMember) {
                            toast.error("Pick a family member first");
                            return;
                          }
                          redeem.mutate({ reward_id: r.id, member_id: activeMember });
                        }}
                        className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                      >
                        Redeem
                      </button>
                      <button
                        onClick={() => delR.mutate(r.id)}
                        className="rounded-xl p-2 text-muted-foreground hover:text-foreground"
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
        )}
      </div>
    </AppShell>
  );
}
