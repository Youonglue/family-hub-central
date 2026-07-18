import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { listMembers, updateMember } from "@/lib/hub-api";
import { UserPlus, X, Check, Shield, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getMe } from "@/lib/auth-client";

// Offline Avatar Renderer & Customizer Imports
import { Avatar, parseAvatarConfig } from "@/components/avatar/Avatar";
import { AvatarCustomizer } from "@/components/avatar/AvatarCustomizer";

export const Route = createFileRoute("/_authenticated/family")({ component: FamilyPage });

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
  const [showCustomizer, setShowCustomizer] = useState(false);

  // Admin Detection for UI Unlocking
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
        qc.invalidateQueries({ queryKey: ["points"] });
        setShowAdd(false); 
    }
  });

  // Update Profile Mutation
  const saveHero = useMutation({
    mutationFn: (data: any) => updateMember({ data }),
    onSuccess: () => {
      toast.success("Hero Profile Updated!");
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["points"] });
      setEdit(null);
    }
  });

  // Offline Customizer Save Mutation (Saves instantly to SQLite)
  const saveAvatar = useMutation({
    mutationFn: (config: any) => fetch(`/api/members/${edit.id}/avatar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatar_config: JSON.stringify(config) })
    }).then(res => res.json()),
    onSuccess: () => {
      toast.success("Appearance Locked Offline!");
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["points"] });
    },
    onError: () => {
      toast.error("Failed to sync appearance changes.");
    }
  });

  // Demote Mutation with Fail-safe handling
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

  // Promote Mutation
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

  const totalAdminsCount = userList.filter(
    (u: any) => u.role?.toLowerCase() === "admin"
  ).length;

  return (
    <AppShell>
      <div className="px-4 py-6 md:p-8 max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.2em] text-indigo-500 font-black">Fortress Roster</p>
            <h1 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter text-slate-900">Family Heroes</h1>
          </div>
          <button onClick={() => setShowAdd(true)} className="bg-slate-900 text-white px-5 py-3.5 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-xl hover:bg-indigo-600 transition-all self-start sm:self-auto active:scale-95 cursor-pointer">
            <UserPlus size={16} /> Recruit Hero
          </button>
        </header>

        {memberList.length === 0 ? (
            <div className="bg-white border-4 sm:border-8 border-dashed border-slate-100 rounded-[2.5rem] sm:rounded-[4rem] p-10 sm:p-20 text-center">
                <h2 className="text-xl sm:text-2xl font-black uppercase italic mb-4">No Heroes Found</h2>
                <button onClick={() => setShowAdd(true)} className="bg-indigo-600 text-white px-10 py-5 rounded-3xl font-black uppercase shadow-lg hover:scale-105 transition-all active:scale-95 cursor-pointer">
                    Create First Hero
                </button>
            </div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                {memberList.map((m: any) => {
                    const associatedUser = userList.find(
                      (u: any) => u.id === m.user_id || u.username?.toLowerCase() === m.name?.toLowerCase()
                    );
                    const mIsAdmin = associatedUser?.role?.toLowerCase() === "admin";
                    const avatarConfig = parseAvatarConfig(m.avatar_config);

                    return (
                        <button 
                          key={m.id} 
                          onClick={() => setEdit(m)} 
                          className="bg-white p-5 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border-4 border-slate-50 shadow-xl flex flex-col items-center gap-3 sm:gap-4 cursor-pointer hover:scale-105 transition-all text-center focus:outline-none active:scale-95 animate-in zoom-in-95 duration-200"
                        >
                            <Avatar 
                              config={avatarConfig} 
                              className="size-20 sm:size-24 rounded-[1.5rem] sm:rounded-[2rem] border-2 border-white shadow-md" 
                            />
                            <div>
                              <p className="text-xl sm:text-2xl font-black uppercase italic text-slate-800 leading-none mb-1.5">{m.name}</p>
                              <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                Level {m.level || 1} Adventurer {mIsAdmin && '🛡y'}
                              </p>
                            </div>
                        </button>
                    );
                })}
            </div>
        )}

        {/* --- HERO PROFILE MODAL (Mobile-Optimized Padding & Borders) --- */}
        {edit && (() => {
          const associatedUser = userList.find(
            (u: any) => u.id === edit.user_id || u.username?.toLowerCase() === edit.name?.toLowerCase()
          );
          const isTargetAdmin = associatedUser?.role?.toLowerCase() === "admin";
          const isSelf = associatedUser?.id === me.data?.id;
          const editAvatarConfig = parseAvatarConfig(edit.avatar_config);

          return (
            <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" onClick={() => setEdit(null)}>
              
              {/* Conditional Nested Customizer view overlay */}
              {showCustomizer ? (
                <div className="w-full max-w-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                  <AvatarCustomizer
                    initialConfig={editAvatarConfig}
                    onClose={() => setShowCustomizer(false)}
                    onSave={(newConfig) => {
                      saveAvatar.mutate(newConfig);
                      setEdit({ ...edit, avatar_config: JSON.stringify(newConfig) });
                      setShowCustomizer(false);
                    }}
                  />
                </div>
              ) : (
                <div className="bg-white w-full max-w-xl rounded-[2.5rem] sm:rounded-[4rem] border-4 sm:border-[12px] border-slate-50 p-5 sm:p-10 shadow-2xl animate-in zoom-in-95 max-h-[92vh] overflow-y-auto scrollbar-none" onClick={e => e.stopPropagation()}>
                  
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tight text-slate-900">Hero Profile</h2>
                    <button onClick={() => setEdit(null)} className="p-2 sm:p-3 bg-slate-100 rounded-full hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"><X size={18} /></button>
                  </div>

                  <div className="space-y-6 sm:space-y-8">
                    
                    {/* customizable Vector Avatar Display & Launch Action */}
                    <div className="flex flex-col items-center justify-center bg-slate-50 p-5 rounded-[2rem] border-2 border-slate-100 relative group">
                      <Avatar 
                        config={editAvatarConfig} 
                        className="size-28 sm:size-32 rounded-[1.5rem] sm:rounded-[2rem] shadow-xl border-4 border-white" 
                      />
                      <button 
                        type="button"
                        onClick={() => setShowCustomizer(true)}
                        className="mt-4 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        <Sparkles size={12} /> Customize Appearance
                      </button>
                    </div>

                    {/* NAME FIELD */}
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">
                        Hero Name {isAdmin ? "(Admin Editing Enabled)" : "(Locked)"}
                      </label>
                      <input 
                        value={edit.name} 
                        disabled={!isAdmin} 
                        onChange={(e) => setEdit({...edit, name: e.target.value})}
                        className={`w-full p-4 mt-1 rounded-xl sm:rounded-2xl font-black text-lg border-4 transition-all ${
                          isAdmin 
                            ? 'bg-white border-indigo-500 text-slate-900 shadow-inner' 
                            : 'bg-slate-100 border-transparent text-slate-400 cursor-not-allowed'
                        }`} 
                      />
                      {!isAdmin && <p className="text-[9px] font-bold text-slate-300 uppercase mt-2 ml-4">Ask a Parent to change your name</p>}
                    </div>

                    {/* --- LINK LOGIN ACCOUNT SETTING (Always visible, editable for Admins) --- */}
                    <div className="border-t border-slate-100 pt-5">
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
                      <div className="border-t border-slate-100 pt-5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4 block mb-2">
                          Admin Security Controls
                        </label>
                        {isTargetAdmin ? (
                          totalAdminsCount > 1 ? (
                            <button
                              type="button"
                              onClick={() => demoteHero.mutate(edit.id)}
                              disabled={demoteHero.isPending}
                              className="w-full py-3.5 bg-rose-50 text-rose-600 rounded-2xl font-black text-sm uppercase shadow-sm hover:bg-rose-100 transition-all flex items-center justify-center gap-2 border-2 border-rose-200 cursor-pointer active:scale-95"
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
                            className="w-full py-3.5 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-sm uppercase shadow-sm hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 border-2 border-indigo-200 cursor-pointer active:scale-95"
                          >
                            <Shield size={16} /> {promoteHero.isPending ? "Promoting..." : "PROMOTE TO ADMIN"}
                          </button>
                        )}
                      </div>
                    )}

                    <button 
                        onClick={() => saveHero.mutate(edit)}
                        className="w-full py-4 sm:py-5 bg-slate-900 text-white rounded-[2rem] font-black text-lg sm:text-xl shadow-2xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                        <Check size={20} /> SAVE CHANGES
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* RECRUIT MODAL */}
        {showAdd && (
            <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
                <form className="bg-white p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] w-full max-w-md shadow-2xl" onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    addHero.mutate({ name: fd.get('name'), is_kid: fd.get('type') === 'kid' });
                }}>
                    <h2 className="text-2xl sm:text-3xl font-black uppercase italic mb-6 text-slate-900">Recruit Hero</h2>
                    <input name="name" placeholder="Hero Name" className="w-full p-4 sm:p-5 bg-slate-50 rounded-2xl mb-4 font-black outline-none border-4 border-transparent focus:border-indigo-500 text-lg" required />
                    <select name="type" className="w-full p-4 sm:p-5 bg-slate-50 rounded-2xl mb-6 font-black uppercase text-sm">
                        <option value="kid">Kid (Adventurer)</option>
                        <option value="parent">Adult (Master)</option>
                    </select>
                    <button type="submit" className="w-full py-4 sm:py-5 bg-slate-900 text-white rounded-2xl font-black uppercase shadow-xl hover:bg-indigo-600 transition-colors cursor-pointer active:scale-95">Complete Recruitment</button>
                    <button type="button" onClick={() => setShowAdd(false)} className="w-full mt-4 text-[10px] font-black text-slate-300 uppercase cursor-pointer">Cancel</button>
                </form>
            </div>
        )}
      </div>
    </AppShell>
  );
}
