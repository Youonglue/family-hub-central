// src/components/settings/FamilyApprovals.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { listMembers } from "@/lib/hub-api";
import { ShieldCheck, CheckCircle2, Gift, X, Check, Sword, Users } from "lucide-react";

type ApprovalsTabMode = "chores" | "single_rewards" | "coop_rewards";

export function FamilyApprovals() {
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<ApprovalsTabMode>("chores");

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
    qc.invalidateQueries({ queryKey: ["points"] }); 
    qc.invalidateQueries({ queryKey: ["notifications"] }); 
  };

  const approveChore = useMutation({
    mutationFn: (id: string) => fetch(`/api/chores/completions/${id}/approve`, { method: "POST" }).then(res => res.json()),
    onSuccess: () => { 
        toast.success("Quest Approved! XP & Points Granted. ⭐"); 
        inv();
    }
  });

  const rejectChore = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/chores/completions/${id}/reject`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to decline quest");
      }
      return res.json();
    },
    onSuccess: () => { 
        toast.success("Quest completion declined."); 
        inv();
    },
    onError: (err: any) => {
        toast.error(err.message || "Failed to decline quest");
    }
  });

  const approveRedemption = useMutation({
    mutationFn: async (groupId: string) => {
      const res = await fetch(`/api/rewards/redemptions/${groupId}/approve`, { method: 'POST' });
      if (!res.ok) throw new Error("Failed to approve redemption");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Purchase Approved! Points Deducted. 🎁");
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
      toast.success("Purchase Canceled. Points Returned.");
      inv();
    },
    onError: (err: any) => toast.error(err.message || "Failed to cancel purchase")
  });

  const redemptionGroups = useMemo(() => {
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

  const singleClaims = useMemo(() => {
    return redemptionGroups.filter(g => g.contributors.length === 1);
  }, [redemptionGroups]);

  const coOpClaims = useMemo(() => {
    return redemptionGroups.filter(g => g.contributors.length > 1);
  }, [redemptionGroups]);

  const totalPendingCount = choreList.length + singleClaims.length + coOpClaims.length;

  if (totalPendingCount === 0) return null;

  return (
    <section className="rounded-3xl sm:rounded-[3rem] border-2 sm:border-4 border-slate-50 bg-white p-4 sm:p-7 shadow-xl space-y-5 animate-in zoom-in-95 duration-200">
      
      {/* Title */}
      <div className="flex items-center gap-3">
        <ShieldCheck className="size-6 text-indigo-500 animate-pulse shrink-0" />
        <h2 className="font-display text-lg sm:text-xl font-black uppercase italic text-slate-900">Family Approvals Center</h2>
      </div>

      {/* Dynamic Sub-Tab Selector */}
      <div className="flex overflow-x-auto gap-1.5 bg-slate-100 p-1 rounded-2xl scrollbar-none">
        <button
          onClick={() => setActiveTab("chores")}
          className={`flex-1 py-2.5 px-3 rounded-xl font-black uppercase text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap min-h-[40px] ${
            activeTab === "chores" 
              ? 'bg-slate-900 text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sword size={13} /> Quests ({choreList.length})
        </button>

        <button
          onClick={() => setActiveTab("single_rewards")}
          className={`flex-1 py-2.5 px-3 rounded-xl font-black uppercase text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap min-h-[40px] ${
            activeTab === "single_rewards" 
              ? 'bg-slate-900 text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Gift size={13} /> Single Claims ({singleClaims.length})
        </button>

        <button
          onClick={() => setActiveTab("coop_rewards")}
          className={`flex-1 py-2.5 px-3 rounded-xl font-black uppercase text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap min-h-[40px] ${
            activeTab === "coop_rewards" 
              ? 'bg-slate-900 text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users size={13} /> Co-Op ({coOpClaims.length})
        </button>
      </div>

      {/* --- TAB CONTENT AREA --- */}

      {/* A. PENDING QUESTS / CHORES */}
      {activeTab === "chores" && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {choreList.length === 0 ? (
            <p className="text-center py-12 text-xs font-black text-slate-300 uppercase tracking-widest">No pending chores to validate</p>
          ) : (
            choreList.map((p: any) => (
              <div 
                key={p.id} 
                className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-l-8" 
                style={{ borderLeftColor: p.color || 'var(--kid-indigo)' }}
              >
                {/* Text Content Area (Priority Width) */}
                <div className="min-w-0 flex-1 w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-base sm:text-lg uppercase tracking-tight text-slate-800 break-words line-clamp-2">
                      {p.chore_title}
                    </p>
                    {p.is_boss === 1 && <span className="px-1.5 py-0.5 bg-rose-100 border border-rose-200 text-rose-600 font-black text-[8px] uppercase rounded shrink-0">BOSS</span>}
                    {p.is_coop === 1 && <span className="px-1.5 py-0.5 bg-indigo-100 border border-indigo-200 text-indigo-600 font-black text-[8px] uppercase rounded shrink-0">CO-OP</span>}
                  </div>
                  <p className="text-[11px] font-black text-indigo-600 uppercase tracking-wider mt-0.5">
                    Claimed by <span className="text-slate-900 font-black">{p.member_name}</span> (+{p.points_awarded} pts)
                  </p>
                </div>
                
                {/* Compact, Space-Efficient Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button 
                    onClick={() => approveChore.mutate(p.id)} 
                    disabled={approveChore.isPending}
                    className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-green-500 hover:bg-green-600 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[40px]"
                    title="Approve Quest"
                  >
                    <Check size={14} /> {approveChore.isPending ? "..." : "Approve"}
                  </button>

                  <button 
                    onClick={() => rejectChore.mutate(p.id)} 
                    disabled={rejectChore.isPending}
                    className="px-3 py-2 sm:px-3.5 sm:py-2.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-black uppercase tracking-wider shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1 min-h-[40px] active:scale-95"
                    title="Decline Quest"
                  >
                    <X size={14} /> Decline
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* B. PENDING SINGLE REWARDS */}
      {activeTab === "single_rewards" && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {singleClaims.length === 0 ? (
            <p className="text-center py-12 text-xs font-black text-slate-300 uppercase tracking-widest">No pending individual reward claims</p>
          ) : (
            singleClaims.map((g: any) => {
              const contributor = g.contributors[0];
              return (
                <div 
                  key={g.group_id} 
                  className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-l-8" 
                  style={{ borderLeftColor: contributor.avatar_color || 'var(--kid-indigo)' }}
                >
                  <div className="min-w-0 flex-1 w-full">
                    <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900 break-words line-clamp-2 leading-snug">
                      {g.reward_title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[11px] font-black text-indigo-600 uppercase tracking-wider">
                        {g.total_points} PTS
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-[11px] font-bold text-slate-600 uppercase">
                        Hero: <strong className="text-slate-900 font-black">{contributor.member_name}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Compact Buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => approveRedemption.mutate(g.group_id)}
                      disabled={approveRedemption.isPending}
                      className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-green-500 hover:bg-green-600 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[40px]"
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button
                      onClick={() => rejectRedemption.mutate(g.group_id)}
                      disabled={rejectRedemption.isPending}
                      className="px-3 py-2 sm:px-3.5 sm:py-2.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-black uppercase tracking-wider shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1 min-h-[40px] active:scale-95"
                    >
                      <X size={14} /> Decline
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* C. PENDING CO-OP REWARDS */}
      {activeTab === "coop_rewards" && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {coOpClaims.length === 0 ? (
            <p className="text-center py-12 text-xs font-black text-slate-300 uppercase tracking-widest">No pending joint co-op claims</p>
          ) : (
            coOpClaims.map((g: any) => (
              <div 
                key={g.group_id} 
                className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-l-8 border-l-indigo-500"
              >
                <div className="min-w-0 flex-1 w-full space-y-1">
                  <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900 break-words line-clamp-2 leading-snug">
                    {g.reward_title}
                  </h3>
                  <p className="text-[11px] font-black text-indigo-600 uppercase tracking-wider">
                    Total: {g.total_points} PTS
                  </p>
                  
                  {/* Contributors pills */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {g.contributors.map((c: any) => (
                      <span key={c.member_id} className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                        {c.member_name} ({c.points_spent} pts)
                      </span>
                    ))}
                  </div>
                </div>

                {/* Compact Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => approveRedemption.mutate(g.group_id)}
                    disabled={approveRedemption.isPending}
                    className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-green-500 hover:bg-green-600 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[40px]"
                  >
                    <Check size={14} /> Approve
                  </button>
                  <button
                    onClick={() => rejectRedemption.mutate(g.group_id)}
                    disabled={rejectRedemption.isPending}
                    className="px-3 py-2 sm:px-3.5 sm:py-2.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-black uppercase tracking-wider shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1 min-h-[40px] active:scale-95"
                  >
                    <X size={14} /> Decline
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
