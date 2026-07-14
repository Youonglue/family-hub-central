import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { listMembers } from "@/lib/hub-api";
import { getMe } from "@/lib/auth-client";
import { 
  Gift, ArrowLeft, Trophy, ShieldCheck, CheckCircle2, UserCircle, Timer, 
  Trash2, Plus, Gem, Star, Lock, Heart, X, Check
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/rewards")({
  ssr: false,
  component: ShoppingPage,
});

// HERO ICON MAP
const ICONS: Record<string, any> = { Ghost: UserCircle, Cat: UserCircle, Dog: UserCircle, Rabbit: UserCircle, Shield: UserCircle };

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

function ShoppingPage() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const members = useQuery({ queryKey: ["members"], queryFn: listMembers });

  const [activeMember, setActiveMember] = useState<any>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isAdminView, setIsAdminView] = useState(false);
  const [newReward, setNewReward] = useState({ title: "", points: 100 });

  // Map to track contributors pooled for each reward card
  const [pooledContributors, setPooledContributors] = useState<Record<string, string[]>>({});

  // Local state to manage the custom in-app confirmation modal
  const [confirmingPurchase, setConfirmingPurchase] = useState<{ reward: any, contributors: any[], splitCost: number } | null>(null);

  const isSystemAdmin = me.data?.role?.toLowerCase() === "admin";

  // --- DATA FETCHING ---
  const rewards = useQuery({ 
    queryKey: ["rewards"], 
    queryFn: () => fetch('/api/rewards').then(res => res.json()) 
  });

  const pointsData = useQuery({ 
    queryKey: ["points"], 
    queryFn: () => fetch('/api/chores/points').then(res => res.json()) 
  });

  // Resolve member's active stats
  const stats = useMemo(() => {
    const data = Array.isArray(pointsData.data) ? pointsData.data : [];
    if (!activeMember || data.length === 0) return { balance: 0, level: 1, xp: 0 };
    const found = data.find((p: any) => p.member_id === activeMember.id);
    if (!found) return { balance: 0, level: 1, xp: 0 };
    return { balance: found.balance, level: found.level || 1, xp: found.xp || 0 };
  }, [activeMember, pointsData.data]);

  // --- INACTIVITY TIMEOUT ---
  useEffect(() => {
    if (!activeMember) return;
    const interval = setInterval(() => {
      if (Date.now() - lastActivity > 60000) {
        setActiveMember(null);
        setIsAdminView(false);
        setConfirmingPurchase(null);
        toast("Shop Reset for Safety", { icon: <Timer className="size-4" /> });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeMember, lastActivity]);

  const recordActivity = useCallback(() => setLastActivity(Date.now()), []);

  const inv = () => {
    qc.invalidateQueries({ queryKey: ["rewards"] });
    qc.invalidateQueries({ queryKey: ["points"] });
    qc.invalidateQueries({ queryKey: ["members"] });
    qc.invalidateQueries({ queryKey: ["pending-redemptions"] });
  };

  // --- MUTATIONS ---
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

  // Create Reward (Admin Only)
  const addReward = useMutation({
    mutationFn: (data: any) => 
      fetch('/api/rewards', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then(res => res.json()),
    onSuccess: () => {
      toast.success("Reward Added to Shop Catalog!");
      inv();
      setNewReward({ title: "", points: 100 });
    }
  });

  // Delete Reward (Admin Only)
  const deleteReward = useMutation({
    mutationFn: (id: string) => 
      fetch(`/api/rewards/${id}`, {
        method: "DELETE"
      }).then(res => res.json()),
    onSuccess: () => {
      toast.success("Reward Removed from Catalog");
      inv();
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

  // --- SESSION LOADING GUARD ---
  if (me.isLoading || members.isLoading) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[85vh] p-6">
          <p className="font-black text-slate-400 uppercase tracking-widest text-xs italic animate-pulse">Synchronizing Vault...</p>
        </div>
      </AppShell>
    );
  }

  const memberList = Array.isArray(members.data) ? members.data : [];
  const rewardList = Array.isArray(rewards.data) ? rewards.data : [];

  // --- SCREEN 1: SHOP CHARACTER SELECT ---
  if (!activeMember && !isAdminView) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[85vh] p-4 md:p-6 relative">
          
          {/* Admin Reward Management Entry */}
          {isSystemAdmin && (
            <button 
              onClick={() => setIsAdminView(true)}
              className="absolute top-4 right-4 bg-indigo-50 border-2 border-indigo-200 text-indigo-600 px-4 py-2.5 sm:px-6 sm:py-3 rounded-2xl font-black text-[10px] sm:text-xs uppercase flex items-center gap-2 shadow-sm hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
            >
              <ShieldCheck size={16} /> Customize Shop
            </button>
          )}

          <Gem className="size-12 sm:size-16 text-indigo-500 mb-6 animate-pulse" />
          <h1 className="text-3xl sm:text-5xl font-black mb-8 sm:mb-12 uppercase italic tracking-tighter text-slate-900 text-center">Enter Vault</h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 max-w-5xl w-full">
            {memberList.map((m: any) => {
              const HeroIcon = ICONS[m.avatar_icon] || UserCircle;
              
              // Resolve active points balance for card view
              const pointsRecord = (pointsData.data as any[])?.find((p: any) => p.member_id === m.id);
              const balance = pointsRecord?.balance || 0;

              return (
                <button key={m.id} onClick={() => { setActiveMember(m); recordActivity(); }} className="group flex flex-col items-center gap-3 sm:gap-4">
                  <div className="size-32 sm:size-48 rounded-[2rem] sm:rounded-[3rem] shadow-2xl border-4 sm:border-8 border-white transition-all group-hover:scale-105 group-hover:rotate-3 flex items-center justify-center text-white" style={{ backgroundColor: m.avatar_color }}>
                    <HeroIcon size={80} />
                  </div>
                  <span className="text-lg sm:text-2xl font-black text-slate-800 uppercase tracking-widest text-center truncate max-w-full">{m.name}</span>
                  <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{balance} Points</p>
                </button>
              );
            })}
          </div>
        </div>
      </AppShell>
    );
  }

  const canAccessAdmin = isSystemAdmin || activeMember?.is_parent === 1 || activeMember?.is_parent === true;

  // --- SCREEN 2: ACTIVE REWARDS BOARD ---
  return (
    <AppShell>
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8" onMouseMove={recordActivity} onClick={recordActivity}>
        
        {/* TOP CONTROLS */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-white p-4 rounded-3xl shadow-sm border-4 border-slate-50">
          <button onClick={() => { setActiveMember(null); setIsAdminView(false); }} className="flex items-center justify-center sm:justify-start gap-2 font-black text-slate-400 hover:text-slate-900 transition-colors uppercase text-xs tracking-widest py-2">
            <ArrowLeft size={16} /> Exit Vault
          </button>
          
          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
              <p className="font-black uppercase italic text-slate-800 tracking-tight text-sm sm:text-base">{activeMember ? activeMember.name : "System Admin"}</p>
              {canAccessAdmin && (
                <button onClick={() => setIsAdminView(!isAdminView)} className={`px-4 py-2.5 sm:px-6 sm:py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-xl transition-all w-full sm:w-auto ${isAdminView ? 'bg-slate-900 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                  <ShieldCheck size={18} /> {isAdminView ? "Exit Customization" : "Customize Shop"}
                </button>
              )}
          </div>
        </div>

        {isAdminView ? (
          // === ADMIN VIEW: REWARD CUSTOMIZATION & ADDITION ===
          <div className="space-y-6 md:space-y-10 animate-in zoom-in-95 duration-200">
             <section className="bg-slate-900 text-white p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] shadow-xl">
               <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter mb-4 md:mb-6 flex items-center gap-3">
                 <Gift className="text-indigo-400 size-7 md:size-8" /> Reward Catalog & Customization
               </h2>
               
               <form onSubmit={(e) => { e.preventDefault(); addReward.mutate(newReward); }} className="flex flex-col sm:flex-row gap-3 mb-6 md:mb-8 bg-white/5 p-4 md:p-6 rounded-[2rem] border border-white/10">
                 <input value={newReward.title} onChange={e => setNewReward({...newReward, title: e.target.value})} placeholder="New Reward Title (e.g. 1hr Video Games)..." className="flex-1 p-4 rounded-xl bg-white/10 border-4 border-transparent focus:border-indigo-500 outline-none font-bold text-white placeholder:text-white/30 text-sm sm:text-base" required />
                 <div className="flex gap-3">
                   <input type="number" value={newReward.points} onChange={e => setNewReward({...newReward, points: parseInt(e.target.value) || 0})} className="w-24 p-4 rounded-xl bg-white/10 border-4 border-transparent focus:border-indigo-500 outline-none font-black text-white text-center text-sm sm:text-base" required />
                   <button type="submit" disabled={addReward.isPending || !newReward.title.trim()} className="flex-1 bg-indigo-500 px-6 py-4 rounded-xl font-black shadow-lg hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm">
                     <Plus size={18} /> ADD
                   </button>
                 </div>
               </form>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                 {rewardList.map((r: any) => (
                   <div key={r.id} className="bg-white/5 p-4 md:p-5 rounded-2xl flex justify-between items-center border border-white/10 group">
                      <div className="min-w-0">
                        <p className="font-bold text-sm md:text-lg uppercase tracking-tight truncate">{r.title}</p>
                        <p className="text-indigo-400 font-black text-[9px] sm:text-[10px] uppercase tracking-widest">{r.points} Points Cost</p>
                      </div>
                      <button onClick={() => deleteReward.mutate(r.id)} className="p-2 bg-rose-500/20 text-rose-400 rounded-xl hover:bg-rose-50 hover:text-white transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 size={16} />
                      </button>
                   </div>
                 ))}
               </div>
             </section>
          </div>
        ) : (
          // === KID VIEW: BROWSE & REDEEM REWARDS ===
          <div className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom-5 duration-300">
            {/* Points banner layout */}
            <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[4rem] shadow-2xl border-4 border-slate-50 flex flex-col md:flex-row items-center gap-6 sm:gap-10 relative overflow-hidden">
               <div className="size-20 sm:size-40 rounded-[1.5rem] sm:rounded-[2.5rem] flex items-center justify-center text-3xl sm:text-5xl font-black text-white shadow-2xl border-4 sm:border-[10px] border-white/30 shrink-0" style={{ backgroundColor: activeMember.avatar_color }}>
                 ★
               </div>
               <div className="flex-1 w-full space-y-2 sm:space-y-4 text-center md:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h2 className="text-2xl sm:text-5xl font-black tracking-tighter uppercase italic text-slate-900 truncate max-w-full">{activeMember.name}'s Stash</h2>
                    <div className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black flex items-center justify-center gap-1 shadow-lg w-max mx-auto md:mx-0"><Star className="size-3.5" /> SHOP UNLOCKED</div>
                  </div>
                  <div className="space-y-0.5 sm:space-y-1">
                    <p className="text-[10px] sm:text-sm font-black text-slate-400 uppercase tracking-widest">Active Points Balance</p>
                    <p className="text-3xl sm:text-6xl font-black text-slate-900 leading-none tracking-tight">{stats.balance} <span className="text-xs sm:text-2xl font-black text-slate-400 uppercase">PTS AVAILABLE</span></p>
                  </div>
               </div>
            </div>

            {/* Responsive catalog grid */}
            <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2">
               {rewardList.map((r: any) => {
                 const rewardColor = getQuestColor(r.title);

                 const isPoolingActive = pooledContributors[r.id] !== undefined;
                 const activeContributors = [activeMember.id, ...(pooledContributors[r.id] ?? [])];
                 const splitCost = Math.ceil(r.points / activeContributors.length);

                 const hasEnoughPoints = activeContributors.every((memberId) => {
                   const pointsRecord = (pointsData.data as any[])?.find((p: any) => p.member_id === memberId);
                   const balance = pointsRecord?.balance || 0;
                   return balance >= splitCost;
                 });

                 return (
                   <div 
                     key={r.id} 
                     // Fix: Changed overflow-hidden to overflow-visible and aspect-video to aspect-auto + min-h-[340px]
                     // This allows cards to automatically grow vertically to perfectly fit long sibling checklists!
                     className="bg-white p-5 sm:p-8 rounded-[2rem] sm:rounded-[3.5rem] border-4 border-slate-50 shadow-lg flex flex-col justify-between min-h-[340px] aspect-auto relative overflow-visible group hover:shadow-2xl transition-all"
                     style={{ borderLeftColor: rewardColor, borderLeftWidth: '12px' }}
                   >
                     <div className="flex justify-between items-start gap-4">
                       <div className="p-3 sm:p-4 bg-slate-50 rounded-2xl group-hover:rotate-12 transition-transform shadow-sm text-slate-800">
                           <Gift className="size-6 sm:size-8" />
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
                             <div className="flex flex-wrap gap-1.5">
                               {memberList.filter((m: any) => m.id !== activeMember.id).map((m: any) => {
                                 const isChecked = (pooledContributors[r.id] ?? []).includes(m.id);
                                 const pointsRecord = (pointsData.data as any[])?.find((p: any) => p.member_id === m.id);
                                 const balance = pointsRecord?.balance || 0;
                                 const isShort = balance < splitCost;

                                 return (
                                   <button
                                     type="button"
                                     key={m.id}
                                     onClick={() => handleToggleContributor(r.id, m.id)}
                                     className={`px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-black uppercase border-2 flex items-center gap-1 transition-all cursor-pointer ${
                                       isChecked 
                                         ? isShort 
                                           ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-sm' 
                                           : 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm'
                                         : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'
                                     }`}
                                   >
                                     <div className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: m.avatar_color }} />
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
                           className="w-full py-3 sm:py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
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
          </div>
        )}

        {/* --- CUSTOM IN-APP PURCHASE CONFIRMATION OVERLAY MODAL --- */}
        {confirmingPurchase && (() => {
          const r = confirmingPurchase.reward;
          const contributors = confirmingPurchase.contributors;
          const isCoOp = contributors.length > 1;

          return (
            <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-900/60 backdrop-blur-md p-4" onClick={() => setConfirmingPurchase(null)}>
              <div className="w-full max-w-md bg-white rounded-[3rem] sm:rounded-[4rem] p-6 sm:p-10 shadow-2xl border-[10px] sm:border-[12px] border-slate-50 text-center animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
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
                  <div className="flex flex-col gap-2">
                    {contributors.map((mId) => {
                      const memberObj = memberList.find((m: any) => m.id === mId);
                      return (
                        <div key={mId} className="flex justify-between items-center bg-white px-3.5 py-2 rounded-xl border border-slate-200">
                          <div className="flex items-center gap-2">
                            <div className="size-2 rounded-full" style={{ backgroundColor: memberObj?.avatar_color }} />
                            <span className="text-xs font-black uppercase text-slate-700">{memberObj?.name}</span>
                          </div>
                          <span className="text-xs font-black text-rose-600">-{confirmingPurchase.splitCost} pts</span>
                        </div>
                      );
                    })}
                  </div>
                  {isCoOp && (
                    <p className="text-[8px] font-black text-indigo-600 uppercase tracking-widest text-center pt-2">
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
                    className="w-full py-4 sm:py-5 bg-slate-900 hover:bg-indigo-600 text-white rounded-[2rem] font-black text-base sm:text-lg uppercase tracking-widest transition-all shadow-xl disabled:opacity-20 cursor-pointer"
                  >
                    {claimReward.isPending ? "CONFIRMING..." : isCoOp ? "SUBMIT REQUEST" : "YES, REDEEM!"}
                  </button>

                  <button 
                    type="button" 
                    onClick={() => setConfirmingPurchase(null)}
                    className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
        
        <footer className="pt-20 text-center">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] flex items-center justify-center gap-2 opacity-50">
            <Timer className="size-3" /> Auto-Reset Vault Engaged
          </p>
        </footer>
      </div>
    </AppShell>
  );
}
