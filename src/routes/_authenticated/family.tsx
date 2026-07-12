import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { listMembers, updateMember } from "@/lib/hub-api";
import { UserPlus, Ghost, Cat, Dog, Rabbit, User, Palette, X, Check, Trash2, Shield, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getMe } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated/family")({ component: FamilyPage });

const ICONS: Record<string, any> = { Ghost, Cat, Dog, Rabbit, Shield };
const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4"];

function FamilyPage() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const members = useQuery({ queryKey: ["members"], queryFn: () => listMembers() });
  
  // New query: Fetch the list of system users from `/api/auth/users` to get true admin status
  const usersQuery = useQuery({ 
    queryKey: ["users"], 
    queryFn: () => fetch('/api/auth/users').then(res => res.json()) 
  });

  const [showAdd, setShowAdd] = useState(false);
  const [edit, setEdit] = useState<any>(null);

  // MUSCLE: Admin Detection for UI Unlocking
  const isAdmin = me.data?.role?.toLowerCase() === "admin";

  const addHero = useMutation({
    mutationFn: (data: any) => fetch('/api/members', { 
        method: 'POST', 
        headers: {'Content-Type':'application/json'}, 
        body: JSON.stringify(data) 
    }),
    onSuccess: () => { 
        toast.success("Hero Recruited!"); 
        qc.invalidateQueries({ queryKey: ["members"] }); 
        qc.invalidateQueries({ queryKey: ["users"] });
        setShowAdd(false); 
    }
  });

  // MUSCLE: Update Mutation
  const saveHero = useMutation({
    mutationFn: (data: any) => updateMember({ data }),
    onSuccess: () => {
      toast.success("Hero Profile Updated!");
      qc.invalidateQueries({ queryKey: ["members"] });
      setEdit(null);
    }
  });

  // MUSCLE: Demote Mutation with Fail-safe handling
  const demoteHero = useMutation({
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
      toast.success("Hero Demoted to standard user");
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["users"] });
      setEdit(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to demote");
    }
  });

  // MUSCLE: Promote Mutation
  const promoteHero = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch('/api/auth/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (!res.ok) {
        throw new Error("Promotion failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Hero Promoted to Admin!");
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["users"] });
      setEdit(null);
    },
    onError: () => {
      toast.error("Failed to promote user");
    }
  });

  const memberList = Array.isArray(members.data) ? members.data : [];
  const userList = Array.isArray(usersQuery.data) ? usersQuery.data : [];

  // Count registered administrators based on the true users database table
  const totalAdminsCount = userList.filter(
    (u: any) => u.role?.toLowerCase() === "admin"
  ).length;

  return (
    <AppShell>
      <div className="p-8 max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900">Family Heroes</h1>
          <button onClick={() => setShowAdd(true)} className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-xl hover:bg-indigo-600 transition-all">
            <UserPlus size={18} /> Recruit Hero
          </button>
        </header>

        {memberList.length === 0 ? (
            <div className="bg-white border-8 border-dashed border-slate-100 rounded-[4rem] p-20 text-center">
                <div className="size-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-500 mb-6">
                   
                </div>
                <h2 className="text-2xl font-black uppercase italic mb-4">No Heroes Found</h2>
                <button onClick={() => setShowAdd(true)} className="bg-indigo-600 text-white px-10 py-5 rounded-3xl font-black uppercase shadow-lg hover:scale-105 transition-all">
                    Create First Hero
                </button>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {memberList.map((m: any) => {
                    const HeroIcon = ICONS[m.avatar_icon] || User;
                    
                    // Correlate member with their user account to fetch admin status
                    const associatedUser = userList.find(
                      (u: any) => u.id === m.user_id || u.username?.toLowerCase() === m.name?.toLowerCase()
                    );
                    const mIsAdmin = associatedUser?.role?.toLowerCase() === "admin";

                    return (
                        <div key={m.id} onClick={() => setEdit(m)} className="bg-white p-8 rounded-[3rem] border-4 border-slate-50 shadow-xl flex flex-col items-center gap-4 cursor-pointer hover:scale-105 transition-all">
                            <div className="size-24 rounded-[2rem] flex items-center justify-center text-white" style={{ backgroundColor: m.avatar_color || '#ccc' }}>
                                <HeroIcon size={48} />
                            </div>
                            <p className="text-2xl font-black uppercase italic text-slate-800">{m.name}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase">
                              Level {m.level || 1} Adventurer {mIsAdmin && '🛡️'}
                            </p>
                        </div>
                    );
                })}
            </div>
        )}

        {/* --- HERO PROFILE MODAL --- */}
        {edit && (() => {
          // Identify if the currently edited member matches a user account
          const associatedUser = userList.find(
            (u: any) => u.id === edit.user_id || u.username?.toLowerCase() === edit.name?.toLowerCase()
          );
          const isTargetAdmin = associatedUser?.role?.toLowerCase() === "admin";
          const isSelf = associatedUser?.id === me.data?.id;

          return (
            <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setEdit(null)}>
              <div className="bg-white w-full max-w-xl rounded-[4rem] border-[12px] border-slate-50 p-10 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-black uppercase italic">Hero Profile</h2>
                  <button onClick={() => setEdit(null)} className="p-3 bg-slate-100 rounded-full hover:bg-rose-50"><X /></button>
                </div>

                <div className="space-y-8">
                  {/* NAME FIELD */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">
                      Hero Name {isAdmin ? "(Admin Editing Enabled)" : "(Locked)"}
                    </label>
                    <input 
                      value={edit.name} 
                      disabled={!isAdmin} 
                      onChange={(e) => setEdit({...edit, name: e.target.value})}
                      className={`w-full p-5 mt-1 rounded-2xl font-black text-xl border-4 transition-all ${
                        isAdmin 
                          ? 'bg-white border-indigo-500 text-slate-900 shadow-inner' 
                          : 'bg-slate-100 border-transparent text-slate-400 cursor-not-allowed'
                      }`} 
                    />
                    {!isAdmin && <p className="text-[9px] font-bold text-slate-300 uppercase mt-2 ml-4">Ask a Parent to change your name</p>}
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Select Class Icon</label>
                    <div className="flex flex-wrap gap-3 mt-2">
                      {Object.keys(ICONS).map(iconName => {
                        const Icon = ICONS[iconName];
                        return (
                          <button 
                            key={iconName}
                            onClick={() => setEdit({...edit, avatar_icon: iconName})}
                            className={`size-14 rounded-2xl flex items-center justify-center transition-all ${edit.avatar_icon === iconName ? 'bg-slate-900 text-white scale-110 shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                          >
                            <Icon size={24} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4 flex items-center gap-2"><Palette size={14}/> Aura Color</label>
                    <div className="flex flex-wrap gap-3 mt-2">
                      {COLORS.map(c => (
                        <button 
                          key={c} 
                          onClick={() => setEdit({...edit, avatar_color: c})}
                          className={`size-10 rounded-full transition-all ${edit.avatar_color === c ? 'ring-4 ring-slate-900 scale-110 shadow-lg' : 'hover:scale-105'}`} 
                          style={{ backgroundColor: c }} 
                        />
                      ))}
                    </div>
                  </div>

                  {/* --- LINK LOGIN ACCOUNT SETTING (Always visible, editable for Admins) --- */}
                  <div className="border-t border-slate-100 pt-6 mt-6">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4 block mb-2">
                      Linked Login Account {!isAdmin && "(Admin Privilege Required)"}
                    </label>
                    <select
                      value={edit.user_id || ""}
                      disabled={!isAdmin}
                      onChange={async (e) => {
                        const val = e.target.value || null;
                        setEdit({ ...edit, user_id: val });
                        try {
                          const res = await fetch('/api/auth/link-member', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ memberId: edit.id, userId: val })
                          });
                          if (res.ok) {
                            toast.success("Account link synchronized!");
                            qc.invalidateQueries({ queryKey: ["members"] });
                            qc.invalidateQueries({ queryKey: ["users"] });
                          } else {
                            toast.error("Failed to link account");
                          }
                        } catch {
                          toast.error("Network error linking account");
                        }
                      }}
                      className="w-full p-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-black text-sm uppercase outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">-- No Account Linked --</option>
                      {userList.map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.username} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* --- PROMOTIONAL / DEMOTIONAL PANEL (True database integration) --- */}
                  {isAdmin && associatedUser && !isSelf && (
                    <div className="border-t border-slate-100 pt-6 mt-6">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4 block mb-2">
                        Admin Security Controls
                      </label>
                      {isTargetAdmin ? (
                        totalAdminsCount > 1 ? (
                          <button
                            type="button"
                            onClick={() => demoteHero.mutate(edit.id)}
                            disabled={demoteHero.isPending}
                            className="w-full py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-sm uppercase shadow-sm hover:bg-rose-100 transition-all flex items-center justify-center gap-2 border-2 border-rose-200"
                          >
                            <Shield size={16} /> {demoteHero.isPending ? "Demoting..." : "DEMOTE FROM ADMIN"}
                          </button>
                        ) : (
                          <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase italic">
                              Demotion locked (Only Admin Active)
                            </p>
                          </div>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() => promoteHero.mutate(edit.id)}
                          disabled={promoteHero.isPending}
                          className="w-full py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-sm uppercase shadow-sm hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 border-2 border-indigo-200"
                        >
                          <Shield size={16} /> {promoteHero.isPending ? "Promoting..." : "PROMOTE TO ADMIN"}
                        </button>
                      )}
                    </div>
                  )}

                  <button 
                      onClick={() => saveHero.mutate(edit)}
                      className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3"
                  >
                      <Check size={28} /> SAVE CHANGES
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* RECRUIT MODAL */}
        {showAdd && (
            <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
                <form className="bg-white p-10 rounded-[3rem] w-full max-w-md shadow-2xl" onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    addHero.mutate({ name: fd.get('name'), is_kid: fd.get('type') === 'kid' });
                }}>
                    <h2 className="text-3xl font-black uppercase italic mb-6">Recruit Hero</h2>
                    <input name="name" placeholder="Hero Name" className="w-full p-5 bg-slate-50 rounded-2xl mb-4 font-black outline-none border-4 border-transparent focus:border-indigo-500" required />
                    <select name="type" className="w-full p-5 bg-slate-50 rounded-2xl mb-6 font-black uppercase">
                        <option value="kid">Kid (Adventurer)</option>
                        <option value="parent">Adult (Master)</option>
                    </select>
                    <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase shadow-xl">Complete Recruitment</button>
                    <button type="button" onClick={() => setShowAdd(false)} className="w-full mt-4 text-[10px] font-black text-slate-300 uppercase">Cancel</button>
                </form>
            </div>
        )}
      </div>
    </AppShell>
  );
}
