import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { listMembers } from "@/lib/hub-api";
import { ShieldCheck, CheckCircle2, Gift, X, Check, Sword } from "lucide-react";

export function FamilyApprovals() {
  const qc = useQueryClient();

  // --- QUERY STATES ---
  const members = useQuery({ queryKey: ["members"], queryFn: listMembers });
  
  const pendingApprovals = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: () => fetch('/api/chores/completions/pending').then(res => res.json())
  });

  const pendingRedemptions = useQuery({ 
    queryKey: ["pending-redemptions"], 
    queryFn: () => fetch('/api/rewards/redemptions/pending').then(res => res.json()) 
  });

  const memberList = Array.isArray(members.data) ? members.data : [];
  const choreList = Array.isArray(pendingApprovals.data) ? pendingApprovals.data : [];
  const redemptionList = Array.isArray(pendingRedemptions.data) ? pendingRedemptions.data : [];

  const inv = () => {
    qc.invalidateQueries({ queryKey: ["pending-approvals"] });
    qc.invalidateQueries({ queryKey: ["pending-redemptions"] });
    qc.invalidateQueries({ queryKey: ["members"] });
    qc.invalidateQueries({ queryKey: ["points"] }); // Refreshes live dashboard balances
  };

  // --- CHORE APPROVAL MUTATION ---
  const approveChore = useMutation({
    mutationFn: (id: string) => fetch(`/api/chores/completions/${id}/approve`, { method: "POST" }).then(res => res.json()),
    onSuccess: () => { 
        toast.success("Quest Approved! XP & Points Granted. ⭐"); 
        inv();
    }
  });

  // --- CO-OP APPROVAL MUTATIONS ---
  const approveRedemption = useMutation({
    mutationFn: async (groupId: string) => {
      const res = await fetch(`/api/rewards/redemptions/${groupId}/approve`, { method: 'POST' });
      if (!res.ok) throw new Error("Failed to approve redemption");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Joint Purchase Approved! Points Deducted. 🎁");
      inv();
    },
    onError: (err: any) => toast.error(err.message || "Failed to approve purchase")
  });

  const rejectRedemption = useMutation({
    mutationFn: async (groupId: string) => {
      const res = await fetch(`/api/rewards/redemptions/${groupId}/reject`, { method: 'POST' });
      if (!res.ok) throw new Error("Failed to cancel redemption");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Joint Purchase Canceled. Points Returned.");
      inv();
    },
    onError: (err: any) => toast.error(err.message || "Failed to cancel purchase")
  });

  // Group flat pending redemptions by dynamic group_id on load
  const coOpGroups = useMemo(() => {
    const map = new Map<string, any>();
    for (const item of redemptionList) {
      const gId = item.group_id;
      if (!gId) continue;
      const existing = map.get(gId) ?? {
        group_id: gId,
        reward_title: item.reward_title,
        total_points: item.total_points,
        created_at: item.created_at,
        contributors: []
      };
      existing.contributors.push({
        member_id: item.member_id,
        member_name: item.member_name,
        points_spent: item.points_spent,
        avatar_color: item.avatar_color
      });
      map.set(gId, existing);
    }
    return Array.from(map.values());
  }, [redemptionList]);

  // Determine if there is at least one active pending request to approve
  const hasPending = choreList.length > 0 || coOpGroups.length > 0;

  if (!hasPending) return null;

  return (
    <section className="rounded-[3rem] border-4 border-slate-50 bg-white p-8 shadow-xl space-y-8 animate-in zoom-in-95 duration-200">
      <div className="mb-2 flex items-center gap-3">
        <ShieldCheck className="size-6 text-green-500 animate-pulse" />
        <h2 className="font-display text-xl font-black uppercase italic">Family Approvals Center</h2>
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 leading-none">Review, approve, or cancel pending chores and joint co-op rewards purchases in one place</p>

      {/* A. PENDING QUESTS / CHORES SECTION */}
      {choreList.length > 0 && (
        <div className="space-y-4 animate-in fade-in">
          <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1.5"><Sword size={12} /> Pending Quest Approvals</h3>
          <div className="space-y-3">
            {choreList.map((p: any) => (
              <div key={p.id} className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 border-l-[12px]" style={{ borderLeftColor: p.color || 'var(--kid-indigo)' }}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-2xl uppercase tracking-tighter text-slate-800 truncate">{p.chore_title}</p>
                    {p.is_boss === 1 && <span className="px-2 py-0.5 bg-rose-100 border border-rose-200 text-rose-600 font-black text-[9px] uppercase rounded">BOSS</span>}
                    {p.is_coop === 1 && <span className="px-2 py-0.5 bg-indigo-100 border border-indigo-200 text-indigo-600 font-black text-[9px] uppercase rounded">CO-OP</span>}
                  </div>
                  <p className="text-xs font-black text-indigo-500 uppercase tracking-widest mt-1">Claimed by {p.member_name} (+{p.points_awarded} pts)</p>
                </div>
                <button onClick={() => approveChore.mutate(p.id)} className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-xs cursor-pointer w-full md:w-auto shrink-0">
                  <Check size={16} /> APPROVE QUEST
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* B. PENDING CO-OP REDEMPTIONS SECTION */}
      {coOpGroups.length > 0 && (
        <div className="space-y-4 border-t border-slate-100 pt-6 animate-in fade-in">
          <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1.5"><Gift size={12} /> Pending Co-Op Claims</h3>
          <div className="space-y-4">
            {coOpGroups.map((g: any) => (
              <div key={g.group_id} className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3">
                  <div>
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">{g.reward_title}</h3>
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">Total Cost: {g.total_points} Points</p>
                  </div>
                  
                  {/* Contributors list */}
                  <div className="flex flex-wrap gap-2">
                    {g.contributors.map((c: any) => (
                      <div key={c.member_id} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                        <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: c.avatar_color }} />
                        <span className="text-[10px] font-black uppercase text-slate-700">{c.member_name}</span>
                        <span className="text-[10px] font-bold text-slate-400">({c.points_spent} pts)</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Parent Approval Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-auto w-full md:w-auto justify-end">
                  <button
                    onClick={() => approveRedemption.mutate(g.group_id)}
                    disabled={approveRedemption.isPending}
                    className="px-6 py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center gap-2 w-full md:w-auto justify-center"
                  >
                    <Check size={16} /> APPROVE
                  </button>
                  <button
                    onClick={() => rejectRedemption.mutate(g.group_id)}
                    disabled={rejectRedemption.isPending}
                    className="px-6 py-4 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-2xl text-xs font-black uppercase tracking-wider shadow-sm cursor-pointer flex items-center gap-2 w-full md:w-auto justify-center"
                  >
                    <X size={16} /> REJECT
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
