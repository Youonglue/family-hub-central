import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Check } from "lucide-react";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const EVENT_COLORS = ["sky", "rose", "amber", "emerald", "violet", "indigo", "cyan", "pink", "orange", "fuchsia", "lime", "teal"];

const getQuestColor = (title: string): string => {
  const colors = EVENT_COLORS.map(c => `var(--kid-${c})`);
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const QUEST_TEMPLATES = [
  { title: "🧹 Clean Room", location: "Bedroom", color: getQuestColor("Clean Room") },
  { title: "📚 Homework", location: "Study", color: getQuestColor("Homework") },
  { title: "🍿 Movie Night", location: "Living Room", color: getQuestColor("Movie Night") },
  { title: "🍽️ Family Dinner", location: "Kitchen", color: getQuestColor("Family Dinner") },
  { title: "🏊 Swim Class", location: "Pool", color: getQuestColor("Swim Class") },
  { title: "🦷 Dentist Visit", location: "Clinic", color: getQuestColor("Dentist Visit") },
  { title: "🎂 Birthday Party", location: "Party Hall", color: getQuestColor("Birthday Party") },
  { title: "🛒 Grocery Run", location: "Supermarket", color: getQuestColor("Grocery Run") },
];

export function CalendarAddQuestModal({ anchor, selectedDates, memberList, onClose, onRefresh, onClearSelectedDates }: any) {
  const [formTitle, setFormTitle] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formColor, setFormColor] = useState("");
  
  // Custom time inputs
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");

  const handleApplyTemplate = (tpl: typeof QUEST_TEMPLATES[number]) => {
    setFormTitle(tpl.title);
    setFormLocation(tpl.location);
    setFormColor(tpl.color);
    toast.success(`Loaded "${tpl.title.split(" ").slice(1).join(" ")}" template!`);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-md p-4" onClick={onClose}>
       <div className="w-full max-w-xl bg-white rounded-[4rem] p-10 shadow-2xl border-[12px] border-slate-50 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
         <div className="flex justify-between items-center mb-6">
           <h2 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">New Quest</h2>
           <button onClick={onClose} className="p-3 bg-slate-100 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-all cursor-pointer"><X /></button>
         </div>
         
         {/* Quick-Quest Templates */}
         <div className="mb-6 p-4 bg-slate-50 rounded-3xl border-2 border-slate-100 flex flex-wrap gap-2">
           {QUEST_TEMPLATES.map((tpl) => (
             <button 
               type="button"
               key={tpl.title}
               onClick={() => handleApplyTemplate(tpl)}
               className="px-4 py-2 rounded-xl font-bold uppercase text-[10px] shadow-sm transition-all bg-white hover:scale-105 cursor-pointer text-slate-800 border border-slate-200"
             >
               {tpl.title}
             </button>
           ))}
         </div>

         <form className="space-y-4" onSubmit={async (e) => {
            e.preventDefault();
            const target = e.target as any;
            const dates = selectedDates.length > 0 ? selectedDates : [ymd(anchor)];
            
            await fetch('/api/events', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                title: (formTitle || target.title.value).trim(),
                location: (formLocation || target.location.value).trim(),
                member_id: target.member.value || null,
                color: formColor || getQuestColor(formTitle || target.title.value),
                dates: dates,
                time_from: timeFrom,
                time_to: timeTo
              })
            });
            toast.success("Quests Logged!");
            onClearSelectedDates(); 
            onClose(); 
            onRefresh();
         }}>
            <input name="title" required placeholder="Quest Name" className="w-full p-6 bg-slate-50 rounded-3xl border-4 border-transparent focus:border-indigo-500 outline-none font-black text-xl" value={formTitle} onChange={(e) => { setFormTitle(e.target.value); setFormColor(getQuestColor(e.target.value)); }} />
            <input name="location" placeholder="Location" className="w-full p-6 bg-slate-50 rounded-3xl border-4 border-transparent focus:border-indigo-500 outline-none font-bold" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} />
            
            {/* Start and End Time Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Time From</span>
                <input type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-4 border-transparent focus:border-indigo-500 outline-none font-bold text-slate-700" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Time To</span>
                <input type="time" value={timeTo} onChange={e => setTimeTo(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-4 border-transparent focus:border-indigo-500 outline-none font-bold text-slate-700" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <select name="member" className="p-5 bg-slate-50 rounded-3xl font-black uppercase text-xs cursor-pointer">
                <option value="">Whole Family</option>
                {memberList.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <select name="color" value={formColor} onChange={(e) => setFormColor(e.target.value)} className="p-5 bg-slate-50 rounded-3xl font-black uppercase text-xs disabled:opacity-50" disabled>
                <option value="">-- Consistent Color Auto-Set --</option>
                {EVENT_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black text-2xl shadow-2xl hover:bg-indigo-600 transition-all active:scale-95 flex items-center justify-center gap-3 cursor-pointer">
              <Check size={32} /> LOG QUESTS
            </button>
         </form>
       </div>
    </div>
  );
}
