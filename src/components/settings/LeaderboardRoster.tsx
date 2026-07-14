import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { listMembers } from "@/lib/hub-api";
import { getMe } from "@/lib/auth-client";
import { Users, Shield, Trash2, X, Check, ShieldCheck } from "lucide-react";

export function LeaderboardRoster() {
  const qc = useQueryClient();

  // --- QUERY STATES (Fully resolved from cached keys) ---
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const members = useQuery({ queryKey: ["members"], queryFn: listMembers });
  
  const users = useQuery({ 
    queryKey: ["known-users"], 
    queryFn: () => fetch('/api/auth/users').then(res => res.json()) 
  });

  // --- LOCAL STATES FOR DEDUCTION MODAL ---
  const [deductingMember, setDeductingMember] = useState<any>(null);
  const [deductPointsAmount, setDeductPointsAmount] = useState("");

  const inv = () => {
    qc.invalidateQueries({ queryKey: ["members"] });
    qc.invalidateQueries({ queryKey: ["known-users"] });
    qc.invalidateQueries({ queryKey: ["points"] }); // Syncs dashboard balances
  };

  // --- MUTATIONS ---
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
    onSuccess: () => {
      toast.success("User Promoted to Admin!");
      inv();
    },
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
    onSuccess: () => {
      toast.success("User Demoted to standard user");
      inv();
    },
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
    onSuccess: () => {
      toast.success("Account deleted successfully");
      inv();
    },
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
    onSuccess: () => {
      toast.success("Account link updated!");
      inv();
    },
    onError: () => toast.error("Failed to link account")
  });

  const toggleLeaderboard = useMutation({
    mutationFn: async ({ memberId, show }: { memberId: string; show: boolean }) => {
      const res = await fetch('/api/auth/toggle-leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, show })
      });
      if (!res.ok) throw new Error("Failed to update visibility");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Roster preference updated!");
      inv();
    },
    onError: (err: any) => toast.error(err.message || "Failed to adjust roster settings")
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
    <div className="space-y-8">
      {/* 1. KNOWN USERS CARD */}
      <section className="rounded-[3rem] border-4 border-slate-50 bg-white p-8 shadow-xl animate-in fade-in duration-300">
        <div className="mb-6 flex items-center gap-3">
          <Users className="size-6 text-indigo-500" />
          <h2 className="font-display text-xl font-black uppercase italic">Known Heroes</h2>
        </div>
        <div className="space-y-4">
          {userList.map((u: any) => {
            const linkedMember = memberList.find((m: any) => m.user_id === u.id);
            const isSelf = u.username === me.data?.username;

            return (
              <div key={u.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl bg-slate-50 p-6 border-2 border-slate-100">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <div className={`px-2 py-1 rounded-lg font-black text-[9px] ${u.role === 'admin' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {u.role === 'admin' ? 'ADMIN' : 'USER'}
                    </div>
                    <p className="font-black text-lg uppercase tracking-tighter text-slate-800">{u.username}</p>
                    {isSelf && <span className="text-[10px] font-bold text-slate-400 italic font-mono">(You)</span>}
                  </div>
                  
                  {/* Account linking selector */}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Associated Hero:</span>
                    <select
                      value={linkedMember?.id || ""}
                      onChange={(e) => {
                        const selectedMemberId = e.target.value || null;
                        linkAccount.mutate({ memberId: selectedMemberId, userId: u.id });
                      }}
                      className="bg-white border-2 border-slate-100 rounded-lg px-2 py-1 text-[10px] font-bold uppercase outline-none focus:border-indigo-500"
                    >
                      <option value="">-- No Hero Linked --</option>
                      {memberList.map((m: any) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Actions */}
                {!isSelf && (
                  <div className="flex items-center gap-2">
                    {u.role === 'admin' ? (
                      totalAdminsCount > 1 ? (
                        <button
                          onClick={() => demote.mutate(u.id)}
                          disabled={demote.isPending}
                          className="px-4 py-2 bg-rose-50 border-2 border-rose-100 text-rose-600 rounded-xl font-black text-[10px] uppercase hover:bg-rose-100 transition-all cursor-pointer"
                        >
                          {demote.isPending ? "Demoting..." : "Demote"}
                        </button>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-400 uppercase italic">(Only Admin)</span>
                      )
                    ) : (
                      <button
                        onClick={() => promote.mutate(u.id)}
                        disabled={promote.isPending}
                        className="px-4 py-2 bg-white border-2 border-slate-100 text-slate-700 rounded-xl font-black text-[10px] uppercase hover:border-indigo-500 transition-all cursor-pointer"
                      >
                        {promote.isPending ? "Promoting..." : "Promote"}
                      </button>
                    )}

                    {/* Delete Account Button */}
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to permanently delete the account "${u.username}"?`)) {
                          deleteAccount.mutate(u.id);
                        }
                      }}
                      disabled={deleteAccount.isPending}
                      className="p-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-xl text-slate-400 transition-all border-2 border-transparent hover:border-rose-100 cursor-pointer animate-in fade-in"
                      title="Delete User Account"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. LEADERBOARD ROSTER CONTROLS */}
      <section className="rounded-[3rem] border-4 border-slate-50 bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <ShieldCheck className="size-6 text-indigo-500" />
          <h2 className="font-display text-xl font-black uppercase italic">Leaderboard Roster</h2>
        </div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Select which family heroes compete on the main Dashboard leaderboard roster</p>
        <div className="space-y-4">
          {memberList.map((m: any) => (
            <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4 border-2 border-slate-100">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-xl flex items-center justify-center text-white text-lg font-black shrink-0 shadow-sm" style={{ backgroundColor: m.avatar_color || '#ccc' }}>
                  {m.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-base uppercase tracking-tight text-slate-800">{m.name}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase">Level {m.level || 1} Adventurer</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 self-end sm:self-auto">
                <button
                  onClick={() => setDeductingMember(m)}
                  className="px-4 py-2 bg-rose-50 border-2 border-rose-100 text-rose-600 rounded-xl text-[10px] font-black uppercase hover:bg-rose-100 transition-all cursor-pointer shadow-sm"
                >
                  Deduct Points
                </button>

                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={m.show_on_leaderboard !== 0}
                    onChange={(e) => toggleLeaderboard.mutate({ memberId: m.id, show: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  <span className="ml-3 text-xs font-black text-slate-500 uppercase tracking-wider min-w-[32px]">
                    {m.show_on_leaderboard !== 0 ? "Show" : "Hide"}
                  </span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. DEDUCT POINTS OVERLAY MODAL */}
      {deductingMember && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-900/60 backdrop-blur-md p-4" onClick={() => setDeductingMember(null)}>
          <div className="w-full max-w-md bg-white rounded-[4rem] p-10 shadow-2xl border-[12px] border-slate-50 animate-in zoom-in-95 duration-200 text-center" onClick={e => e.stopPropagation()}>
            <div className="size-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-rose-500 shadow-inner">
              <Trash2 size={40} />
            </div>
            
            <h3 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 mb-2">Deduct Points</h3>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-6 leading-relaxed">
              Deducting points from <span className="text-slate-900">{deductingMember.name}</span>
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
              className="space-y-6"
            >
              <input
                type="number"
                inputMode="numeric"
                value={deductPointsAmount}
                onChange={(e) => setDeductPointsAmount(e.target.value.replace(/\D/g, ""))}
                placeholder="0"
                required
                className="w-full text-center text-4xl font-black p-6 bg-slate-50 rounded-[2rem] border-4 border-transparent focus:border-indigo-500 outline-none"
              />

              <button
                type="submit"
                disabled={deductPoints.isPending || !deductPointsAmount}
                className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-lg uppercase tracking-widest hover:bg-rose-600 transition-all shadow-xl disabled:opacity-20 cursor-pointer"
              >
                {deductPoints.isPending ? "DEDUCTING..." : "CONFIRM DEDUCTION"}
              </button>

              <button 
                type="button" 
                onClick={() => setDeductingMember(null)}
                className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-600 transition-colors"
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
