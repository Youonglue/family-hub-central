// src/routes/_authenticated/family.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { listMembers, updateMember } from "@/lib/hub-api";
import { UserPlus, X, Check, Shield, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getMe } from "@/lib/auth-client";
import { Avatar, parseAvatarConfig } from "@/components/avatar/Avatar";
import { AvatarCustomizer } from "@/components/avatar/AvatarCustomizer";

export const Route = createFileRoute("/_authenticated/family")({ component: FamilyPage });

function FamilyPage() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const members = useQuery({ queryKey: ["members"], queryFn: () => listMembers() });
  
  const usersQuery = useQuery({ 
    queryKey: ["users"], 
    queryFn: () => fetch('/api/auth/users').then(res => res.json()) 
  });

  const [showAdd, setShowAdd] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [showCustomizer, setShowCustomizer] = useState(false);

  const isAdmin = me.data?.role?.toLowerCase() === "admin";

  const addHero = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/members', { 
          method: 'POST', 
          headers: {'Content-Type':'application/json'}, 
          body: JSON.stringify(data) 
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Recruitment failed");
      }
      return res.json();
    },
    onSuccess: () => { 
        toast.success("Hero Recruited! ⭐"); 
        qc.invalidateQueries({ queryKey: ["members"] }); 
        qc.invalidateQueries({ queryKey: ["users"] });
        qc.invalidateQueries({ queryKey: ["points"] });
        setShowAdd(false); 
    },
    onError: (err: any) => {
        toast.error(err.message || "Failed to recruit hero");
    }
  });

  const saveHero = useMutation({
    mutationFn: (data: any) => updateMember({ data }),
    onSuccess: () => {
      toast.success("Hero Profile Updated!");
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["points"] });
      setEdit(null);
    }
  });

  const saveAvatar = useMutation({
    mutationFn: (config: any) => fetch(`/api/members/${edit.id}/avatar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatar_config: JSON.stringify(config) })
    }).then(res => res.json()),
    onSuccess: () => {
      toast.success("Appearance Locked Offline! ✨");
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["points"] });
    },
    onError: () => {
      toast.error("Failed to sync appearance changes.");
    }
  });

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

  if (me.isLoading || members.isLoading) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[75vh] p-6 text-center">
          <Loader2 className="size-10 text-indigo-500 animate-spin mb-4" />
          <p className="font-black text-slate-400 uppercase tracking-widest text-[10px]">
            Synchronizing Heroes...
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-3 py-4 sm:px-6 sm:py-6 md:p-8 max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300">
        
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-100">
          <div>
            <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.2em] text-indigo-500 font-black">
              Fortress Roster
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-black uppercase italic tracking-tighter text-slate-900">
              Family Heroes
            </h1>
          </div>
          
          <button 
            onClick={() => setShowAdd(true)} 
            className="bg-slate-900 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-md hover:bg-indigo-600 transition-all self-start sm:self-auto active:scale-95 cursor-pointer min-h-[44px]"
          >
            <UserPlus size={16} /> Recruit Hero
          </button>
        </header>

        {memberList.length === 0 ? (
          <div className="bg-white border-4 sm:border-8 border-dashed border-slate-100 rounded-3xl sm:rounded-[3rem] p-8 sm:p-16 text-center">
            <h2 className="text-xl sm:text-2xl font-black uppercase italic mb-3">No Heroes Found</h2>
            <button 
              onClick={() => setShowAdd(true)} 
              className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase shadow-lg hover:scale-105 transition-all active:scale-95 cursor-pointer min-h-[44px]"
            >
              Create First Hero
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
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
                  className="bg-white p-4 sm:p-7 rounded-3xl sm:rounded-[2.5rem] border-2 sm:border-4 border-slate-50 shadow-md hover:shadow-xl flex flex-col items-center gap-2.5 sm:gap-4 cursor-pointer hover:scale-105 transition-all text-center focus:outline-none active:scale-95"
                >
                  <Avatar 
                    config={avatarConfig} 
                    className="size-24 sm:size-28 md:size-32 rounded-2xl sm:rounded-[2rem] border-2 border-white shadow-md" 
                  />
                  <div>
                    <p className="text-lg sm:text-2xl font-black uppercase italic text-slate-800 leading-tight mb-1 truncate max-w-full">
                      {m.name}
                    </p>
                    <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Level {m.level || 1} Adventurer {mIsAdmin && '🛡️'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* --- HERO PROFILE MODAL --- */}
        {edit && (() => {
          const associatedUser = userList.find(
            (u: any) => u.id === edit.user_id || u.username?.toLowerCase() === edit.name?.toLowerCase()
          );
          const isTargetAdmin = associatedUser?.role?.toLowerCase() === "admin";
          const isSelf = associatedUser?.id === me.data?.id;
          const editAvatarConfig = parseAvatarConfig(edit.avatar_config);

          return (
            <div 
              className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto" 
              onClick={() => setEdit(null)}
            >
              {showCustomizer ? (
                <div className="w-full max-w-3xl animate-in zoom-in-95 duration-200 my-auto" onClick={e => e.stopPropagation()}>
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
                <div 
                  className="bg-white w-full max-w-xl rounded-3xl sm:rounded-[3.5rem] border-4 sm:border-8 border-slate-50 p-5 sm:p-8 shadow-2xl animate-in zoom-in-95 max-h-[92vh] overflow-y-auto my-auto scrollbar-none" 
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center mb-4 sm:mb-6">
                    <h2 className="text-xl sm:text-2xl font-black uppercase italic tracking-tight text-slate-900">Hero Profile</h2>
                    <button 
                      onClick={() => setEdit(null)} 
                      className="p-2 bg-slate-100 rounded-full hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-5 sm:space-y-6">
                    {/* Customizable Avatar Preview */}
                    <div className="flex flex-col items-center justify-center bg-slate-50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100">
                      <Avatar 
                        config={editAvatarConfig} 
                        className="size-28 sm:size-36 rounded-2xl sm:rounded-[2rem] shadow-xl border-4 border-white" 
                      />
                      <button 
                        type="button"
                        onClick={() => setShowCustomizer(true)}
                        className="mt-3.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer min-h-[44px]"
                      >
                        <Sparkles size={14} /> Customize Appearance & Backdrops
                      </button>
                    </div>

                    {/* NAME FIELD */}
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-3 block mb-1">
                        Hero Name {isAdmin ? "(Admin Editing)" : "(Locked)"}
                      </label>
                      <input 
                        value={edit.name} 
                        disabled={!isAdmin} 
                        onChange={(e) => setEdit({...edit, name: e.target.value})}
                        className={`w-full p-3.5 rounded-xl sm:rounded-2xl font-black text-base sm:text-lg border-2 transition-all min-h-[48px] ${
                          isAdmin 
                            ? 'bg-white border-indigo-500 text-slate-900 shadow-inner' 
                            : 'bg-slate-100 border-transparent text-slate-400 cursor-not-allowed'
                        }`} 
                      />
                      {!isAdmin && <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 ml-3">Ask a Parent to change your name</p>}
                    </div>

                    {/* LINKED ACCOUNT */}
                    <div className="border-t border-slate-100 pt-4">
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-3 block mb-1">
                        Linked Login Account {!isAdmin && "(Admin Only)"}
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
                              toast.success("Account link updated!");
                              qc.invalidateQueries({ queryKey: ["members"] });
                              qc.invalidateQueries({ queryKey: ["users"] });
                            } else {
                              toast.error("Failed to link account");
                            }
                          } catch {
                            toast.error("Network error linking account");
                          }
                        }}
                        className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl sm:rounded-2xl font-black text-xs uppercase outline-none focus:border-indigo-500 disabled:opacity-50 min-h-[48px]"
                      >
                        <option value="">-- No Account Linked --</option>
                        {userList.map((u: any) => (
                          <option key={u.id} value={u.id}>
                            {u.username} ({u.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* ADMIN PRIVILEGE TOGGLES */}
                    {isAdmin && associatedUser && !isSelf && (
                      <div className="border-t border-slate-100 pt-4">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-3 block mb-1.5">
                          Admin Security Controls
                        </label>
                        {isTargetAdmin ? (
                          totalAdminsCount > 1 ? (
                            <button
                              type="button"
                              onClick={() => demoteHero.mutate(edit.id)}
                              disabled={demoteHero.isPending}
                              className="w-full py-3 bg-rose-50 text-rose-600 rounded-xl font-black text-xs uppercase shadow-sm hover:bg-rose-100 transition-all flex items-center justify-center gap-2 border border-rose-200 cursor-pointer active:scale-95 min-h-[44px]"
                            >
                              <Shield size={14} /> {demoteHero.isPending ? "Demoting..." : "DEMOTE FROM ADMIN"}
                            </button>
                          ) : (
                            <p className="text-[9px] font-bold text-slate-400 uppercase italic text-center p-2 bg-slate-50 rounded-xl">
                              Sole Admin (Demotion Locked)
                            </p>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => promoteHero.mutate(edit.id)}
                            disabled={promoteHero.isPending}
                            className="w-full py-3 bg-indigo-50 text-indigo-600 rounded-xl font-black text-xs uppercase shadow-sm hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 border border-indigo-200 cursor-pointer active:scale-95 min-h-[44px]"
                          >
                            <Shield size={14} /> {promoteHero.isPending ? "Promoting..." : "PROMOTE TO ADMIN"}
                          </button>
                        )}
                      </div>
                    )}

                    <button 
                      onClick={() => saveHero.mutate(edit)}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 min-h-[48px]"
                    >
                      <Check size={18} /> SAVE PROFILE CHANGES
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* RECRUIT HERO MODAL */}
        {showAdd && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
            <form 
              className="bg-white p-6 sm:p-8 rounded-3xl sm:rounded-[3rem] w-full max-w-md shadow-2xl border-4 border-slate-50 space-y-4 my-auto" 
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                addHero.mutate({ name: fd.get('name'), is_kid: fd.get('type') === 'kid' });
              }}
            >
              <h2 className="text-2xl font-black uppercase italic tracking-tight">Recruit Hero</h2>
              <input 
                name="name" 
                placeholder="Hero Name" 
                className="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none border-2 border-transparent focus:border-indigo-500 text-base min-h-[48px]" 
                required 
              />
              <select 
                name="type" 
                className="w-full p-4 bg-slate-50 rounded-2xl font-black uppercase text-xs min-h-[48px]"
              >
                <option value="kid">Kid (Adventurer)</option>
                <option value="parent">Adult (Master)</option>
              </select>
              
              <button 
                type="submit" 
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl hover:bg-indigo-600 transition-colors cursor-pointer active:scale-95 min-h-[48px]"
              >
                Complete Recruitment
              </button>
              <button 
                type="button" 
                onClick={() => setShowAdd(false)} 
                className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer p-2"
              >
                Cancel
              </button>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}
