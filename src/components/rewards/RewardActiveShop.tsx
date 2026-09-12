// src/components/rewards/RewardActiveShop.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck, Star, Gift, Lock, X, Users, Sparkles } from "lucide-react";
import { Avatar, parseAvatarConfig } from "@/components/avatar/Avatar";

interface RewardActiveShopProps {
  activeMember: any;
  onBack: () => void;
  isAdminView: boolean;
  setIsAdminView: (show: boolean) => void;
  canAccessAdmin: boolean;
}

export function RewardActiveShop({
  activeMember,
  onBack,
  isAdminView,
  setIsAdminView,
  canAccessAdmin
}: RewardActiveShopProps) {
  const qc = useQueryClient();

  // DEFAULT: "mine" strictly shows rewards relevant to activeMember
  const [selectedFilter, setSelectedFilter] = useState<string>("mine");
  const [pooledContributors, setPooledContributors] = useState<Record<string, string[]>>({});
  const [confirmingPurchase, setConfirmingPurchase] = useState<{ reward: any, contributors: any[], splitCost: number } | null>(null);

  const rewards = useQuery({ 
    queryKey: ["rewards"], 
    queryFn: () => fetch('/api/rewards').then(res => res.json()) 
  });

  const pointsData = useQuery({ 
    queryKey: ["points"], 
    queryFn: () => fetch('/api/chores/points').then(res => res.json()) 
  });

  const inv = () => {
    qc.invalidateQueries({ queryKey: ["rewards"] });
    qc.invalidateQueries({ queryKey: ["points"] });
    qc.invalidateQueries({ queryKey: ["members"] });
    qc.invalidateQueries({ queryKey: ["pending-redemptions"] });
  };

  const memberRecord = useMemo(() => {
    const list = Array.isArray(pointsData.data) ? pointsData.data : [];
    return list.find((p: any) => (p.member_id === activeMember.id || p.id === activeMember.id)) || activeMember;
  }, [pointsData.data, activeMember]);

  const avatarConfig = useMemo(() => {
    return parseAvatarConfig(memberRecord?.avatar_config);
  }, [memberRecord]);

  const stats = useMemo(() => {
    if (!memberRecord) return { balance: 0, level: 1, xp: 0 };
    return { 
      balance: memberRecord.balance || 0, 
      level: memberRecord.level || 1, 
      xp: memberRecord.xp || 0 
    };
  }, [memberRecord]);

  const claimReward = useMutation({
    mutationFn: ({ rewardId, memberIds }: { rewardId: string; memberIds: string[] }) => 
      fetch(`/api/rewards/${rewardId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds })
      }).then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Claim failed");
        }
        return res.json();
      }),
    onSuccess: (data) => {
      if (data.pending) {
        toast.success("Co-Op Purchase Requested! Waiting for parent approval. 👥");
      } else {
        toast.success(`Reward Claimed! Remaining: ${data.balanceRemaining} pts 🎁`);
      }
      setPooledContributors({});
      setConfirmingPurchase(null);
      inv();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to claim reward");
    }
  });

  const handleToggleContributor = (rewardId: string, siblingId: string) => {
    setPooledContributors((prev) => {
      const current = prev[rewardId] ?? [];
      const updated = current.includes(siblingId)
        ? current.filter((id) => id !== siblingId)
        : [...current, siblingId];
      return { ...prev, [rewardId]: updated };
    });
  };

  const rawMemberList = Array.isArray(pointsData.data) ? pointsData.data : [];
  const rewardList = Array.isArray(rewards.data) ? rewards.data : [];

  const eligibleSiblings = useMemo(() => {
    return rawMemberList.filter((m: any) => {
      const id = m.member_id || m.id;
      return id !== activeMember.id && m.show_on_rewards !== 0;
    });
  }, [rawMemberList, activeMember.id]);

  const isRewardAssignedToHero = (r: any, heroId: string) => {
    if (r.member_id === heroId) return true;
    if (r.member_ids) {
      try {
        const ids = typeof r.member_ids === "string" ? JSON.parse(r.member_ids) : r.member_ids;
        if (Array.isArray(ids) && ids.includes(heroId)) return true;
      } catch (e) {}
    }
    return false;
  };

  const filteredRewards = useMemo(() => {
    if (selectedFilter === "mine") {
      return rewardList.filter((r: any) => isRewardAssignedToHero(r, activeMember.id) || r.is_shared === 1);
    }
    if (selectedFilter === "shared") {
      return rewardList.filter((r: any) => r.is_shared === 1);
    }
    if (selectedFilter === "all") {
      return rewardList.filter((r: any) => r.member_id || (r.member_ids && r.member_ids !== "[]") || r.is_shared === 1);
    }
    return rewardList.filter((r: any) => isRewardAssignedToHero(r, selectedFilter));
  }, [rewardList, selectedFilter, activeMember.id]);

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 animate-in slide-in-from-bottom-5 duration-300 safe-area-inset-bottom">
      
      {/* TOP HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-sm border-2 sm:border-4 border-slate-50">
        <button 
          onClick={onBack} 
          className="flex items-center justify-center sm:justify-start gap-2 font-black text-slate-400 hover:text-slate-900 transition-colors uppercase text-xs tracking-widest py-2 cursor-pointer min-h-[44px]"
        >
          <ArrowLeft size={16} /> Exit Vault
        </button>
        
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <p className="font-black uppercase italic text-slate-800 tracking-tight text-sm sm:text-base truncate max-w-[180px] sm:max-w-xs">
            {activeMember.name}
          </p>
          {canAccessAdmin && (
            <button 
              onClick={() => setIsAdminView(!isAdminView)} 
              className={`px-4 py-2.5 sm:px-6 sm:py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all w-full sm:w-auto cursor-pointer min-h-[44px] shrink-0 active:scale-95 ${
                isAdminView ? 'bg-slate-900 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
              }`}
            >
              <ShieldCheck size={18} /> {isAdminView ? "Exit Customization" : "Customize Shop"}
            </button>
          )}
        </div>
      </div>

      {/* POINTS BANNER */}
      <div className="bg-white p-4 sm:p-6 md:p-8 lg:p-10 rounded-3xl sm:rounded-[3rem] shadow-xl border-2 sm:border-4 border-slate-50 flex flex-col md:flex-row items-center gap-4 sm:gap-6 md:gap-8 relative overflow-hidden text-center md:text-left">
         <Avatar 
           config={avatarConfig} 
           className="size-20 sm:size-28 md:size-32 rounded-2xl sm:rounded-[2.5rem] shadow-xl border-4 sm:border-8 border-white shrink-0 mx-auto md:mx-0" 
         />

         <div className="flex-1 w-full min-w-0 space-y-1.5 sm:space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h2 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight uppercase italic text-slate-900 truncate max-w-full">
                {activeMember.name}'s Stash
              </h2>
              <div className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black flex items-center justify-center gap-1 shadow-md w-max mx-auto md:mx-0 select-none shrink-0">
                <Star className="size-3.5 animate-pulse" /> SHOP UNLOCKED
              </div>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">Active Points Balance</p>
              <p className="text-3xl sm:text-5xl font-black text-slate-900 leading-none tracking-tight">
                {stats.balance} <span className="text-xs sm:text-xl font-black text-slate-400 uppercase">PTS AVAILABLE</span>
              </p>
            </div>
         </div>
      </div>

      {/* DYNAMIC REWARD BROWSER PILLS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none select-none">
        <button
          type="button"
          onClick={() => setSelectedFilter("mine")}
          className={`px-3.5 py-2 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 min-h-[40px] ${
            selectedFilter === "mine"
              ? "bg-slate-900 text-white shadow-md scale-105"
              : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Star size={13} className="text-yellow-400 fill-yellow-400" /> My Rewards
        </button>

        <button
          type="button"
          onClick={() => setSelectedFilter("shared")}
          className={`px-3.5 py-2 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 min-h-[40px] ${
            selectedFilter === "shared"
              ? "bg-slate-900 text-white shadow-md scale-105"
              : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Users size={13} /> 👥 Family Co-Op
        </button>

        {eligibleSiblings.map((m: any) => {
          const mId = m.member_id || m.id;
          const isSelected = selectedFilter === mId;
          const siblingAvatar = parseAvatarConfig(m.avatar_config);

          return (
            <button
              type="button"
              key={mId}
              onClick={() => setSelectedFilter(mId)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shrink-0 min-h-[40px] ${
                isSelected
                  ? "bg-indigo-600 text-white shadow-md scale-105"
                  : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Avatar config={siblingAvatar} className="size-4 rounded-md shadow-xs" />
              <span>{m.name}'s Goals</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setSelectedFilter("all")}
          className={`px-3.5 py-2 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 min-h-[40px] ${
            selectedFilter === "all"
              ? "bg-slate-900 text-white shadow-md scale-105"
              : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Sparkles size={13} /> All Rewards
        </button>
      </div>

      {/* CATALOG GRID: Clean Cards Without Annoying Colored Side-Borders */}
      <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2">
         {filteredRewards.length === 0 && (
           <div className="col-span-full py-12 bg-white rounded-3xl border-2 border-dashed border-slate-100 text-center p-6">
             <p className="font-black uppercase tracking-wider text-slate-400 text-xs sm:text-sm">
               {selectedFilter === "mine" 
                 ? `No rewards assigned to ${activeMember.name} yet. Customize rewards in the Admin Panel!` 
                 : "No rewards found in this section."}
             </p>
           </div>
         )}

         {filteredRewards.map((r: any) => {
           const isPoolingActive = pooledContributors[r.id] !== undefined;
           const activeContributors = [activeMember.id, ...(pooledContributors[r.id] ?? [])];
           const splitCost = Math.ceil(r.points / activeContributors.length);

           const hasEnoughPoints = activeContributors.every((memberId) => {
             const pointsRecord = rawMemberList.find((p: any) => (p.member_id === memberId || p.id === memberId));
             const balance = pointsRecord?.balance || 0;
             return balance >= splitCost;
           });

           const isAssignedToMe = isRewardAssignedToHero(r, activeMember.id);

           return (
             <div 
               key={r.id} 
               className="bg-white p-4 sm:p-6 md:p-7 rounded-3xl sm:rounded-[3rem] border-2 border-slate-100 hover:border-indigo-200 shadow-md flex flex-col justify-between min-h-[260px] sm:min-h-[290px] h-auto relative group hover:shadow-xl transition-all"
             >
               {/* Card Top: Icon & Clean Badges */}
               <div className="flex justify-between items-start gap-3">
                 <div className="p-2.5 sm:p-3 bg-slate-50 rounded-2xl group-hover:rotate-6 transition-transform shadow-sm text-slate-800 shrink-0">
                     <Gift size={24} className="sm:size-7" />
                 </div>
                 
                 <div className="text-right shrink-0 space-y-1">
                   <div className="bg-slate-900 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl font-black italic shadow-md inline-block text-xs sm:text-sm">
                     {r.points} PTS
                   </div>
                   
                   {/* Clean Badges */}
                   <div>
                     {r.is_shared === 1 ? (
                       <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8px] sm:text-[9px] font-black uppercase rounded-md block">
                         Family Shared
                       </span>
                     ) : isAssignedToMe ? (
                       <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 text-[8px] sm:text-[9px] font-black uppercase rounded-md block">
                         ⭐ My Goal
                       </span>
                     ) : r.assigned_member_name ? (
                       <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 text-[8px] sm:text-[9px] font-black uppercase rounded-md block">
                         {r.assigned_member_name}'s Goal
                       </span>
                     ) : null}
                   </div>

                   {isPoolingActive && (
                     <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">
                       Split: {splitCost} pts each
                     </p>
                   )}
                 </div>
               </div>
               
               {/* Card Bottom: Full Title (No Cutoffs) & Actions */}
               <div className="space-y-3 mt-3 w-full min-w-0 flex-1 flex flex-col justify-between">
                 {/* FULLY READABLE TITLE: line-clamp removed so entire name wraps naturally */}
                 <h4 className="text-base sm:text-lg md:text-xl font-black text-slate-800 leading-snug tracking-tight break-words">
                   {r.title}
                 </h4>

                 {/* CO-OP POOLING SECTION */}
                 <div className="border-t border-slate-100 pt-2.5 space-y-2">
                   <label className="flex items-center gap-2 text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-wider cursor-pointer select-none min-h-[32px]">
                     <input
                       type="checkbox"
                       checked={isPoolingActive}
                       onChange={(e) => {
                         setPooledContributors(prev => {
                           const updated = { ...prev };
                           if (e.target.checked) {
                             updated[r.id] = [];
                           } else {
                             delete updated[r.id];
                           }
                           return updated;
                         });
                       }}
                       className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 size-4 cursor-pointer"
                     />
                     👥 Pool Points (Co-Op Purchase)
                   </label>

                   {/* Contributors Selector checklist */}
                   {isPoolingActive && (
                     <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                       <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Select contributing heroes:</p>
                       <div className="flex flex-wrap gap-1.5">
                         {eligibleSiblings.map((m: any) => {
                           const mId = m.member_id || m.id;
                           const isChecked = (pooledContributors[r.id] ?? []).includes(mId);
                           const balance = m.balance || 0;
                           const isShort = balance < splitCost;
                           const siblingAvatar = parseAvatarConfig(m.avatar_config);

                           return (
                             <button
                               type="button"
                               key={mId}
                               onClick={() => handleToggleContributor(r.id, mId)}
                               className={`px-2 py-1 rounded-xl text-[9px] sm:text-[10px] font-black uppercase border flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 min-h-[34px] ${
                                 isChecked 
                                   ? isShort 
                                     ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-xs' 
                                     : 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-xs'
                                   : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'
                               }`}
                             >
                               <Avatar config={siblingAvatar} className="size-4 rounded-md" />
                               <span>{m.name}</span>
                               <span className="text-[8px] font-bold text-slate-400">({balance})</span>
                             </button>
                           );
                         })}
                       </div>
                     </div>
                   )}
                 </div>
                 
                 {/* Claim Button */}
                 {hasEnoughPoints ? (
                   <button
                     onClick={() => {
                       setConfirmingPurchase({
                         reward: r,
                         contributors: activeContributors,
                         splitCost
                       });
                     }}
                     className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all min-h-[44px]"
                   >
                     <Gift size={14} /> {isPoolingActive ? `Request Co-Op (${splitCost} pts each)` : "Claim Reward"}
                   </button>
                 ) : (
                   <button
                     disabled
                     className="w-full py-3 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-not-allowed border-2 border-dashed border-slate-200 min-h-[44px]"
                   >
                     <Lock size={14} /> Insufficient Points
                   </button>
                 )}
               </div>
             </div>
           );
         })}
      </div>

      {/* CONFIRMATION MODAL */}
      {confirmingPurchase && (() => {
        const r = confirmingPurchase.reward;
        const contributors = confirmingPurchase.contributors;
        const isCoOp = contributors.length > 1;

        return (
          <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-900/60 backdrop-blur-md p-4" onClick={() => setConfirmingPurchase(null)}>
            <div className="w-full max-w-md bg-white rounded-3xl sm:rounded-[3.5rem] p-5 sm:p-8 shadow-2xl border-4 sm:border-8 border-slate-50 text-center animate-in zoom-in-95 duration-200 my-auto" onClick={e => e.stopPropagation()}>
              <div className="size-14 sm:size-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-indigo-600 shadow-inner">
                <Gift size={28} />
              </div>
              
              <h3 className="text-lg sm:text-2xl font-black uppercase italic tracking-tight text-slate-900 mb-1">
                {isCoOp ? "Co-Op Request" : "Confirm Purchase"}
              </h3>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-4">
                Redeem <span className="text-slate-900 font-black">"{r.title}"</span>?
              </p>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 mb-4 space-y-2 text-left">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Points Pooling Details:</p>
                <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {contributors.map((mId) => {
                    const memberObj = rawMemberList.find((m: any) => (m.member_id === mId || m.id === mId));
                    const contributorAvatar = parseAvatarConfig(memberObj?.avatar_config);

                    return (
                      <div key={mId} className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2">
                          <Avatar config={contributorAvatar} className="size-5 rounded-md shadow-xs" />
                          <span className="text-xs font-black uppercase text-slate-700">{memberObj?.name}</span>
                        </div>
                        <span className="text-xs font-black text-rose-600">-{confirmingPurchase.splitCost} pts</span>
                      </div>
                    );
                  })}
                </div>
                {isCoOp && (
                  <p className="text-[8px] font-black text-indigo-600 uppercase tracking-widest text-center pt-1 select-none">
                    👥 Requires Admin Approval before points are deducted
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    claimReward.mutate({ rewardId: r.id, memberIds: contributors });
                  }}
                  disabled={claimReward.isPending}
                  className="w-full py-3.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl disabled:opacity-20 cursor-pointer active:scale-95 min-h-[44px]"
                >
                  {claimReward.isPending ? "CONFIRMING..." : isCoOp ? "SUBMIT REQUEST" : "YES, REDEEM!"}
                </button>

                <button 
                  type="button" 
                  onClick={() => setConfirmingPurchase(null)}
                  className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-600 transition-colors cursor-pointer p-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
