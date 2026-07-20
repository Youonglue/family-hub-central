import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { listMembers } from "@/lib/hub-api";
import { ShieldCheck, CheckCircle2, Gift, X, Check, Sword, Users } from "lucide-react";

type ApprovalsTabMode = "chores" | "single_rewards" | "coop_rewards";

export function FamilyApprovals() {
  const qc = useQueryClient();

  // Active sub-tab state
  const [activeTab, setActiveTab] = useState<ApprovalsTabMode>("chores");

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
    qc.invalidateQueries({ queryKey: ["points"] }); 
    qc.invalidateQueries({ queryKey: ["notifications"] }); 
  };

  // --- CHORE APPROVAL & REJECTION MUTATIONS ---
  const approveChore = useMutation({
    mutationFn: (id: string) => fetch(`/api/chores/completions/${id}/approve`, { method: "POST" }).then(res => res.json()),
    onSuccess: () => { 
        toast.success("Quest Approved! XP & Points Granted. ⭐"); 
        inv();
    }
  });

  const rejectChore = useMutation({
    // Checked: Checks res.ok to trigger true onError states
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

  // --- CO-OP & SINGLE APPROVAL MUTATIONS ---
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

  // Group flat pending redemptions by group_id on load
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

  // Separate single claims and joint co-op claims dynamically
  const singleClaims = useMemo(() => {
    return redemptionGroups.filter(g => g.contributors.length === 1);
  }, [redemptionGroups]);

  const coOpClaims = useMemo(() => {
    return redemptionGroups.filter(g => g.contributors.length > 1);
  }, [redemptionGroups]);

  // Determine if there is at least one active pending request globally
  const totalPendingCount = choreList.length + singleClaims.length + coOpClaims.length;

  if (totalPendingCount === 0) return null;

  return (
    <section className="rounded-[3rem] border-4 border-slate-50 bg-white p-5 sm:p-8 shadow-xl space-y-6 animate-in zoom-in-95 duration-200">
      
      {/* Title */}
      <div className="flex items-center gap-3">
        <ShieldCheck className="size-6 text-indigo-500 animate-pulse shrink-0" />
        <h2 className="font-display text-xl font-black uppercase italic text-slate-900">Family Approvals Center</h2>
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
        Centralized Admin cockpit to review, validate, and approve all pending household quests and reward purchases in one secure place.
      </p>

      {/* Dynamic Sub-Tab Selector */}
      <div className="flex overflow-x-auto gap-2 bg-slate-50 p-1.5 rounded-2xl scrollbar-thin">
        
        {/* Tab 1: Chores */}
        <button
          onClick={() => setActiveTab("chores")}
          className={`flex-1 py-3 px-5 rounded-xl font-black uppercase text-xs transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap min-h-[44px] ${
            activeTab === "chores" 
              ? 'bg-slate-900 text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sword size={14} /> Quests ({choreList.length})
        </button>

        {/* Tab 2: Single Rewards */}
        <button
          onClick={() => setActiveTab("single_rewards")}
          className={`flex-1 py-3 px-5 rounded-xl font-black uppercase text-xs transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap min-h-[44px] ${
            activeTab === "single_rewards" 
              ? 'bg-slate-900 text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Gift size={14} /> Single Claims ({singleClaims.length})
        </button>

        {/* Tab 3: Co-Op Rewards */}
        <button
          onClick={() => setActiveTab("coop_rewards")}
          className={`flex-1 py-3 px-5 rounded-xl font-black uppercase text-xs transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap min-h-[44px] ${
            activeTab === "coop_rewards" 
              ? 'bg-slate-900 text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users size={14} /> Co-Op Claims ({coOpClaims.length})
        </button>
      </div>

      {/* --- TAB CONTENT AREA --- */}

      {/* A. PENDING QUESTS / CHORES SECTION */}
      {activeTab === "chores" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1.5"><Sword size={12} /> Pending Quest Approvals</h3>
          <div className="space-y-3">
            {choreList.length === 0 ? (
              <p className="text-center py-16 text-xs font-black text-slate-300 uppercase tracking-widest">No pending chores to validate</p>
            ) : (
              choreList.map((p: any) => (
                <div key={p.id} className="bg-slate-50 p-5 rounded-3xl border-2 border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 border-l-[12px]" style={{ borderLeftColor: p.color || 'var(--kid-indigo)' }}>
                  <div className="min-w-0 flex-1 w-full text-center sm:text-left">
                    <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                      <p className="font-black text-2xl uppercase tracking-tighter text-slate-800 truncate">{p.chore_title}</p>
                      {p.is_boss === 1 && <span className="px-2 py-0.5 bg-rose-100 border border-rose-200 text-rose-600 font-black text-[9px] uppercase rounded">BOSS</span>}
                      {p.is_coop === 1 && <span className="px-2 py-0.5 bg-indigo-100 border border-indigo-200 text-indigo-600 font-black text-[9px] uppercase rounded">CO-OP</span>}
                    </div>
                    <p className="text-xs font-black text-indigo-500 uppercase tracking-widest mt-1">Claimed by {p.member_name} (+{p.points_awarded} pts)</p>
                  </div>
                  
                  {/* Symmetrical Approve & Decline Buttons */}
                  <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-center">
                    <button 
                      onClick={() => approveChore.mutate(p.id)} 
                      disabled={approveChore.isPending}
                      className="px-6 py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 w-full md:w-auto min-h-[48px]"
                    >
                      <Check size={16} /> {approveChore.isPending ? "Approving..." : "Approve"}
                    </button>
                    <button 
                      onClick={() => rejectChore.mutate(p.id)} 
                      disabled={rejectChore.isPending}
                      className="px-6 py-4 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-2xl text-xs font-black uppercase tracking-wider shadow-sm cursor-pointer flex items-center justify-center gap-2 w-full md:w-auto min-h-[48px]"
                    >
                      <X size={16} /> {rejectChore.isPending ? "Declining..." : "Decline"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* B. PENDING SINGLE REWARDS SECTION */}
      {activeTab === "single_rewards" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1.5"><Gift size={12} /> Pending Single Claims</h3>
          <div className="space-y-4">
            {singleClaims.length === 0 ? (
              <p className="text-center py-16 text-xs font-black text-slate-300 uppercase tracking-widest">No pending individual reward claims</p>
            ) : (
              singleClaims.map((g: any) => {
                const contributor = g.contributors[0];
                return (
                  <div key={g.group_id} className="bg-slate-50 p-5 rounded-3xl border-2 border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 border-l-[12px]" style={{ borderLeftColor: contributor.avatar_color }}>
                    <div className="space-y-2 min-w-0 flex-1 w-full text-center sm:text-left">
                      <div>
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 leading-none truncate">{g.reward_title}</h3>
                        <p className="text-xs font-black text-indigo-500 uppercase tracking-widest mt-1.5">Points Spent: {g.total_points} Points</p>
                      </div>
                      
                      <div className="flex items-center gap-2 justify-center sm:justify-start">
                        <span className="text-[10px] font-black uppercase text-slate-400">Claimed By:</span>
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                          <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: contributor.avatar_color }} />
                          <span className="text-[10px] font-black uppercase text-slate-700">{contributor.member_name}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-center">
                      <button
                        onClick={() => approveRedemption.mutate(g.group_id)}
                        disabled={approveRedemption.isPending}
                        className="px-6 py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 w-full md:w-auto min-h-[48px]"
                      >
                        <Check size={16} /> Approve
                      </button>
                      <button
                        onClick={() => rejectRedemption.mutate(g.group_id)}
                        disabled={rejectRedemption.isPending}
                        className="px-6 py-4 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-2xl text-xs font-black uppercase tracking-wider shadow-sm cursor-pointer flex items-center justify-center gap-2 w-full md:w-auto min-h-[48px]"
                      >
                        <X size={16} /> Decline
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* C. PENDING CO-OP REDEMPTIONS SECTION */}
      {activeTab === "coop_rewards" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1.5"><Users size={12} /> Pending Co-Op Claims</h3>
          <div className="space-y-4">
            {coOpClaims.length === 0 ? (
              <p className="text-center py-16 text-xs font-black text-slate-300 uppercase tracking-widest">No pending joint co-op claims</p>
            ) : (
              coOpClaims.map((g: any) => (
                <div key={g.group_id} className="bg-slate-50 p-5 rounded-3xl border-2 border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 border-l-[12px] border-l-indigo-500">
                  <div className="space-y-3 min-w-0 flex-1 w-full text-center sm:text-left">
                    <div>
                      <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 leading-none truncate">{g.reward_title}</h3>
                      <p className="text-xs font-black text-indigo-500 uppercase tracking-widest mt-1.5">Total Cost: {g.total_points} Points</p>
                    </div>
                    
                    {/* Contributors list */}
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                      {g.contributors.map((c: any) => (
                        <div key={c.member_id} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                          <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: c.avatar_color }} />
                          <span className="text-[10px] font-black uppercase text-slate-700">{c.member_name}</span>
                          <span className="text-[10px] font-bold text-slate-400">({c.points_spent} pts)</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-center">
                    <button
                      onClick={() => approveRedemption.mutate(g.group_id)}
                      disabled={approveRedemption.isPending}
                      className="px-6 py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 w-full md:w-auto min-h-[48px]"
                    >
                      <Check size={16} /> Approve
                    </button>
                    <button
                      onClick={() => rejectRedemption.mutate(g.group_id)}
                      disabled={rejectRedemption.isPending}
                      className="px-6 py-4 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-2xl text-xs font-black uppercase tracking-wider shadow-sm cursor-pointer flex items-center justify-center gap-2 w-full md:w-auto min-h-[48px]"
                    >
                      <X size={16} /> Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}
