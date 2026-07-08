import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { listMembers, listChores } from "@/lib/hub-api";
import { 
  CheckCircle2, UserCircle, Timer, ArrowLeft, 
  Star, Trophy, ShieldCheck, Zap, Check
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/chores")({
  ssr: false,
  component: ChoresKiosk,
});

function ChoresKiosk() {
  const qc = useQueryClient();
  const [activeMember, setActiveMember] = useState<any>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isAdminView, setIsAdminView] = useState(false);

  const members = useQuery({ queryKey: ["members"], queryFn: listMembers });
  const chores = useQuery({ queryKey: ["chores"], queryFn: listChores });
  const pointsData = useQuery({ 
    queryKey: ["points"], 
    queryFn: () => fetch('/api/points').then(res => res.json()) 
  });
  const pendingApprovals = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: () => fetch('/api/completions/pending').then(res => res.json()),
    enabled: !!activeMember
  });

  // FIXED: Added Array.isArray check to prevent the .find crash
  const memberStats = useMemo(() => {
    const data = Array.isArray(pointsData.data) ? pointsData.data : [];
    if (!activeMember || data.length === 0) return { balance: 0, level: 1, progress: 0 };
    const stats = data.find((p: any) => p.member_id === activeMember.id);
    if (!stats) return { balance: 0, level: 1, progress: 0 };
    const level = Math.floor(stats.balance / 100) + 1;
    const progress = stats.balance % 100;
    return { balance: stats.balance, level, progress };
  }, [activeMember, pointsData.data]);

  useEffect(() => {
    if (!activeMember) return;
    const interval = setInterval(() => {
      if (Date.now() - lastActivity > 60000) {
        setActiveMember(null);
        setIsAdminView(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeMember, lastActivity]);

  const recordActivity = useCallback(() => setLastActivity(Date.now()), []);

  const completeChore = useMutation({
    mutationFn: async (choreId: string) => {
      return fetch(`/api/chores/${choreId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: activeMember.id }),
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast.success("Done! Waiting for approval ⭐");
      qc.invalidateQueries({ queryKey: ["pending-approvals"] });
    }
  });

  const approveChore = useMutation({
    mutationFn: (id: string) => fetch(`/api/completions/${id}/approve`, { method: "POST" }).then(res => res.json()),
    onSuccess: () => {
      toast.success("Approved!");
      qc.invalidateQueries({ queryKey: ["points"] });
      qc.invalidateQueries({ queryKey: ["pending-approvals"] });
    }
  });

  if (!activeMember) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[80vh] py-10">
          <h1 className="text-5xl font-black mb-12">Chore Station</h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {(Array.isArray(members.data) ? members.data : []).map((m: any) => (
              <button
                key={m.id}
                onClick={() => { setActiveMember(m); recordActivity(); }}
                className="size-48 rounded-[3rem] shadow-xl border-8 border-white text-white flex flex-col items-center justify-center transition-transform hover:scale-105"
                style={{ backgroundColor: m.avatar_color }}
              >
                <UserCircle className="size-16 mb-2" />
                <span className="text-xl font-bold uppercase">{m.name}</span>
              </button>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto p-6" onMouseMove={recordActivity} onClick={recordActivity}>
        <div className="flex justify-between mb-8">
          <button onClick={() => {setActiveMember(null); setIsAdminView(false);}} className="font-bold text-slate-400">← Back</button>
          {activeMember.is_parent === 1 && (
            <button onClick={() => setIsAdminView(!isAdminView)} className="bg-primary text-white px-4 py-2 rounded-xl font-bold">
              {isAdminView ? "Exit Admin" : "Approve Chores"}
            </button>
          )}
        </div>

        {isAdminView ? (
          <div className="space-y-4">
            <h2 className="text-3xl font-black">Pending Approval</h2>
            {(Array.isArray(pendingApprovals.data) ? pendingApprovals.data : []).map((item: any) => (
              <div key={item.id} className="bg-panel p-6 rounded-3xl border border-border flex justify-between items-center">
                <div>
                  <p className="font-bold text-lg">{item.chore_title}</p>
                  <p className="text-sm text-primary font-bold">Done by {item.member_name}</p>
                </div>
                <button onClick={() => approveChore.mutate(item.id)} className="bg-green-500 text-white px-6 py-2 rounded-xl font-bold">Approve</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-[3rem] shadow-lg flex items-center gap-6">
              <div className="size-24 rounded-full flex items-center justify-center text-4xl font-black text-white" style={{ backgroundColor: activeMember.avatar_color }}>
                {memberStats.level}
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-black">{activeMember.name}</h2>
                <div className="h-4 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                  <div className="h-full transition-all duration-1000" style={{ width: `${memberStats.progress}%`, backgroundColor: activeMember.avatar_color }} />
                </div>
              </div>
            </div>
            <div className="grid gap-4">
              {(Array.isArray(chores.data) ? chores.data : []).map((c: any) => (
                <button key={c.id} onClick={() => completeChore.mutate(c.id)} className="bg-panel p-6 rounded-3xl border border-border flex justify-between items-center hover:border-primary">
                  <span className="font-bold text-xl">{c.title}</span>
                  <span className="bg-slate-100 px-4 py-2 rounded-full font-black text-primary">+{c.points}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

