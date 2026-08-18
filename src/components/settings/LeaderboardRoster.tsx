// src/components/settings/LeaderboardRoster.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { listMembers } from "@/lib/hub-api";
import { getMe } from "@/lib/auth-client";
import { Users, Trash2, ShieldCheck, Eye, EyeOff, LayoutDashboard, Trophy, Gift, Smartphone } from "lucide-react";
import { Avatar, parseAvatarConfig } from "@/components/avatar/Avatar";

export function LeaderboardRoster() {
  const qc = useQueryClient();

  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const members = useQuery({ queryKey: ["members"], queryFn: listMembers });
  
  const users = useQuery({ 
    queryKey: ["known-users"], 
    queryFn: () => fetch('/api/auth/users').then(res => res.json()) 
  });

  const [deductingMember, setDeductingMember] = useState<any>(null);
  const [deductPointsAmount, setDeductPointsAmount] = useState("");

  const inv = () => {
    qc.invalidateQueries({ queryKey: ["members"] });
    qc.invalidateQueries({ queryKey: ["known-users"] });
    qc.invalidateQueries({ queryKey: ["points"] });
  };

  const promote = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch('/api/auth/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (!res.ok) throw new Error("Promotion failed");
      return res.json();
    },
    onSuccess: () => { toast.success("User Promoted to Admin!"); inv(); },
    onError: () => toast.error("Failed to promote user")
  });

  const demote = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch('/api/auth/demote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Demotion failed");
      }
      return res.json();
    },
    onSuccess: () => { toast.success("User Demoted to standard user"); inv(); },
    onError: (err: any) => toast.error(err.message || "Failed to demote")
  });

  const deleteAccount = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/auth/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete account");
      }
      return res.json();
    },
    onSuccess: () => { toast.success("Account deleted successfully"); inv(); },
    onError: (err: any) => toast.error(err.message || "Failed to delete account")
  });

  const linkAccount = useMutation({
    mutationFn: async ({ memberId, userId }: { memberId: string | null, userId: string }) => {
      const res = await fetch('/api/auth/link-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, userId })
      });
      if (!res.ok) throw new Error("Failed to link account");
      return res.json();
    },
    onSuccess: () => { toast.success("Account link updated!"); inv(); },
    onError: () => toast.error("Failed to link account")
  });

  const toggleVisibility = useMutation({
    mutationFn: async ({ memberId, section, visible }: { memberId: string; section: string; visible: boolean }) => {
      const res = await fetch('/api/members/visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, section, visible })
      });
      if (!res.ok) throw new Error("Failed to update visibility");
      return res.json();
    },
    onSuccess: () => { toast.success("Visibility setting saved!"); inv(); },
    onError: () => toast.error("Failed to update hero visibility")
  });

  const deductPoints = useMutation({
    mutationFn: async ({ memberId, points }: { memberId: string; points: number }) => {
      const res = await fetch('/api/chores/deduct-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, points })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to deduct points");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Points deducted successfully!");
      inv();
      setDeductingMember(null);
      setDeductPointsAmount("");
    },
    onError: (err: any) => toast.error(err.message || "Failed to deduct points")
  });

  const userList = Array.isArray(users.data) ? users.data : [];
  const memberList = Array.isArray(members.data) ? members.data : [];
  const totalAdminsCount = userList.filter((usr: any) => usr.role === 'admin').length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      
      {/* 1. KNOWN USER ACCOUNTS */}
      <section className="rounded-3xl sm:rounded-[3rem] border-2 sm:border-4 border-slate-50 bg-white p-5 sm:p-8 shadow-sm">
        <div className="mb-4 sm:mb-6 flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users className="size-5" />
          </div>
          <div>
            <h2 className="font-display text-base sm:text-lg font-black uppercase italic tracking-tight text-slate-900">User Accounts</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Manage Parent Logins & Roles</p>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {userList.map((u: any) => {
            const linkedMember = memberList.find((m: any) => m.user_id === u.id);
            const isSelf = u.username === me.data?.username;

            return (
              <div key={u.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 rounded-2xl bg-slate-50 p-4 sm:p-6 border border-slate-100">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-lg font-black text-[9px] uppercase tracking-wider ${
                      u.role === 'admin' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {u.role === 'admin' ? 'ADMIN' : 'USER'}
                    </span>
                    <p className="font-black text-base sm:text-lg uppercase tracking-tight text-slate-800">{u.username}</p>
                    {isSelf && <span className="text-[10px] font-bold text-slate-400 italic font-mono">(You)</span>}
                  </div>
                  
                  {/* Account linking dropdown */}
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Associated Hero:</span>
                    <select
                      value={linkedMember?.id || ""}
                      onChange={(e) => {
                        const selectedMemberId = e.target.value || null;
                        linkAccount.mutate({ memberId: selectedMemberId, userId: u.id });
                      }}
                      className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[10px] font-bold uppercase outline-none focus:border-indigo-500 min-h-[36px]"
                    >
                      <option value="">-- No Hero Linked --</option>
                      {memberList.map((m: any) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {!isSelf && (
                  <div className="flex items-center gap-2 self-end md:self-auto pt-2 md:pt-0">
                    {u.role === 'admin' ? (
                      totalAdminsCount > 1 ? (
                        <button
                          onClick={() => demote.mutate(u.id)}
                          disabled={demote.isPending}
                          className="px-3 sm:px-4 py-2 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl font-black text-[10px] uppercase hover:bg-rose-100 transition-all cursor-pointer min-h-[40px]"
                        >
                          {demote.isPending ? "Demoting..." : "Demote"}
                        </button>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-400 uppercase italic">(Sole Admin)</span>
                      )
                    ) : (
                      <button
                        onClick={() => promote.mutate(u.id)}
                        disabled={promote.isPending}
                        className="px-3 sm:px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase hover:border-indigo-500 transition-all cursor-pointer min-h-[40px]"
                      >
                        {promote.isPending ? "Promoting..." : "Promote"}
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (confirm(`Permanently delete the account "${u.username}"?`)) {
                          deleteAccount.mutate(u.id);
                        }
                      }}
                      disabled={deleteAccount.isPending}
                      className="p-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-xl text-slate-400 transition-all cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                      title="Delete User Account"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. HERO SECTION VISIBILITY & POINT DEDUCTION CONTROLS */}
      <section className="rounded-3xl sm:rounded-[3rem] border-2 sm:border-4 border-slate-50 bg-white p-5 sm:p-8 shadow-sm">
        <div className="mb-4 sm:mb-6 flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h2 className="font-display text-base sm:text-lg font-black uppercase italic tracking-tight text-slate-900">
              Hero Section Visibility
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Choose exactly where each Hero is displayed across the Hub
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {memberList.map((m: any) => {
            const isDashVisible = m.show_on_dashboard !== 0 && m.show_on_leaderboard !== 0;
            const isChoresVisible = m.show_on_chores !== 0;
            const isRewardsVisible = m.show_on_rewards !== 0;
            const isKioskVisible = m.show_on_kiosk !== 0;

            return (
              <div key={m.id} className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:p-5 border border-slate-100">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Avatar 
                      config={parseAvatarConfig(m.avatar_config)} 
                      className="size-10 sm:size-12 rounded-xl shadow-sm shrink-0" 
                    />
                    <div>
                      <p className="font-black text-sm sm:text-base uppercase tracking-tight text-slate-800">{m.name}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase">Level {m.level || 1} • {m.xp || 0} XP</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setDeductingMember(m)}
                    className="px-3 py-2 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-[10px] font-black uppercase hover:bg-rose-100 active:scale-95 transition-all cursor-pointer min-h-[40px]"
                  >
                    Deduct Points
                  </button>
                </div>

                {/* Granular Visibility Switch Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60">
                  
                  {/* Dashboard Pill */}
                  <button
                    type="button"
                    onClick={() => toggleVisibility.mutate({ memberId: m.id, section: "show_on_dashboard", visible: !isDashVisible })}
                    className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-between gap-1.5 transition-all cursor-pointer min-h-[38px] ${
                      isDashVisible ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-400'
                    }`}
                  >
                    <span className="flex items-center gap-1"><LayoutDashboard size={12} /> Leaderboard</span>
                    {isDashVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>

                  {/* Chores Pill */}
                  <button
                    type="button"
                    onClick={() => toggleVisibility.mutate({ memberId: m.id, section: "show_on_chores", visible: !isChoresVisible })}
                    className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-between gap-1.5 transition-all cursor-pointer min-h-[38px] ${
                      isChoresVisible ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-400'
                    }`}
                  >
                    <span className="flex items-center gap-1"><Trophy size={12} /> Chores</span>
                    {isChoresVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>

                  {/* Rewards Pill */}
                  <button
                    type="button"
                    onClick={() => toggleVisibility.mutate({ memberId: m.id, section: "show_on_rewards", visible: !isRewardsVisible })}
                    className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-between gap-1.5 transition-all cursor-pointer min-h-[38px] ${
                      isRewardsVisible ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-400'
                    }`}
                  >
                    <span className="flex items-center gap-1"><Gift size={12} /> Rewards</span>
                    {isRewardsVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>

                  {/* Kiosk Select Pill */}
                  <button
                    type="button"
                    onClick={() => toggleVisibility.mutate({ memberId: m.id, section: "show_on_kiosk", visible: !isKioskVisible })}
                    className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-between gap-1.5 transition-all cursor-pointer min-h-[38px] ${
                      isKioskVisible ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-400'
                    }`}
                  >
                    <span className="flex items-center gap-1"><Smartphone size={12} /> Kiosk Lock</span>
                    {isKioskVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. DEDUCT POINTS MODAL */}
      {deductingMember && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-900/60 backdrop-blur-md p-4" onClick={() => setDeductingMember(null)}>
          <div className="w-full max-w-md bg-white rounded-3xl sm:rounded-[3rem] p-6 sm:p-8 shadow-2xl border-4 sm:border-8 border-slate-50 animate-in zoom-in-95 duration-200 text-center space-y-4 my-auto" onClick={e => e.stopPropagation()}>
            <div className="size-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto text-rose-500 shadow-inner">
              <Trash2 size={32} />
            </div>
            
            <h3 className="text-xl sm:text-2xl font-black uppercase italic tracking-tight text-slate-900">Deduct Points</h3>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest leading-relaxed">
              Deducting points from <span className="text-slate-900 font-black">{deductingMember.name}</span>
            </p>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const amt = parseInt(deductPointsAmount);
                if (isNaN(amt) || amt <= 0) {
                  toast.error("Please enter a valid points deduction");
                  return;
                }
                deductPoints.mutate({ memberId: deductingMember.id, points: amt });
              }}
              className="space-y-4 pt-2"
            >
              <input
                type="number"
                inputMode="numeric"
                value={deductPointsAmount}
                onChange={(e) => setDeductPointsAmount(e.target.value.replace(/\D/g, ""))}
                placeholder="0"
                required
                className="w-full text-center text-3xl sm:text-4xl font-black p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none min-h-[56px]"
              />

              <button
                type="submit"
                disabled={deductPoints.isPending || !deductPointsAmount}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-600 active:scale-95 transition-all shadow-xl disabled:opacity-20 cursor-pointer min-h-[48px]"
              >
                {deductPoints.isPending ? "DEDUCTING..." : "CONFIRM DEDUCTION"}
              </button>

              <button 
                type="button" 
                onClick={() => setDeductingMember(null)}
                className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-600 transition-colors p-2"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
