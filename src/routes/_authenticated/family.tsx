import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { listMembers, updateMember } from "@/lib/hub-api";
import { Ghost, Cat, Dog, Rabbit, Baby, User, Check, Palette } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/family")({ component: FamilyPage });

const HERO_ICONS = [
  { name: 'Ghost', icon: Ghost }, { name: 'Cat', icon: Cat },
  { name: 'Dog', icon: Dog }, { name: 'Rabbit', icon: Rabbit },
  { name: 'Kid', icon: Baby }, { name: 'Parent', icon: User }
];

const HERO_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];

function FamilyPage() {
  const qc = useQueryClient();
  const { data: members } = useQuery({ queryKey: ["members"], queryFn: () => listMembers() });
  const [editingMember, setEditingMember] = useState<any>(null);

  const updateMut = useMutation({
    mutationFn: (data: any) => updateMember({ data }),
    onSuccess: () => { toast.success("Hero Updated!"); qc.invalidateQueries(); setEditingMember(null); }
  });

  return (
    <AppShell>
      <div className="p-8 max-w-5xl mx-auto">
        <h1 className="text-4xl font-black uppercase italic mb-10 tracking-tighter">Family Heroes</h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {Array.isArray(members) && members.map((m: any) => (
            <div key={m.id} onClick={() => setEditingMember(m)} className="bg-white p-8 rounded-[3rem] border-4 border-slate-50 shadow-xl flex items-center gap-6 cursor-pointer hover:scale-105 transition-all">
              <div className="size-20 rounded-3xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: m.avatar_color || '#ccc' }}>
                <Cat size={40} />
              </div>
              <div>
                <p className="text-2xl font-black uppercase italic text-slate-900">{m.name}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Level {m.level || 1} {m.is_kid ? 'Adventurer' : 'Master'}</p>
              </div>
            </div>
          ))}
        </div>

        {/* HERO CUSTOMIZER MODAL */}
        {editingMember && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white p-10 rounded-[4rem] border-[12px] border-slate-50 w-full max-w-xl shadow-2xl">
              <h2 className="text-3xl font-black uppercase italic mb-8">Customize Hero</h2>
              
              <div className="space-y-8">
                {/* NAME LOCK */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Hero Name (Admin Only Change)</label>
                  <input value={editingMember.name} disabled className="w-full p-5 bg-slate-50 rounded-2xl border-none font-black text-slate-300 cursor-not-allowed" />
                </div>

                {/* COLOR PICKER */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4 flex items-center gap-2"><Palette size={14}/> Aura Color</label>
                  <div className="flex gap-3 mt-2">
                    {HERO_COLORS.map(c => (
                      <button key={c} onClick={() => setEditingMember({...editingMember, avatar_color: c})} className={`size-10 rounded-full transition-all ${editingMember.avatar_color === c ? 'ring-4 ring-slate-900 scale-110' : ''}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>

                <button onClick={() => updateMut.mutate(editingMember)} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-xl hover:bg-indigo-600 transition-all">
                  SAVE CHANGES
                </button>
                <button onClick={() => setEditingMember(null)} className="w-full text-xs font-black text-slate-300 uppercase">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
