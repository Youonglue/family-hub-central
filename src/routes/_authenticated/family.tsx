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

function FamilyPage() {
  const qc = useQueryClient();
  const members = useQuery({ queryKey: ["members"], queryFn: () => listMembers() });
  const [showAdd, setShowAdd] = useState(false);
  const [edit, setEdit] = useState<any>(null);

  const addHero = useMutation({
    mutationFn: (data: any) => fetch('/api/members', { 
        method: 'POST', 
        headers: {'Content-Type':'application/json'}, 
        body: JSON.stringify(data) 
    }),
    onSuccess: () => { 
        toast.success("Hero Recruited!"); 
        qc.invalidateQueries({ queryKey: ["members"] }); 
        setShowAdd(false); 
    }
  });

  const memberList = Array.isArray(members.data) ? members.data : [];

  return (
    <AppShell>
      <div className="p-8 max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900">Family Heroes</h1>
          {/* MUSCLE: Button is now always visible so you can always add */}
          <button onClick={() => setShowAdd(true)} className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-xl hover:bg-indigo-600 transition-all">
            <UserPlus size={18} /> Recruit Hero
          </button>
        </header>

        {memberList.length === 0 ? (
            <div className="bg-white border-8 border-dashed border-slate-100 rounded-[4rem] p-20 text-center">
                <div className="size-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-500 mb-6">
                    <Sparkles size={48} />
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
                    return (
                        <div key={m.id} onClick={() => setEdit(m)} className="bg-white p-8 rounded-[3rem] border-4 border-slate-50 shadow-xl flex flex-col items-center gap-4 cursor-pointer hover:scale-105 transition-all">
                            <div className="size-24 rounded-[2rem] flex items-center justify-center text-white" style={{ backgroundColor: m.avatar_color || '#ccc' }}>
                                <HeroIcon size={48} />
                            </div>
                            <p className="text-2xl font-black uppercase italic text-slate-800">{m.name}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase">Level {m.level || 1} Adventurer</p>
                        </div>
                    );
                })}
            </div>
        )}

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
