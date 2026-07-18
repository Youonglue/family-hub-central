import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck, Star, Gift, Lock, X } from "lucide-react";

// Offline Avatar Renderer Imports
import { Avatar, parseAvatarConfig } from "@/components/avatar/Avatar";

interface RewardActiveShopProps {
  activeMember: any;
  onBack: () => void;
  isAdminView: boolean;
  setIsAdminView: (show: boolean) => void;
  canAccessAdmin: boolean;
}

const EVENT_COLORS = ["sky", "rose", "amber", "emerald", "violet", "indigo", "cyan", "pink", "orange", "fuchsia", "lime", "teal"];

// Consistent auto-color hashing matching the calendar and chores
const getQuestColor = (title: string): string => {
  const colors = EVENT_COLORS.map(c => `var(--kid-${c})`);
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export function RewardActiveShop({
  activeMember,
  onBack,
  isAdminView,
  setIsAdminView,
  canAccessAdmin
}: RewardActiveShopProps) {
  const qc = useQueryClient();

  // Map to track contributors pooled for each reward card
  const [pooledContributors, setPooledContributors] = useState<Record<string, string[]>>({});

  // Local state to manage the custom in-app confirmation modal
  const [confirmingPurchase, setConfirmingPurchase] = useState<{ reward: any, contributors: any[], splitCost: number } | null>(null);

  // --- QUERY STATES (Cached) ---
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

  // Resolve the active member's latest data dynamically from points roster
  const memberRecord = useMemo(() => {
    const list = Array.isArray(pointsData.data) ? pointsData.data : [];
    return list.find((p: any) => p.member_id === activeMember.id) || activeMember;
  }, [pointsData.data, activeMember]);

  // Decode the main character's custom avatar config
  const avatarConfig = useMemo(() => {
    return parseAvatarConfig(memberRecord?.avatar_config);
  }, [memberRecord]);

  // Resolve member's active stats
  const stats = useMemo(() => {
    if (!memberRecord) return { balance: 0, level: 1, xp: 0 };
    return { 
      balance: memberRecord.balance || 0, 
      level: memberRecord.level || 1, 
      xp: memberRecord.xp || 0 
    };
  }, [memberRecord]);

  // --- MUTATION ---
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

  // Toggle contributor inside pooling state
  const handleToggleContributor = (rewardId: string, siblingId: string) => {
    setPooledContributors((prev) => {
      const current = prev[rewardId] ?? [];
      const updated = current.includes(siblingId)
        ? current.filter((id) => id !== siblingId)
        : [...current, siblingId];
      return { ...prev, [rewardId]: updated };
    });
  };

  const memberList = Array.isArray(pointsData.data) ? pointsData.data : [];
  const rewardList = Array.isArray(rewards.data) ? rewards.data : [];

  return (
    <div className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom-5 duration-300">
      
      {/* TOP HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-white p-4 rounded-3xl shadow-sm border-4 border-slate-50">
        <button onClick={onBack} className="flex items-center justify-center sm:justify-start gap-2 font-black text-slate-400 hover:text-slate-900 transition-colors uppercase text-xs tracking-widest py-2 cursor-pointer focus:outline-none">
          <ArrowLeft size={16} /> Exit Vault
        </button>
        
        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
            <p className="font-black uppercase italic text-slate-800 tracking-tight text-sm sm:text-base">{activeMember.name}</p>
            {canAccessAdmin && (
              <button onClick={() => setIsAdminView(!isAdminView)} className={`px-4 py-2.5 sm:px-6 sm:py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-xl transition-all w-full sm:w-auto cursor-pointer ${isAdminView ? 'bg-slate-900 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                <ShieldCheck size={18} /> {isAdminView ? "Exit Customization" : "Customize Shop"}
              </button>
            )}
        </div>
      </div>

      {/* GIANT HIGH-CONTRAST POINTS BANNER */}
      <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-2xl border-4 border-slate-50 flex flex-col md:flex-row items-center gap-6 sm:gap-10 relative overflow-hidden text-center md:text-left">
         
         {/* Custom Vector Avatar in Point Stash Banner */}
         <Avatar 
           config={avatarConfig} 
           className="size-20 sm:size-40 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl border-4 sm:border-[10px] border-white/30 shrink-0 mx-auto md:mx-0" 
         />

         <div className="flex-1 w-full space-y-2 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h2 className="text-2xl sm:text-5xl font-black tracking-tighter uppercase italic text-slate-900 truncate max-w-full">{activeMember.name}'s Stash</h2>
              <div className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black flex items-center justify-center gap-1 shadow-lg w-max mx-auto md:mx-0 select-none">
                <Star className="size-3.5 animate-pulse" /> SHOP UNLOCKED
              </div>
            </div>
            <div className="space-y-0.5 sm:space-y-1">
              <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">Active Points Balance</p>
              <p className="text-3xl sm:text-6xl font-black text-slate-900 leading-none tracking-tight">
                {stats.balance} <span className="text-xs sm:text-2xl font-black text-slate-400 uppercase">PTS AVAILABLE</span>
              </p>
            </div>
         </div>
      </div>

      {/* CATALOG GRID */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2">
         {rewardList.map((r: any) => {
           const rewardColor = getQuestColor(r.title);

           const isPoolingActive = pooledContributors[r.id] !== undefined;
           const activeContributors = [activeMember.id, ...(pooledContributors[r.id] ?? [])];
           const splitCost = Math.ceil(r.points / activeContributors.length);

           const hasEnoughPoints = activeContributors.every((memberId) => {
             const pointsRecord = memberList.find((p: any) => p.member_id === memberId);
             const balance = pointsRecord?.balance || 0;
             return balance >= splitCost;
           });

           return (
             <div 
               key={r.id} 
               className="bg-white p-5 sm:p-8 rounded-[2rem] sm:rounded-[3.5rem] border-4 border-slate-50 shadow-lg flex flex-col justify-between min-h-[300px] sm:min-h-[340px] aspect-auto relative overflow-visible group hover:shadow-2xl transition-all"
               style={{ borderLeftColor: rewardColor, borderLeftWidth: '12px' }}
             >
               <div className="flex justify-between items-start gap-4">
                 <div className="p-3 sm:p-4 bg-slate-50 rounded-2xl group-hover:rotate-12 transition-transform shadow-sm text-slate-800">
                     <Gift size={32} />
                 </div>
                 <div className="text-right shrink-0">
                   <div className="bg-slate-900 text-white px-4 py-1.5 sm:px-5 sm:py-2 rounded-2xl font-black italic shadow-lg inline-block text-sm sm:text-base">
                     {r.points} PTS
                   </div>
                   {isPoolingActive && (
                     <p className="text-[9px] sm:text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">Split: {splitCost} pts each</p>
                   )}
                 </div>
               </div>
               
               <div className="space-y-3 sm:space-y-4 mt-4">
                 <h4 className="text-xl sm:text-3xl font-black text-slate-800 leading-none uppercase tracking-tighter truncate max-w-full">
                   {r.title}
                 </h4>

                 {/* --- CO-OP POOLING SECTION --- */}
                 <div className="border-t border-slate-100 pt-3 space-y-2">
                   <label className="flex items-center gap-2 text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-wider cursor-pointer select-none">
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
                     <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                       <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Select contributing siblings:</p>
                       <div className="flex flex-wrap gap-2">
                         {memberList.filter((m: any) => m.member_id !== activeMember.id).map((m: any) => {
                           const isChecked = (pooledContributors[r.id] ?? []).includes(m.member_id);
                           const balance = m.balance || 0;
                           const isShort = balance < splitCost;
                           const siblingAvatar = parseAvatarConfig(m.avatar_config);

                           return (
                             <button
                               type="button"
                               key={m.member_id}
                               onClick={() => handleToggleContributor(r.id, m.member_id)}
                               className={`px-2.5 py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase border-2 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                                 isChecked 
                                   ? isShort 
                                     ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-sm' 
                                     : 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm'
                                   : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'
                               }`}
                             >
                               {/* Sibling customizable avatar miniature */}
                               <Avatar 
                                 config={siblingAvatar} 
                                 className="size-5 rounded-md" 
                               />
                               <span>{m.name}</span>
                               <span className="text-[8px] font-bold text-slate-400">({balance})</span>
                             </button>
                           );
                         })}
                       </div>
                     </div>
                   )}
                 </div>
                 
                 {/* Interactive Claim Button */}
                 {hasEnoughPoints ? (
                   <button
                     onClick={() => {
                       setConfirmingPurchase({
                         reward: r,
                         contributors: activeContributors,
                         splitCost
                       });
                     }}
                     className="w-full py-3 sm:py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-[0.98]"
                   >
                     <Gift size={14} /> {isPoolingActive ? `Request Co-Op (${splitCost} pts each)` : "Claim Reward"}
                   </button>
                 ) : (
                   <button
                     disabled
                     className="w-full py-3 sm:py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-not-allowed border-2 border-dashed border-slate-200"
                   >
                     <Lock size={14} /> Insufficient Points
                   </button>
                 )}
               </div>
             </div>
           );
         })}
      </div>

      {/* --- CUSTOM IN-APP PURCHASE CONFIRMATION OVERLAY MODAL (Mobile-Optimized Borders) --- */}
      {confirmingPurchase && (() => {
        const r = confirmingPurchase.reward;
        const contributors = confirmingPurchase.contributors;
        const isCoOp = contributors.length > 1;

        return (
          <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-900/60 backdrop-blur-md p-4" onClick={() => setConfirmingPurchase(null)}>
            <div className="w-full max-w-md bg-white rounded-[3rem] sm:rounded-[4rem] p-6 sm:p-10 shadow-2xl border-4 sm:border-[12px] border-slate-50 text-center animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="size-16 sm:size-20 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 text-indigo-600 shadow-inner">
                <Gift size={32} />
              </div>
              
              <h3 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter text-slate-900 mb-2">
                {isCoOp ? "Co-Op Request" : "Confirm Purchase"}
              </h3>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-6 leading-relaxed">
                Are you sure you want to claim <span className="text-slate-900 font-black">"{r.title}"</span>?
              </p>

              {/* Contributor Overview */}
              <div className="bg-slate-50 p-4 sm:p-6 rounded-[2rem] border-2 border-slate-100 mb-6 sm:mb-8 space-y-2 sm:space-y-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Points Pooling Details:</p>
                <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                  {contributors.map((mId) => {
                    const memberObj = memberList.find((m: any) => m.member_id === mId);
                    const contributorAvatar = parseAvatarConfig(memberObj?.avatar_config);

                    return (
                      <div key={mId} className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2">
                          {/* Miniature custom avatar for each pooling contributor */}
                          <Avatar 
                            config={contributorAvatar} 
                            className="size-6 rounded-md shadow-sm" 
                          />
                          <span className="text-xs font-black uppercase text-slate-700">{memberObj?.name}</span>
                        </div>
                        <span className="text-xs font-black text-rose-600">-{confirmingPurchase.splitCost} pts</span>
                      </div>
                    );
                  })}
                </div>
                {isCoOp && (
                  <p className="text-[8px] font-black text-indigo-600 uppercase tracking-widest text-center pt-2 select-none">
                    👥 Requires Admin Approval before points are spent
                  </p>
                )}
              </div>

              <div className="space-y-3 sm:space-y-4">
                <button
                  onClick={() => {
                    claimReward.mutate({ rewardId: r.id, memberIds: contributors });
                  }}
                  disabled={claimReward.isPending}
                  className="w-full py-4 sm:py-5 bg-slate-900 hover:bg-indigo-600 text-white rounded-[2rem] font-black text-base sm:text-lg uppercase tracking-widest transition-all shadow-xl disabled:opacity-20 cursor-pointer active:scale-95"
                >
                  {claimReward.isPending ? "CONFIRMING..." : isCoOp ? "SUBMIT REQUEST" : "YES, REDEEM!"}
                </button>

                <button 
                  type="button" 
                  onClick={() => setConfirmingPurchase(null)}
                  className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-600 transition-colors cursor-pointer"
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
