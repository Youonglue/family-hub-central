// src/components/rewards/RewardAdminCatalog.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck, Gift, Plus, Trash2, Users, Edit3, X, Save, Check } from "lucide-react";
import { listMembers } from "@/lib/hub-api";

interface RewardAdminCatalogProps {
  activeMember: any;
  onBack: () => void;
  isAdminView: boolean;
  setIsAdminView: (show: boolean) => void;
}

const REWARD_CATEGORIES = [
  "All",
  "Little Rewards",
  "Medium Rewards",
  "Big Rewards",
  "Shared"
] as const;

export function RewardAdminCatalog({
  activeMember,
  onBack,
  isAdminView,
  setIsAdminView
}: RewardAdminCatalogProps) {
  const qc = useQueryClient();

  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>("All");

  // New Reward Creator State
  const [newReward, setNewReward] = useState<{
    title: string;
    points: number | string;
    category: string;
    member_ids: string[];
    is_shared: boolean;
  }>({ 
    title: "", 
    points: 50,
    category: "Little Rewards",
    member_ids: [], // Empty array = Template / Unassigned
    is_shared: false
  });

  // Editing Existing Reward State
  const [editingReward, setEditingReward] = useState<any | null>(null);

  const members = useQuery({ queryKey: ["members"], queryFn: listMembers });
  const memberList = Array.isArray(members.data) ? members.data.filter((m: any) => m.is_kid !== 0) : [];

  const rewards = useQuery({ 
    queryKey: ["rewards"], 
    queryFn: () => fetch('/api/rewards').then(res => res.json()) 
  });

  const inv = () => {
    qc.invalidateQueries({ queryKey: ["rewards"] });
    qc.invalidateQueries({ queryKey: ["points"] });
  };

  const addReward = useMutation({
    mutationFn: (data: any) => 
      fetch('/api/rewards', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          points: Number(data.points) || 50
        })
      }).then(res => res.json()),
    onSuccess: () => {
      toast.success("Reward Added to Shop Catalog!");
      setNewReward({ title: "", points: 50, category: "Little Rewards", member_ids: [], is_shared: false });
      inv();
    }
  });

  // EDIT / RE-ASSIGN REWARD MUTATION
  const updateReward = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      fetch(`/api/rewards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          points: Number(data.points) || 50
        })
      }).then(res => res.json()),
    onSuccess: () => {
      toast.success("Reward updated & re-assigned successfully! 🎁");
      setEditingReward(null);
      inv();
    }
  });

  const deleteReward = useMutation({
    mutationFn: (id: string) => 
      fetch(`/api/rewards/${id}`, { method: "DELETE" }).then(res => res.json()),
    onSuccess: () => {
      toast.success("Reward Removed from Catalog");
      inv();
    }
  });

  const rewardList = Array.isArray(rewards.data) ? rewards.data : [];

  // Multi-Hero Toggle for Creator
  const toggleNewRewardHero = (heroId: string) => {
    setNewReward(prev => {
      const exists = prev.member_ids.includes(heroId);
      return {
        ...prev,
        is_shared: false,
        member_ids: exists 
          ? prev.member_ids.filter(id => id !== heroId) 
          : [...prev.member_ids, heroId]
      };
    });
  };

  // Multi-Hero Toggle for Editor
  const toggleEditRewardHero = (heroId: string) => {
    setEditingReward((prev: any) => {
      const current: string[] = prev.member_ids || [];
      const exists = current.includes(heroId);
      return {
        ...prev,
        is_shared: 0,
        member_ids: exists 
          ? current.filter(id => id !== heroId) 
          : [...current, heroId]
      };
    });
  };

  // Filtered List by Category Tab
  const filteredRewardList = useMemo(() => {
    if (selectedCategoryTab === "All") return rewardList;
    if (selectedCategoryTab === "Shared") return rewardList.filter((r: any) => r.is_shared === 1);
    return rewardList.filter((r: any) => (r.category || "").toLowerCase() === selectedCategoryTab.toLowerCase());
  }, [rewardList, selectedCategoryTab]);

  const getCategoryCount = (tab: string) => {
    if (tab === "All") return rewardList.length;
    if (tab === "Shared") return rewardList.filter((r: any) => r.is_shared === 1).length;
    return rewardList.filter((r: any) => (r.category || "").toLowerCase() === tab.toLowerCase()).length;
  };

  const getAssignedHeroNames = (reward: any) => {
    const names: string[] = [];
    if (reward.member_ids) {
      try {
        const ids: string[] = JSON.parse(reward.member_ids);
        ids.forEach(id => {
          const match = memberList.find((m: any) => m.id === id);
          if (match) names.push(match.name);
        });
      } catch (e) {}
    }
    if (names.length === 0 && reward.assigned_member_name) {
      names.push(reward.assigned_member_name);
    }
    return names;
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in zoom-in-95 duration-200 safe-area-inset-bottom">
      
      {/* TOP HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-sm border-2 sm:border-4 border-slate-50">
        <button 
          onClick={onBack} 
          className="flex items-center justify-center sm:justify-start gap-2 font-black text-slate-400 hover:text-slate-900 transition-colors uppercase text-xs tracking-widest py-2 cursor-pointer min-h-[44px]"
        >
          <ArrowLeft size={16} /> {activeMember ? "Exit Admin" : "Character Select"}
        </button>
        
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <p className="font-black uppercase italic text-slate-800 tracking-tight text-sm sm:text-base truncate max-w-[180px] sm:max-w-xs">
            {activeMember ? activeMember.name : "System Admin"}
          </p>
          <button 
            onClick={() => setIsAdminView(false)} 
            className="px-4 py-2.5 sm:px-6 sm:py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all w-full sm:w-auto cursor-pointer bg-slate-900 text-white min-h-[44px] active:scale-95 shrink-0"
          >
            <ShieldCheck size={18} /> Exit Customization
          </button>
        </div>
      </div>

      {/* REWARD CUSTOMIZATION CATALOG BOARD */}
      <section className="bg-slate-900 text-white p-4 sm:p-6 md:p-8 rounded-3xl sm:rounded-[3rem] shadow-xl space-y-6">
        <h2 className="text-lg sm:text-2xl md:text-3xl font-black uppercase italic tracking-tight flex items-center gap-2.5 sm:gap-3">
          <Gift className="text-indigo-400 size-6 sm:size-8 shrink-0" /> Reward Catalog & Customization
        </h2>
        
        {/* Creator Form with Multi-Hero Assignment */}
        <form 
          onSubmit={(e) => { 
            e.preventDefault(); 
            addReward.mutate(newReward); 
          }} 
          className="space-y-4 bg-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-white/10"
        >
          {/* Target Hero Selector Pills */}
          <div>
            <div className="flex justify-between items-center mb-1.5 flex-wrap gap-1">
              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                Make Reward Available To:
              </label>
              <span className="text-[8px] font-bold text-slate-400 uppercase">
                {newReward.is_shared 
                  ? "👥 Family Shared (Visible to Everyone)" 
                  : newReward.member_ids.length === 0 
                  ? "📁 Template Pool (Unassigned)" 
                  : `${newReward.member_ids.length} Hero(es) Selected`}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setNewReward({ ...newReward, member_ids: [], is_shared: false })}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                  !newReward.is_shared && newReward.member_ids.length === 0 
                    ? "bg-indigo-600 text-white shadow-md scale-105" 
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                <Users size={13} /> 📁 Template Pool
              </button>

              <button
                type="button"
                onClick={() => setNewReward({ ...newReward, member_ids: [], is_shared: true })}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                  newReward.is_shared 
                    ? "bg-emerald-600 text-white shadow-md scale-105" 
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                👥 Shared / Co-Op
              </button>

              {memberList.map((m: any) => {
                const isSelected = newReward.member_ids.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleNewRewardHero(m.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                      isSelected 
                        ? "bg-indigo-600 text-white shadow-md scale-105" 
                        : "bg-white/10 text-white/70 hover:bg-white/20"
                    }`}
                  >
                    {isSelected && <Check size={12} className="text-white" />}
                    {m.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
            <div className="sm:col-span-2 md:col-span-6">
              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Reward Title</label>
              <input 
                value={newReward.title} 
                onChange={e => setNewReward({...newReward, title: e.target.value})} 
                placeholder="e.g. 🍕 Family Pizza Night or 🎮 30 Mins Extra Gaming" 
                className="w-full p-3.5 rounded-xl bg-white/10 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-white placeholder:text-white/30 text-sm min-h-[44px]" 
                required 
              />
            </div>

            {/* Category Dropdown */}
            <div className="sm:col-span-1 md:col-span-3">
              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Category</label>
              <select
                value={newReward.category}
                onChange={e => setNewReward({...newReward, category: e.target.value})}
                className="w-full p-3.5 rounded-xl bg-slate-800 border-2 border-transparent focus:border-indigo-500 outline-none font-black text-white text-xs min-h-[44px]"
              >
                <option value="Little Rewards">Little Rewards (20–75 pts)</option>
                <option value="Medium Rewards">Medium Rewards (100–400 pts)</option>
                <option value="Big Rewards">Big Rewards (750–2000 pts)</option>
                <option value="General">General</option>
              </select>
            </div>

            <div className="sm:col-span-1 md:col-span-3 flex gap-2">
              <div className="flex-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-indigo-400 block mb-1">Points Cost</label>
                <input 
                  type="number" 
                  min="1"
                  value={newReward.points} 
                  onChange={e => {
                    const val = e.target.value;
                    setNewReward({
                      ...newReward, 
                      points: val === "" ? "" : Math.max(1, parseInt(val, 10) || 1)
                    });
                  }} 
                  placeholder="50"
                  className="w-full p-3.5 rounded-xl bg-white/10 border-2 border-transparent focus:border-indigo-500 outline-none font-black text-white text-center text-sm min-h-[44px]" 
                  required 
                />
              </div>

              <div className="self-end">
                <button 
                  type="submit" 
                  disabled={addReward.isPending || !newReward.title.trim()} 
                  className="bg-indigo-500 hover:bg-indigo-600 active:scale-95 px-5 py-3.5 rounded-xl font-black shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs uppercase tracking-wider min-h-[44px] disabled:opacity-40"
                >
                  <Plus size={16} /> ADD
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* CATEGORY FILTER TABS FOR REWARDS CATALOG */}
        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Browse & Assign Rewards by Tier:
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              Showing {filteredRewardList.length} of {rewardList.length} Rewards
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none select-none">
            {REWARD_CATEGORIES.map(tab => {
              const count = getCategoryCount(tab);
              const isActive = selectedCategoryTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSelectedCategoryTab(tab)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shrink-0 min-h-[38px] ${
                    isActive 
                      ? "bg-indigo-600 text-white shadow-md scale-105" 
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  <span>{tab}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md ${isActive ? "bg-white/20 text-white" : "bg-black/30 text-slate-400"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Existing Rewards Grid with Edit & Multi-Hero Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredRewardList.length === 0 && (
            <div className="col-span-full py-10 bg-white/5 rounded-2xl border border-dashed border-white/10 text-center p-4">
              <p className="text-slate-400 font-bold uppercase tracking-wider text-xs">No rewards in this section.</p>
            </div>
          )}

          {filteredRewardList.map((r: any) => {
            const assignedHeroes = getAssignedHeroNames(r);

            return (
              <div 
                key={r.id} 
                className="bg-white/5 p-4 rounded-2xl flex justify-between items-center gap-3 border border-white/10 group animate-in fade-in min-w-0"
              >
                 <div className="min-w-0 flex-1">
                   <div className="flex items-center gap-1.5 flex-wrap">
                     <p className="font-bold text-sm sm:text-base uppercase tracking-tight text-white break-words line-clamp-2">
                       {r.title}
                     </p>
                     
                     {/* Assigned Hero Badges or Template/Shared Status */}
                     {assignedHeroes.length > 0 ? (
                       <div className="flex flex-wrap gap-1">
                         {assignedHeroes.map((name: string) => (
                           <span key={name} className="px-1.5 py-0.5 bg-indigo-500/30 text-indigo-300 font-black text-[8px] uppercase rounded border border-indigo-400/30 shrink-0">
                             {name}
                           </span>
                         ))}
                       </div>
                     ) : r.is_shared === 1 ? (
                       <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 font-black text-[8px] uppercase rounded border border-emerald-400/30 shrink-0">
                         Shared
                       </span>
                     ) : (
                       <span className="px-1.5 py-0.5 bg-slate-700/50 text-slate-400 font-black text-[8px] uppercase rounded border border-slate-600/40 shrink-0">
                         📁 Template
                       </span>
                     )}
                   </div>
                   
                   <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-black uppercase tracking-widest mt-1">
                     <span className="text-indigo-400">{r.points} PTS COST</span>
                     {r.category && (
                       <>
                         <span className="text-slate-500">•</span>
                         <span className="text-slate-400">{r.category}</span>
                       </>
                     )}
                   </div>
                 </div>

                 {/* Touchscreen-Accessible Edit + Delete Buttons */}
                 <div className="flex items-center gap-1.5 shrink-0">
                   <button
                     onClick={() => {
                       let parsedIds: string[] = [];
                       if (r.member_ids) {
                         try { parsedIds = JSON.parse(r.member_ids); } catch { parsedIds = [r.member_id].filter(Boolean); }
                       } else if (r.member_id) {
                         parsedIds = [r.member_id];
                       }
                       setEditingReward({
                         ...r,
                         member_ids: parsedIds,
                         is_shared: r.is_shared === 1
                       });
                     }}
                     className="p-2.5 bg-indigo-500/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-xl transition-all cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center active:scale-95"
                     title="Edit / Assign Heroes"
                   >
                     <Edit3 size={15} />
                   </button>

                   <button 
                     onClick={() => {
                       if (confirm(`Remove "${r.title}" from the shop?`)) {
                         deleteReward.mutate(r.id);
                       }
                     }} 
                     className="p-2.5 bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl transition-all cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0 active:scale-95"
                     title="Delete Reward"
                   >
                     <Trash2 size={15} />
                   </button>
                 </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* EDIT / MULTI-ASSIGN REWARD MODAL */}
      {editingReward && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/70 backdrop-blur-md p-4" onClick={() => setEditingReward(null)}>
          <div className="w-full max-w-lg bg-slate-900 border-2 sm:border-4 border-slate-700 rounded-3xl sm:rounded-[3rem] p-5 sm:p-8 text-white shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 my-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <h3 className="text-lg sm:text-xl font-black uppercase italic tracking-tight flex items-center gap-2">
                <Edit3 size={18} className="text-indigo-400" /> Edit & Assign Reward
              </h3>
              <button onClick={() => setEditingReward(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {/* Target Hero Selector */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Make Reward Available To:
                </label>
                <span className="text-[8px] font-bold text-slate-400 uppercase">
                  {editingReward.is_shared 
                    ? "👥 Shared with Everyone" 
                    : (editingReward.member_ids || []).length === 0 
                    ? "📁 Template Pool" 
                    : `${(editingReward.member_ids || []).length} Hero(es)`}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingReward({ ...editingReward, member_ids: [], is_shared: false })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                    !editingReward.is_shared && (editingReward.member_ids || []).length === 0 
                      ? "bg-indigo-600 text-white shadow-md scale-105" 
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  <Users size={13} /> 📁 Template Pool
                </button>

                <button
                  type="button"
                  onClick={() => setEditingReward({ ...editingReward, member_ids: [], is_shared: true })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                    editingReward.is_shared 
                      ? "bg-emerald-600 text-white shadow-md scale-105" 
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  👥 Shared / Co-Op
                </button>

                {memberList.map((m: any) => {
                  const isSelected = (editingReward.member_ids || []).includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleEditRewardHero(m.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                        isSelected 
                          ? "bg-indigo-600 text-white shadow-md scale-105" 
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      }`}
                    >
                      {isSelected && <Check size={12} className="text-white" />}
                      {m.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Reward Title</label>
                <input
                  value={editingReward.title}
                  onChange={e => setEditingReward({ ...editingReward, title: e.target.value })}
                  className="w-full p-3 bg-white/10 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none text-sm font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Category</label>
                <select
                  value={editingReward.category || "Little Rewards"}
                  onChange={e => setEditingReward({ ...editingReward, category: e.target.value })}
                  className="w-full p-3 bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none text-xs font-bold text-white"
                >
                  <option value="Little Rewards">Little Rewards</option>
                  <option value="Medium Rewards">Medium Rewards</option>
                  <option value="Big Rewards">Big Rewards</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>

            {/* Points Cost */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-indigo-400 block">Points Cost</label>
              <input
                type="number"
                min="1"
                value={editingReward.points}
                onChange={e => setEditingReward({ ...editingReward, points: e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full p-3 bg-white/10 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none text-sm font-black text-center"
              />
            </div>

            {/* Submit Changes */}
            <div className="flex gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => {
                  updateReward.mutate({
                    id: editingReward.id,
                    data: {
                      title: editingReward.title,
                      points: editingReward.points,
                      category: editingReward.category,
                      member_ids: editingReward.member_ids,
                      is_shared: editingReward.is_shared ? 1 : 0
                    }
                  });
                }}
                disabled={updateReward.isPending || !editingReward.title.trim()}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md min-h-[44px]"
              >
                <Save size={16} /> Save Changes
              </button>

              <button
                type="button"
                onClick={() => setEditingReward(null)}
                className="px-5 py-3 bg-white/10 hover:bg-white/20 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
