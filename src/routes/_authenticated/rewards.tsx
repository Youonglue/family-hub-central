import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { listMembers } from "@/lib/hub-api";
import { getMe } from "@/lib/auth-client";
import { 
  Gift, ArrowLeft, Trophy, ShieldCheck, CheckCircle2, UserCircle, Timer, 
  Trash2, Plus, Gem, Star, Lock, Heart 
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/rewards")({
  ssr: false,
  component: RewardsShop,
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

function RewardsShop() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const members = useQuery({ queryKey: ["members"], queryFn: listMembers });

  const [activeMember, setActiveMember] = useState<any>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isAdminView, setIsAdminView] = useState(false);
  const [newReward, setNewReward] = useState({ title: "", points: 100 });

  const isSystemAdmin = me.data?.role?.toLowerCase() === "admin";

  // --- DATA FETCHING ---
  // Fetch active rewards
  const rewards = useQuery({ 
    queryKey: ["rewards"], 
    queryFn: () => fetch('/api/rewards').then(res => res.json()) 
  });

  // Fetch points ledger to get active balances
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
  };

  // --- MUTATIONS ---
  // Claim/Redeem Reward
  const claimReward = useMutation({
    mutationFn: (id: string) => 
      fetch(`/api/rewards/${id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: activeMember.id })
      }).then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Claim failed");
        }
        return res.json();
      }),
    onSuccess: (data) => {
      toast.success(`Reward Claimed! Remaining: ${data.balanceRemaining} pts 🎁`);
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

  // Delete/Inactivate Reward (Admin Only)
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
        <div className="flex flex-col items-center justify-center min-h-[85vh] p-6 relative">
          
          {/* Admin Reward Management Entry */}
          {isSystemAdmin && (
            <button 
              onClick={() => setIsAdminView(true)}
              className="absolute top-4 right-4 bg-indigo-50 border-2 border-indigo-200 text-indigo-600 px-6 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-sm hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
            >
              <ShieldCheck size={18} /> Customize Shop Catalog
            </button>
          )}

          <Gem className="size-16 text-indigo-500 mb-6 animate-pulse" />
          <h1 className="text-5xl font-black mb-12 uppercase italic tracking-tighter text-slate-900">Enter Vault</h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl w-full">
            {memberList.map((m: any) => {
              const HeroIcon = ICONS[m.avatar_icon] || UserCircle;
              
              // Resolve active points balance for card view
              const pointsRecord = (pointsData.data as any[])?.find((p: any) => p.member_id === m.id);
              const balance = pointsRecord?.balance || 0;

              return (
                <button key={m.id} onClick={() => { setActiveMember(m); recordActivity(); }} className="group flex flex-col items-center gap-4">
                  <div className="size-48 rounded-[3rem] shadow-2xl border-8 border-white transition-all group-hover:scale-105 group-hover:rotate-3 flex items-center justify-center text-white" style={{ backgroundColor: m.avatar_color }}>
                    <HeroIcon size={80} />
                  </div>
                  <span className="text-2xl font-black text-slate-800 uppercase tracking-widest">{m.name}</span>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{balance} Points Available</p>
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
      <div className="max-w-5xl mx-auto p-6 space-y-8" onMouseMove={recordActivity} onClick={recordActivity}>
        
        {/* TOP CONTROLS */}
        <div className="flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm border-4 border-slate-50">
          <button onClick={() => { setActiveMember(null); setIsAdminView(false); }} className="flex items-center gap-2 font-black text-slate-400 hover:text-slate-900 transition-colors uppercase text-xs tracking-widest px-4">
            <ArrowLeft size={16} /> Exit Vault
          </button>
          
          <div className="flex items-center gap-4">
              <p className="font-black uppercase italic text-slate-800">{activeMember ? activeMember.name : "System Admin"}</p>
              {canAccessAdmin && (
                <button onClick={() => setIsAdminView(!isAdminView)} className={`px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-xl transition-all ${isAdminView ? 'bg-slate-900 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                  <ShieldCheck size={18} /> {isAdminView ? "Exit Customization" : "Customize Shop"}
                </button>
              )}
          </div>
        </div>

        {isAdminView ? (
          // === ADMIN VIEW: REWARD CUSTOMIZATION & ADDITION ===
          <div className="space-y-10 animate-in zoom-in-95 duration-200">
             <section className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-xl">
               <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-6 flex items-center gap-3">
                 <Gift className="text-indigo-400 size-8" /> Reward Catalog & Customization
               </h2>
               
               <form onSubmit={(e) => { e.preventDefault(); addReward.mutate(newReward); }} className="flex gap-4 mb-8">
                 <input value={newReward.title} onChange={e => setNewReward({...newReward, title: e.target.value})} placeholder="New Reward Title (e.g. 1hr Video Games)..." className="flex-1 p-5 rounded-2xl bg-white/10 border-4 border-transparent focus:border-indigo-500 outline-none font-bold text-white placeholder:text-white/30" required />
                 <input type="number" value={newReward.points} onChange={e => setNewReward({...newReward, points: parseInt(e.target.value) || 0})} className="w-28 p-5 rounded-2xl bg-white/10 border-4 border-transparent focus:border-indigo-500 outline-none font-black text-white text-center" required />
                 <button type="submit" disabled={addReward.isPending || !newReward.title.trim()} className="bg-indigo-500 px-8 rounded-2xl font-black shadow-lg hover:bg-indigo-600 transition-all flex items-center gap-2 cursor-pointer">
                   <Plus size={24} /> ADD REWARD
                 </button>
               </form>

               <div className="grid sm:grid-cols-2 gap-4">
                 {rewardList.map((r: any) => (
                   <div key={r.id} className="bg-white/5 p-5 rounded-2xl flex justify-between items-center border border-white/10 group">
                      <div>
                        <p className="font-bold text-lg uppercase tracking-tight">{r.title}</p>
                        <p className="text-indigo-400 font-black text-[10px] uppercase tracking-widest">{r.points} Points Cost</p>
                      </div>
                      <button onClick={() => deleteReward.mutate(r.id)} className="p-3 bg-rose-500/20 text-rose-400 rounded-xl hover:bg-rose-50 hover:text-white transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 size={18} />
                      </button>
                   </div>
                 ))}
               </div>
             </section>
          </div>
        ) : (
          // === KID VIEW: BROWSE & REDEEM REWARDS ===
          <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-300">
            {/* Giant High-Contrast Points Banner */}
            <div className="bg-white p-10 rounded-[4rem] shadow-2xl border-4 border-slate-50 flex flex-col md:flex-row items-center gap-10 relative overflow-hidden">
               <div className="size-40 rounded-[2.5rem] flex items-center justify-center text-5xl font-black text-white shadow-2xl border-[10px] border-white/30" style={{ backgroundColor: activeMember.avatar_color }}>
                 ★
               </div>
               <div className="flex-1 w-full space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-5xl font-black tracking-tighter uppercase italic text-slate-900">{activeMember.name}'s Stash</h2>
                    <div className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-1 shadow-lg"><Star className="size-4" /> SHOP ACCESS UNLOCKED</div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Active Points Balance</p>
                    <p className="text-6xl font-black text-slate-900 leading-none tracking-tight">{stats.balance} <span className="text-2xl font-black text-slate-400 uppercase">PTS AVAILABLE</span></p>
                  </div>
               </div>
            </div>

            {/* Catalog Grid */}
            <div className="grid gap-6 sm:grid-cols-2">
               {rewardList.map((r: any) => {
                 const hasEnoughPoints = stats.balance >= r.points;
                 const rewardColor = getQuestColor(r.title);

                 return (
                   <div 
                     key={r.id} 
                     className="bg-white p-8 rounded-[3.5rem] border-4 border-slate-50 shadow-lg flex flex-col justify-between aspect-video relative overflow-hidden group hover:shadow-2xl transition-all"
                     style={{ borderLeftColor: rewardColor, borderLeftWidth: '16px' }}
                   >
                     <div className="flex justify-between items-start">
                       <div className="p-4 bg-slate-50 rounded-3xl group-hover:rotate-12 transition-transform shadow-sm text-slate-800">
                           <Gift size={32} />
                       </div>
                       <div className="bg-slate-900 text-white px-5 py-2 rounded-2xl font-black italic shadow-lg">
                         {r.points} PTS
                       </div>
                     </div>
                     
                     <div className="space-y-4">
                       <h4 className="text-3xl font-black text-slate-800 leading-none uppercase tracking-tighter truncate max-w-full">
                         {r.title}
                       </h4>
                       
                       {/* Interactive Claim Button with Overdraft safety checks */}
                       {hasEnoughPoints ? (
                         <button
                           onClick={() => {
                             if (confirm(`Redeem ${r.points} points for "${r.title}"?`)) {
                               claimReward.mutate(r.id);
                             }
                           }}
                           disabled={claimReward.isPending}
                           className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
                         >
                           <Gift size={14} /> {claimReward.isPending ? "Claiming..." : "Claim Reward"}
                         </button>
                       ) : (
                         <button
                           disabled
                           className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-not-allowed border-2 border-dashed border-slate-200"
                         >
                           <Lock size={14} /> Insufficient Points ({r.points - stats.balance} more needed)
                         </button>
                       )}
                     </div>
                   </div>
                 );
               })}
            </div>
          </div>
        )}
        
        <footer className="pt-20 text-center">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] flex items-center justify-center gap-2 opacity-50">
            <Timer className="size-3" /> Auto-Reset Vault Engaged
          </p>
        </footer>
      </div>
    </AppShell>
  );
}
