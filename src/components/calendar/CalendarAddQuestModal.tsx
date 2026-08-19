// src/components/calendar/CalendarAddQuestModal.tsx
import { useState } from "react";
import { toast } from "sonner";
import { X, Check, Clock, Sparkles } from "lucide-react";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const EVENT_COLORS = ["sky", "rose", "amber", "emerald", "violet", "indigo", "cyan", "pink", "orange", "fuchsia", "lime", "teal"];
const CATEGORIES = ["School", "Sports", "Fun", "Chores", "Work", "General"];

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
  { title: "🎒 School Run", location: "School", color: getQuestColor("School Run"), category: "School", time_from: "08:30", time_to: "15:15" },
  { title: "📚 Homework", location: "Study Room", color: getQuestColor("Homework"), category: "School", time_from: "16:00", time_to: "17:00" },
  { title: "⚽ Football Practice", location: "Sports Field", color: getQuestColor("Football Practice"), category: "Sports", time_from: "17:30", time_to: "18:30" },
  { title: "🏊 Swim Class", location: "Pool", color: getQuestColor("Swim Class"), category: "Sports", time_from: "10:00", time_to: "11:00" },
  { title: "🧹 Clean Room", location: "Bedroom", color: getQuestColor("Clean Room"), category: "Chores", time_from: "11:00", time_to: "11:30" },
  { title: "🍿 Movie Night", location: "Living Room", color: getQuestColor("Movie Night"), category: "Fun", time_from: "19:00", time_to: "21:00" },
  { title: "🦷 Dentist Visit", location: "Clinic", color: getQuestColor("Dentist Visit"), category: "General", time_from: "14:00", time_to: "15:00" },
  { title: "🎂 Birthday Party", location: "Party Hall", color: getQuestColor("Birthday Party"), category: "Fun", time_from: "13:00", time_to: "16:00" },
];

