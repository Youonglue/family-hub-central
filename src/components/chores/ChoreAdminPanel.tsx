// src/components/chores/ChoreAdminPanel.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  ShieldCheck, 
  CheckCircle2, 
  Zap, 
  Plus, 
  Trash2, 
  X, 
  Sparkles, 
  Heart, 
  Users, 
  Edit3, 
  Save, 
  Check 
} from "lucide-react";
import { listMembers } from "@/lib/hub-api";

interface ChoreAdminPanelProps {
  activeMember: any;
  onBack: () => void;
  isAdminView: boolean;
  setIsAdminView: (show: boolean) => void;
}

const CATEGORY_TABS = [
  "All",
  "Everyday",
  "Kitchen",
  "Whole House",
  "Dogs",
  "Learning",
  "Boss",
  "Co-Op"
] as const;

export function ChoreAdminPanel({
  activeMember,
  onBack,
  isAdminView,
  setIsAdminView
}: ChoreAdminPanelProps) {
  const qc = useQueryClient();

  // Category Filter Tab for the 50+ Quest Library
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>("All");

  // New Chore Creator State (Supports multi-hero assignment)
  const [newChore, setNewChore] = useState<{
    title: string;
    points: number | string;
    xp: number | string;
    is_boss: boolean;
    is_coop: boolean;
    category: string;
    member_ids: string[];
  }>({ 
    title: "", 
    points: 15, 
    xp: 15, 
    is_boss: false, 
    is_coop: false,
    category: "Everyday",
    member_ids: [] // Empty array = Template / Unassigned
  });

  // Editing Existing Chore State
  const [editingChore, setEditingChore] = useState<any | null>(null);

  // Behaviour Spark State
  const [sparkMemberId, setSparkMemberId] = useState<string>("");
  const [sparkReason, setSparkReason] = useState<string>("Kindness to sibling");
  const [sparkPoints, setSparkPoints] = useState<number>(10);

  const members = useQuery({ queryKey: ["members"], queryFn: listMembers });
  const memberList = Array.isArray(members.data) ? members.data.filter((m: any) => m.is_kid !== 0) : [];

  const chores = useQuery({ 
    queryKey: ["chores"], 
    queryFn: () => fetch('/api/chores').then(res => res.json()) 
  });

  const pendingApprovals = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: () => fetch('/api/chores/completions/pending').then(res => res.json())
  });

  const inv = () => {
    qc.invalidateQueries({ queryKey: ["chores"] });
    qc.invalidateQueries({ queryKey: ["pending-approvals"] });
    qc.invalidateQueries({ queryKey: ["points"] });
    qc.invalidateQueries({ queryKey: ["members"] });
  };

  const approveChore = useMutation({
    mutationFn: (id: string) => fetch(`/api/chores/completions/${id}/approve`, { method: "POST" }).then(res => res.json()),
    onSuccess: (res: any) => { 
      toast.success(`Approved! Granted +${res.pointsAwarded || 0} PTS and +${res.xpAwarded || 0} XP ⭐`); 
      inv();
    }
  });

  const declineChore = useMutation({
    mutationFn: (id: string) => fetch(`/api/chores/completions/${id}/reject`, { method: "POST" }).then(res => res.json()),
    onSuccess: () => {
      toast.info("Quest submission declined");
      inv();
    }
  });

  const addChore = useMutation({
    mutationFn: (data: any) => fetch('/api/chores', { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({
          ...data,
          points: Number(data.points) || 0,
          xp: Number(data.xp) || 0
        }) 
    }).then(res => res.json()),
    onSuccess: () => { 
        toast.success("Quest Added to Library!"); 
        setNewChore({ title: "", points: 15, xp: 15, is_boss: false, is_coop: false, category: "Everyday", member_ids: [] }); 
        inv();
    }
  });

  // EDIT / RE-ASSIGN MUTATION (Supports Multi-Hero array)
  const updateChore = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => fetch(`/api/chores/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        points: Number(data.points) || 0,
        xp: Number(data.xp) || 0
      })
    }).then(res => res.json()),
    onSuccess: () => {
      toast.success("Quest updated & re-assigned successfully! 🛡️");
      setEditingChore(null);
      inv();
    }
  });

  const awardSpark = useMutation({
    mutationFn: (data: any) => fetch('/api/chores/award-spark', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    onSuccess: (res: any) => {
      toast.success(`✨ Granted +${res.points} PTS to Hero!`);
      inv();
    }
  });

  const deleteChore = useMutation({
    mutationFn: (id: string) => fetch(`/api/chores/${id}`, { method: "DELETE" }).then(res => res.json()),
    onSuccess: () => { 
        toast.success("Quest Removed from Library"); 
        inv();
    }
  });

  const pendingList = Array.isArray(pendingApprovals.data) ? pendingApprovals.data : [];
  const choreList = Array.isArray(chores.data) ? chores.data : [];

  // Multi-Hero Toggle for Creator Form
  const toggleNewChoreHero = (heroId: string) => {
    setNewChore(prev => {
      const exists = prev.member_ids.includes(heroId);
      return {
        ...prev,
        member_ids: exists 
          ? prev.member_ids.filter(id => id !== heroId) 
          : [...prev.member_ids, heroId]
      };
    });
  };

  // Multi-Hero Toggle for Edit Modal
  const toggleEditChoreHero = (heroId: string) => {
    setEditingChore((prev: any) => {
      const current: string[] = prev.member_ids || [];
      const exists = current.includes(heroId);
      return {
        ...prev,
        member_ids: exists 
          ? current.filter(id => id !== heroId) 
          : [...current, heroId]
      };
    });
  };

  // Filtered Quest Library by Category Tab
  const filteredChoreList = useMemo(() => {
    if (selectedCategoryTab === "All") return choreList;
    if (selectedCategoryTab === "Boss") return choreList.filter((c: any) => c.is_boss === 1);
    if (selectedCategoryTab === "Co-Op") return choreList.filter((c: any) => c.is_coop === 1);
    return choreList.filter((c: any) => (c.category || "").toLowerCase() === selectedCategoryTab.toLowerCase());
  }, [choreList, selectedCategoryTab]);

  // Count items per category tab
  const getCategoryCount = (tab: string) => {
    if (tab === "All") return choreList.length;
    if (tab === "Boss") return choreList.filter((c: any) => c.is_boss === 1).length;
    if (tab === "Co-Op") return choreList.filter((c: any) => c.is_coop === 1).length;
    return choreList.filter((c: any) => (c.category || "").toLowerCase() === tab.toLowerCase()).length;
  };

  const commonSparks = [
    { label: "🤝 Kindness / Helping Sibling", pts: 10 },
    { label: "⭐ Did something without asking", pts: 15 },
    { label: "💪 Tried hard on difficult task", pts: 10 },
    { label: "🧠 Worked independently without reminders", pts: 10 },
    { label: "🧘 Stayed calm & solved problem", pts: 10 },
  ];

  // Helper to extract assigned hero names for a chore card
  const getAssignedHeroNames = (chore: any) => {
    const names: string[] = [];
    if (chore.member_ids) {
      try {
        const ids: string[] = JSON.parse(chore.member_ids);
        ids.forEach(id => {
          const match = memberList.find((m: any) => m.id === id);
          if (match) names.push(match.name);
        });
      } catch (e) {}
    }
    if (names.length === 0 && chore.assigned_member_name) {
      names.push(chore.assigned_member_name);
    }
    return names;
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in zoom-in-95 duration-200 safe-area-inset-bottom">
      
      {/* TOP KIOSK HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-sm border-2 sm:border-4 border-slate-50">
        <button 
          onClick={onBack} 
          className="flex items-center justify-center sm:justify-start gap-2 font-black text-slate-400 hover:text-slate-900 transition-colors uppercase text-xs tracking-widest py-2 cursor-pointer min-h-[44px]"
        >
          <ArrowLeft size={16} /> {activeMember ? "Exit Admin" : "Character Select"}
        </button>
        
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <p className="font-black uppercase italic text-slate-800 tracking-tight text-sm sm:text-base truncate max-w-[200px]">
            {activeMember ? activeMember.name : "System Admin"}
          </p>
          <button 
            onClick={() => setIsAdminView(false)} 
            className="px-4 py-2.5 sm:px-6 sm:py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all w-full sm:w-auto cursor-pointer bg-slate-900 text-white min-h-[44px] active:scale-95 shrink-0"
          >
            <ShieldCheck size={18} /> Exit Mastery
          </button>
        </div>
      </div>

      {/* QUICK BEHAVIOUR SPARK PANEL */}
      <section className="bg-gradient-to-r from-amber-500 to-indigo-600 text-white p-4 sm:p-6 md:p-8 rounded-3xl sm:rounded-[3rem] shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-white/20 rounded-xl">
            <Sparkles className="size-6 text-yellow-200 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg sm:text-2xl font-black uppercase italic tracking-tight">Award Behaviour Spark</h2>
            <p className="text-[10px] font-bold text-white/80 uppercase tracking-wider">
              Instant positive reinforcement for kindness & responsibility (No chore needed)
            </p>
          </div>
        </div>

        <div className="bg-white/10 p-4 rounded-2xl border border-white/20 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-white/80 mr-2">Select Hero:</span>
            {memberList.map((m: any) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSparkMemberId(m.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer min-h-[36px] ${
                  sparkMemberId === m.id 
                    ? "bg-white text-slate-900 shadow-md scale-105" 
                    : "bg-black/20 text-white hover:bg-black/30"
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-white/80 mr-2">Quick Reason:</span>
            {commonSparks.map(s => (
              <button
                key={s.label}
                type="button"
                onClick={() => {
                  setSparkReason(s.label);
                  setSparkPoints(s.pts);
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer min-h-[34px] ${
                  sparkReason === s.label 
                    ? "bg-amber-400 text-slate-900 font-black shadow-sm" 
                    : "bg-white/10 text-white/90 hover:bg-white/20"
                }`}
              >
                {s.label} (+{s.pts})
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/80">Points:</span>
              <input
                type="number"
                value={sparkPoints}
                onChange={e => setSparkPoints(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 p-1.5 bg-white/20 rounded-lg text-center font-black text-xs text-white outline-none"
              />
            </div>

            <button
              type="button"
              disabled={!sparkMemberId || awardSpark.isPending}
              onClick={() => {
                awardSpark.mutate({
                  memberId: sparkMemberId,
                  points: sparkPoints,
                  xp: sparkPoints,
                  reason: sparkReason
                });
              }}
              className="px-5 py-2.5 bg-white hover:bg-yellow-100 text-slate-900 rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5 min-h-[40px]"
            >
              <Heart size={14} className="text-rose-500 fill-rose-500" /> Grant Spark Now
            </button>
          </div>
        </div>
      </section>

      {/* 1. PENDING APPROVALS LIST */}
      <section className="bg-white p-4 sm:p-6 md:p-8 rounded-3xl sm:rounded-[3rem] shadow-xl border-2 sm:border-4 border-slate-50">
        <h2 className="text-lg sm:text-2xl md:text-3xl font-black uppercase italic tracking-tight mb-4 sm:mb-6 flex items-center gap-2.5 sm:gap-3 text-slate-900">
          <ShieldCheck className="text-green-500 size-6 sm:size-8 shrink-0" /> Pending Quest Approvals
        </h2>

        <div className="grid gap-3 sm:gap-4">
          {pendingList.length === 0 && (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100 p-4">
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs sm:text-sm">All quests are verified.</p>
            </div>
          )}

          {pendingList.map((p: any) => {
            const basePts = p.base_points !== undefined ? p.base_points : (p.points_awarded || 0);
            const baseXp = p.base_xp !== null && p.base_xp !== undefined ? p.base_xp : basePts;

            const finalPts = p.is_boss === 1 ? basePts * 3 : p.is_coop === 1 ? basePts * 2 : basePts;
            const finalXp = p.is_boss === 1 ? baseXp : p.is_coop === 1 ? baseXp * 2 : baseXp;

            return (
              <div 
                key={p.id} 
                className="bg-slate-50 p-4 sm:p-5 md:p-6 rounded-2xl sm:rounded-[2rem] border border-slate-200 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-between sm:items-center min-w-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-base sm:text-xl md:text-2xl uppercase tracking-tight text-slate-800 break-words line-clamp-2">
                      {p.chore_title}
                    </p>
                    {p.is_boss === 1 && (
                      <span className="px-2 py-0.5 bg-rose-100 border border-rose-200 text-rose-600 font-black text-[9px] uppercase rounded shrink-0">
                        BOSS 3x PTS
                      </span>
                    )}
                    {p.is_coop === 1 && (
                      <span className="px-2 py-0.5 bg-indigo-100 border border-indigo-200 text-indigo-600 font-black text-[9px] uppercase rounded shrink-0">
                        CO-OP 2x
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 mt-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider flex-wrap">
                    <span className="text-indigo-600 font-black truncate max-w-[200px]">Claimed by {p.member_name}</span>
                    <span>•</span>
                    <span className="text-emerald-600 font-black shrink-0">+{finalPts} PTS</span>
                    <span>•</span>
                    <span className="text-purple-600 font-black shrink-0">+{finalXp} XP</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-auto pt-2 sm:pt-0 shrink-0">
                  <button 
                    onClick={() => declineChore.mutate(p.id)}
                    className="p-3 bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-400 border border-slate-200 rounded-xl transition-all active:scale-95 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Decline Quest"
                  >
                    <X size={18} />
                  </button>

                  <button 
                    onClick={() => approveChore.mutate(p.id)} 
                    className="flex-1 sm:flex-none bg-green-500 hover:bg-green-600 active:scale-95 text-white px-4 sm:px-6 py-3 rounded-2xl font-black shadow-md transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer min-h-[44px]"
                  >
                    <CheckCircle2 size={18} /> APPROVE (+{finalPts} PTS)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. QUEST LIBRARY CREATION & CATEGORIZED VIEW */}
      <section className="bg-slate-900 text-white p-4 sm:p-6 md:p-8 rounded-3xl sm:rounded-[3rem] shadow-xl space-y-6">
        <h2 className="text-lg sm:text-2xl md:text-3xl font-black uppercase italic tracking-tight flex items-center gap-2.5 sm:gap-3">
          <Zap className="text-yellow-400 size-6 sm:size-8 shrink-0" /> Quest Library & Creation
        </h2>
        
        {/* Creator Form with Multi-Hero Assignment */}
        <form 
          onSubmit={(e) => { 
            e.preventDefault(); 
            addChore.mutate(newChore); 
          }} 
          className="space-y-4 bg-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-white/10"
        >
          {/* Multi-Hero Assignment Selector */}
          <div>
            <div className="flex justify-between items-center mb-1.5 flex-wrap gap-1">
              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                Assign Quest To (Select Multiple Heroes):
              </label>
              <span className="text-[8px] font-bold text-slate-400 uppercase">
                {newChore.member_ids.length === 0 ? "📁 Unassigned Template" : `${newChore.member_ids.length} Hero(es) Selected`}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setNewChore({ ...newChore, member_ids: [] })}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                  newChore.member_ids.length === 0 
                    ? "bg-indigo-600 text-white shadow-md scale-105" 
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                <Users size={13} /> 📁 Template Pool
              </button>

              {memberList.map((m: any) => {
                const isSelected = newChore.member_ids.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleNewChoreHero(m.id)}
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
              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Quest Title</label>
              <input 
                value={newChore.title} 
                onChange={e => setNewChore({...newChore, title: e.target.value})} 
                placeholder="e.g. 🧹 Tidy Bedroom & Make Bed" 
                className="w-full p-3.5 rounded-xl bg-white/10 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-white placeholder:text-white/30 text-sm min-h-[44px]" 
                required 
              />
            </div>

            {/* Category Dropdown */}
            <div className="sm:col-span-1 md:col-span-2">
              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Category</label>
              <select
                value={newChore.category}
                onChange={e => setNewChore({...newChore, category: e.target.value})}
                className="w-full p-3.5 rounded-xl bg-slate-800 border-2 border-transparent focus:border-indigo-500 outline-none font-black text-white text-xs min-h-[44px]"
              >
                <option value="Everyday">Everyday</option>
                <option value="Kitchen">Kitchen</option>
                <option value="Whole House">Whole House</option>
                <option value="Dogs">Dogs</option>
                <option value="Learning">Learning</option>
                <option value="General">General</option>
              </select>
            </div>

            {/* Reward Points Input */}
            <div className="sm:col-span-1 md:col-span-2">
              <label className="text-[9px] font-black uppercase tracking-wider text-emerald-400 block mb-1">Points</label>
              <input 
                type="number" 
                min="0"
                value={newChore.points} 
                onChange={e => {
                  const val = e.target.value;
                  const pts = val === "" ? "" : Math.max(0, parseInt(val, 10) || 0);
                  setNewChore(prev => ({
                    ...prev, 
                    points: pts,
                    xp: prev.xp === prev.points ? pts : prev.xp
                  }));
                }} 
                placeholder="0"
                className="w-full p-3.5 rounded-xl bg-white/10 border-2 border-transparent focus:border-emerald-500 outline-none font-black text-white text-center text-sm min-h-[44px]" 
                required 
              />
            </div>

            {/* Experience XP Input */}
            <div className="sm:col-span-1 md:col-span-2">
              <label className="text-[9px] font-black uppercase tracking-wider text-purple-400 block mb-1">XP</label>
              <input 
                type="number" 
                min="0"
                value={newChore.xp} 
                onChange={e => {
                  const val = e.target.value;
                  setNewChore(prev => ({
                    ...prev, 
                    xp: val === "" ? "" : Math.max(0, parseInt(val, 10) || 0)
                  }));
                }} 
                placeholder="0"
                className="w-full p-3.5 rounded-xl bg-white/10 border-2 border-transparent focus:border-purple-500 outline-none font-black text-white text-center text-sm min-h-[44px]" 
                required 
              />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pt-3 border-t border-white/10">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              {/* Boss Toggle Switch */}
              <label className="inline-flex items-center gap-3 cursor-pointer select-none min-h-[44px]">
                <div className="relative inline-block w-11 h-6 shrink-0">
                  <input
                    type="checkbox"
                    checked={newChore.is_boss}
                    onChange={(e) => setNewChore({
                      ...newChore, 
                      is_boss: e.target.checked, 
                      is_coop: e.target.checked ? false : newChore.is_coop 
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:bg-rose-600 transition-colors"></div>
                  <div className="absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 transition-transform peer-checked:translate-x-full shadow-sm pointer-events-none"></div>
                </div>
                <span className="text-[11px] sm:text-xs font-black text-slate-300 uppercase tracking-wider">
                  💀 Boss Battle (3x Points)
                </span>
              </label>

              {/* Co-Op Toggle Switch */}
              <label className="inline-flex items-center gap-3 cursor-pointer select-none min-h-[44px]">
                <div className="relative inline-block w-11 h-6 shrink-0">
                  <input
                    type="checkbox"
                    checked={newChore.is_coop}
                    onChange={(e) => setNewChore({
                      ...newChore, 
                      is_coop: e.target.checked, 
                      is_boss: e.target.checked ? false : newChore.is_boss 
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:bg-indigo-500 transition-colors"></div>
                  <div className="absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 transition-transform peer-checked:translate-x-full shadow-sm pointer-events-none"></div>
                </div>
                <span className="text-[11px] sm:text-xs font-black text-slate-300 uppercase tracking-wider">
                  👥 Co-Op Quest (Shared with Everyone)
                </span>
              </label>
            </div>

            <button 
              type="submit" 
              disabled={addChore.isPending || !newChore.title.trim()} 
              className="w-full lg:w-auto bg-indigo-500 hover:bg-indigo-600 active:scale-95 px-6 py-3.5 rounded-xl font-black shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider min-h-[44px] disabled:opacity-40"
            >
              <Plus size={16} /> ADD QUEST TO LIBRARY
            </button>
          </div>
        </form>

        {/* CATEGORY FILTER TABS FOR THE QUEST LIBRARY */}
        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Browse & Assign Quests by Category:
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              Showing {filteredChoreList.length} of {choreList.length} Quests
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none select-none">
            {CATEGORY_TABS.map(tab => {
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

        {/* Existing Quest Grid with Multi-Hero Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredChoreList.length === 0 && (
            <div className="col-span-full py-10 bg-white/5 rounded-2xl border border-dashed border-white/10 text-center p-4">
              <p className="text-slate-400 font-bold uppercase tracking-wider text-xs">No quests in this category.</p>
            </div>
          )}

          {filteredChoreList.map((c: any) => {
            const basePts = c.points || 0;
            const baseXp = c.xp !== null && c.xp !== undefined ? c.xp : basePts;

            const finalPts = c.is_boss === 1 ? basePts * 3 : c.is_coop === 1 ? basePts * 2 : basePts;
            const finalXp = c.is_boss === 1 ? baseXp : c.is_coop === 1 ? baseXp * 2 : baseXp;

            const assignedHeroes = getAssignedHeroNames(c);

            return (
              <div 
                key={c.id} 
                className="bg-white/5 p-4 rounded-2xl flex justify-between items-center gap-3 border border-white/10 group animate-in fade-in min-w-0"
              >
                 <div className="min-w-0 flex-1">
                   <div className="flex items-center gap-1.5 flex-wrap">
                     <p className="font-bold text-sm sm:text-base uppercase tracking-tight text-white break-words line-clamp-2">
                       {c.title}
                     </p>
                     
                     {/* Assigned Hero Badges or Template Status */}
                     {assignedHeroes.length > 0 ? (
                       <div className="flex flex-wrap gap-1">
                         {assignedHeroes.map((name: string) => (
                           <span key={name} className="px-1.5 py-0.5 bg-indigo-500/30 text-indigo-300 font-black text-[8px] uppercase rounded border border-indigo-400/30 shrink-0">
                             {name}
                           </span>
                         ))}
                       </div>
                     ) : c.is_coop === 1 ? (
                       <span className="px-1.5 py-0.5 bg-indigo-600/30 text-indigo-400 font-black text-[8px] uppercase rounded shrink-0">
                         CO-OP 2x
                       </span>
                     ) : (
                       <span className="px-1.5 py-0.5 bg-slate-700/50 text-slate-400 font-black text-[8px] uppercase rounded border border-slate-600/40 shrink-0">
                         📁 Template
                       </span>
                     )}

                     {c.is_boss === 1 && (
                       <span className="px-1.5 py-0.5 bg-rose-600/30 text-rose-400 font-black text-[8px] uppercase rounded shrink-0">
                         BOSS 3x
                       </span>
                     )}
                   </div>
                   
                   <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-black uppercase tracking-widest mt-1.5 flex-wrap">
                     <span className="text-emerald-400">+{finalPts} PTS</span>
                     <span className="text-slate-500">•</span>
                     <span className="text-purple-400">+{finalXp} XP</span>
                     {c.category && (
                       <>
                         <span className="text-slate-500">•</span>
                         <span className="text-slate-400">{c.category}</span>
                       </>
                     )}
                   </div>
                 </div>

                 {/* Action Buttons: Edit/Assign + Delete */}
                 <div className="flex items-center gap-1.5 shrink-0">
                   <button
                     onClick={() => {
                       let parsedIds: string[] = [];
                       if (c.member_ids) {
                         try { parsedIds = JSON.parse(c.member_ids); } catch { parsedIds = [c.member_id].filter(Boolean); }
                       } else if (c.member_id) {
                         parsedIds = [c.member_id];
                       }
                       setEditingChore({
                         ...c,
                         member_ids: parsedIds
                       });
                     }}
                     className="p-2.5 bg-indigo-500/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-xl transition-all cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center active:scale-95"
                     title="Edit / Assign Heroes"
                   >
                     <Edit3 size={15} />
                   </button>

                   <button 
                     onClick={() => deleteChore.mutate(c.id)} 
                     className="p-2.5 bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl transition-all cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0 active:scale-95"
                     title="Delete Quest"
                   >
                     <Trash2 size={15} />
                   </button>
                 </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* EDIT / MULTI-ASSIGN MODAL */}
      {editingChore && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/70 backdrop-blur-md p-4" onClick={() => setEditingChore(null)}>
          <div className="w-full max-w-lg bg-slate-900 border-2 sm:border-4 border-slate-700 rounded-3xl sm:rounded-[3rem] p-5 sm:p-8 text-white shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 my-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <h3 className="text-lg sm:text-xl font-black uppercase italic tracking-tight flex items-center gap-2">
                <Edit3 size={18} className="text-indigo-400" /> Edit & Assign Quest
              </h3>
              <button onClick={() => setEditingChore(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {/* Multi-Hero Selector */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Assign To (Tap Multiple to Multi-Assign):
                </label>
                <span className="text-[8px] font-bold text-slate-400 uppercase">
                  {(editingChore.member_ids || []).length === 0 ? "📁 Unassigned Template" : `${(editingChore.member_ids || []).length} Hero(es)`}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingChore({ ...editingChore, member_ids: [] })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                    (editingChore.member_ids || []).length === 0 
                      ? "bg-indigo-600 text-white shadow-md scale-105" 
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  <Users size={13} /> 📁 Template Pool
                </button>

                {memberList.map((m: any) => {
                  const isSelected = (editingChore.member_ids || []).includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleEditChoreHero(m.id)}
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
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Quest Title</label>
                <input
                  value={editingChore.title}
                  onChange={e => setEditingChore({ ...editingChore, title: e.target.value })}
                  className="w-full p-3 bg-white/10 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none text-sm font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Category</label>
                <select
                  value={editingChore.category || "Everyday"}
                  onChange={e => setEditingChore({ ...editingChore, category: e.target.value })}
                  className="w-full p-3 bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none text-xs font-bold text-white"
                >
                  <option value="Everyday">Everyday</option>
                  <option value="Kitchen">Kitchen</option>
                  <option value="Whole House">Whole House</option>
                  <option value="Dogs">Dogs</option>
                  <option value="Learning">Learning</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>

            {/* Points & XP Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">Points</label>
                <input
                  type="number"
                  min="0"
                  value={editingChore.points}
                  onChange={e => setEditingChore({ ...editingChore, points: e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-full p-3 bg-white/10 border-2 border-transparent focus:border-emerald-500 rounded-xl outline-none text-sm font-black text-center"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-purple-400 block">XP</label>
                <input
                  type="number"
                  min="0"
                  value={editingChore.xp}
                  onChange={e => setEditingChore({ ...editingChore, xp: e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-full p-3 bg-white/10 border-2 border-transparent focus:border-purple-500 rounded-xl outline-none text-sm font-black text-center"
                />
              </div>
            </div>

            {/* Mode Toggles */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                <input
                  type="checkbox"
                  checked={editingChore.is_boss === 1 || editingChore.is_boss === true}
                  onChange={e => setEditingChore({ ...editingChore, is_boss: e.target.checked, is_coop: e.target.checked ? false : editingChore.is_coop })}
                  className="size-4 rounded text-rose-600"
                />
                💀 Boss Battle (3x Points)
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                <input
                  type="checkbox"
                  checked={editingChore.is_coop === 1 || editingChore.is_coop === true}
                  onChange={e => setEditingChore({ ...editingChore, is_coop: e.target.checked, is_boss: e.target.checked ? false : editingChore.is_boss })}
                  className="size-4 rounded text-indigo-500"
                />
                👥 Co-Op (Shared with Everyone)
              </label>
            </div>

            {/* Submit Changes */}
            <div className="flex gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => {
                  updateChore.mutate({
                    id: editingChore.id,
                    data: {
                      title: editingChore.title,
                      points: editingChore.points,
                      xp: editingChore.xp,
                      category: editingChore.category,
                      member_ids: editingChore.member_ids,
                      is_boss: editingChore.is_boss,
                      is_coop: editingChore.is_coop
                    }
                  });
                }}
                disabled={updateChore.isPending || !editingChore.title.trim()}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md min-h-[44px]"
              >
                <Save size={16} /> Save Changes
              </button>

              <button
                type="button"
                onClick={() => setEditingChore(null)}
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