export function CalendarAddQuestModal({ anchor, selectedDates, memberList, onClose, onRefresh, onClearSelectedDates }: any) {
  const [formTitle, setFormTitle] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formColor, setFormColor] = useState("");
  const [formCategory, setFormCategory] = useState("General");
  const [formRepeats, setFormRepeats] = useState<number>(0);
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");

  const activeDate = selectedDates.length > 0 ? new Date(selectedDates[0] + "T00:00:00") : anchor;
  const weekdayName = activeDate.toLocaleDateString(undefined, { weekday: "long" });

  const handleApplyTemplate = (tpl: any) => {
    setFormTitle(tpl.title);
    setFormLocation(tpl.location);
    setFormColor(tpl.color);
    setFormCategory(tpl.category || "General");
    if (tpl.time_from) setTimeFrom(tpl.time_from);
    if (tpl.time_to) setTimeTo(tpl.time_to);
    toast.success(`Loaded "${tpl.title}" template!`);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-md p-3 sm:p-4 overflow-y-auto" onClick={onClose}>
       <div className="w-full max-w-xl bg-white rounded-3xl sm:rounded-[3.5rem] p-5 sm:p-8 shadow-2xl border-4 sm:border-8 border-slate-50 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] my-auto" onClick={e => e.stopPropagation()}>
         
         <div className="flex justify-between items-center mb-4 sm:mb-6 shrink-0">
           <div>
             <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-slate-900 leading-tight">
               Schedule Quest
             </h2>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Add routine or one-time quest</p>
           </div>
           <button 
             onClick={onClose} 
             className="p-2.5 bg-slate-100 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
           >
             <X size={18} />
           </button>
         </div>
         
         <div className="overflow-y-auto pr-1 space-y-4 sm:space-y-5 flex-1 scrollbar-thin">
           
           {/* Quick Routine Presets */}
           <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
             <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1">
               <Sparkles size={12} /> One-Tap Presets:
             </span>
             <div className="flex flex-wrap gap-1.5">
               {QUEST_TEMPLATES.map((tpl) => (
                 <button 
                   type="button"
                   key={tpl.title}
                   onClick={() => handleApplyTemplate(tpl)}
                   className="px-3 py-1.5 rounded-xl font-black uppercase text-[9px] shadow-sm transition-all bg-white hover:scale-105 active:scale-95 cursor-pointer text-slate-800 border border-slate-200 min-h-[36px]"
                 >
                   {tpl.title}
                 </button>
               ))}
             </div>
           </div>

           <form className="space-y-3.5 sm:space-y-4" onSubmit={async (e) => {
              e.preventDefault();
              const target = e.target as any;
              const baseDates = selectedDates.length > 0 ? selectedDates : [ymd(anchor)];
              
              let finalDates = [...baseDates];
              const weeksCount = formRepeats;
              
              if (weeksCount > 0) {
                const spawnedDates: string[] = [];
                for (const dateStr of baseDates) {
                  const baseDate = new Date(dateStr + "T00:00:00");
                  for (let w = 1; w <= weeksCount; w++) {
                    const nextDate = new Date(baseDate.getTime() + w * 7 * 86400000);
                    spawnedDates.push(ymd(nextDate));
                  }
                }
                finalDates = [...finalDates, ...spawnedDates];
              }

              const finalColor = formColor || getQuestColor(formTitle || target.title.value);

              await fetch('/api/events', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                  title: (formTitle || target.title.value).trim(),
                  location: (formLocation || target.location.value).trim(),
                  member_id: target.member.value || null,
                  color: finalColor,
                  dates: finalDates,
                  time_from: timeFrom,
                  time_to: timeTo,
                  category: formCategory
                })
              });
              
              toast.success(weeksCount > 0 ? `Routine scheduled for ${weeksCount} weeks!` : "Quest Logged!");
              onClearSelectedDates(); 
              onClose(); 
              onRefresh();
           }}>
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-3">Quest Title</span>
                <input 
                  name="title" 
                  required 
                  placeholder="Clean Bedroom, Soccer Practice..." 
                  className="w-full p-3.5 sm:p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none font-black text-base min-h-[48px]" 
                  value={formTitle} 
                  onChange={(e) => { setFormTitle(e.target.value); setFormColor(getQuestColor(e.target.value)); }} 
                />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-3">Location</span>
                <input 
                  name="location" 
                  placeholder="e.g. School, Sports Field, Backyard" 
                  className="w-full p-3.5 sm:p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-sm min-h-[48px]" 
                  value={formLocation} 
                  onChange={(e) => setFormLocation(e.target.value)} 
                />
              </div>
              
              {/* Times */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-3 flex items-center gap-1">
                    <Clock size={10} /> Time From
                  </span>
                  <input 
                    type="time" 
                    value={timeFrom} 
                    onChange={e => setTimeFrom(e.target.value)} 
                    className="w-full p-3 sm:p-3.5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none font-black text-sm text-slate-800 cursor-pointer min-h-[48px]" 
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-3 flex items-center gap-1">
                    <Clock size={10} /> Time To
                  </span>
                  <input 
                    type="time" 
                    value={timeTo} 
                    onChange={e => setTimeTo(e.target.value)} 
                    className="w-full p-3 sm:p-3.5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none font-black text-sm text-slate-800 cursor-pointer min-h-[48px]" 
                  />
                </div>
              </div>

              {/* Category & Recurrence */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-3">Category</span>
                  <select 
                    value={formCategory} 
                    onChange={e => setFormCategory(e.target.value)} 
                    className="w-full p-3.5 bg-slate-50 rounded-2xl font-black uppercase text-xs cursor-pointer border-2 border-transparent outline-none min-h-[48px]"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-3 truncate block">
                    Repeat on {weekdayName}s
                  </span>
                  <input 
                    type="number" 
                    min={0}
                    max={52}
                    value={formRepeats || ""} 
                    onChange={e => setFormRepeats(parseInt(e.target.value) || 0)} 
                    placeholder="0 (One-Time)" 
                    className="w-full p-3.5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none font-black text-sm text-slate-800 text-center min-h-[48px]"
                  />
                </div>
              </div>

              {/* Assignee & Color */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-3">Assign Hero</span>
                  <select 
                    name="member" 
                    className="w-full p-3.5 bg-slate-50 rounded-2xl font-black uppercase text-xs cursor-pointer border-2 border-transparent outline-none min-h-[48px]"
                  >
                    <option value="">Whole Family</option>
                    {memberList.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-3">Quest Color</span>
                  <select 
                    name="color" 
                    value={formColor} 
                    onChange={(e) => setFormColor(e.target.value)} 
                    className="w-full p-3.5 bg-slate-50 rounded-2xl font-black uppercase text-xs border-2 border-transparent outline-none cursor-pointer min-h-[48px]"
                  >
                    <option value="">Auto-Color</option>
                    {EVENT_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              
              <button 
                type="submit" 
                className="w-full bg-slate-900 hover:bg-indigo-600 active:scale-95 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 min-h-[48px]"
              >
                <Check size={20} /> LOG QUESTS
              </button>
           </form>
         </div>
       </div>
    </div>
  );
}
