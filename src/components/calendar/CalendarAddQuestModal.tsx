import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Check } from "lucide-react";

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
  { title: "🧹 Clean Room", location: "Bedroom", color: getQuestColor("Clean Room"), category: "Chores" },
  { title: "📚 Homework", location: "Study", color: getQuestColor("Homework"), category: "School" },
  { title: "🍿 Movie Night", location: "Living Room", color: getQuestColor("Movie Night"), category: "Fun" },
  { title: "🍽️ Family Dinner", location: "Kitchen", color: getQuestColor("Family Dinner"), category: "General" },
  { title: "🏊 Swim Class", location: "Pool", color: getQuestColor("Swim Class"), category: "Sports" },
  { title: "🦷 Dentist Visit", location: "Clinic", color: getQuestColor("Dentist Visit"), category: "General" },
  { title: "🎂 Birthday Party", location: "Party Hall", color: getQuestColor("Birthday Party"), category: "Fun" },
  { title: "🛒 Grocery Run", location: "Supermarket", color: getQuestColor("Grocery Run"), category: "General" },
];

export function CalendarAddQuestModal({ anchor, selectedDates, memberList, onClose, onRefresh, onClearSelectedDates }: any) {
  const [formTitle, setFormTitle] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formColor, setFormColor] = useState("");
  
  // Custom states
  const [formCategory, setFormCategory] = useState("General");
  
  // Changed repeats state to a flexible number state (defaults to 0 for no repeats)
  const [formRepeats, setFormRepeats] = useState<number>(0);
  
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");

  // Get active weekday name based on currently selected date
  const activeDate = selectedDates.length > 0 ? new Date(selectedDates[0] + "T00:00:00") : anchor;
  const weekdayName = activeDate.toLocaleDateString(undefined, { weekday: "long" });

  const handleApplyTemplate = (tpl: any) => {
    setFormTitle(tpl.title);
    setFormLocation(tpl.location);
    setFormColor(tpl.color);
    setFormCategory(tpl.category || "General");
    toast.success(`Loaded "${tpl.title.split(" ").slice(1).join(" ")}" template!`);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-md p-4" onClick={onClose}>
       <div className="w-full max-w-xl bg-white rounded-[2.5rem] sm:rounded-[4rem] p-6 sm:p-10 shadow-2xl border-4 sm:border-[12px] border-slate-50 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
         
         <div className="flex justify-between items-center mb-6 shrink-0">
           <h2 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">New Quest</h2>
           <button onClick={onClose} className="p-3 bg-slate-100 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-all cursor-pointer"><X /></button>
         </div>
         
         <div className="overflow-y-auto pr-2 space-y-6 flex-1 custom-scrollbar">
           
           {/* Quick-Quest Templates */}
           <div className="p-4 bg-slate-50 rounded-3xl border-2 border-slate-100 flex flex-wrap gap-2">
             {QUEST_TEMPLATES.map((tpl) => (
               <button 
                 type="button"
                 key={tpl.title}
                 onClick={() => handleApplyTemplate(tpl)}
                 className="px-4 py-2.5 rounded-xl font-bold uppercase text-[10px] shadow-sm transition-all bg-white hover:scale-105 cursor-pointer text-slate-800 border border-slate-200"
               >
                 {tpl.title}
               </button>
             ))}
           </div>

           <form className="space-y-4" onSubmit={async (e) => {
              e.preventDefault();
              const target = e.target as any;
              const baseDates = selectedDates.length > 0 ? selectedDates : [ymd(anchor)];
              
              // Spawner: Calculate future weekly dates dynamically based on your custom number input
              let finalDates = [...baseDates];
              const weeksCount = formRepeats; // E.g. 7 or 32 weeks
              
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

              // Determine final color
              const finalColor = formColor || getQuestColor(formTitle || target.title.value);

              await fetch('/api/events', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                  title: (formTitle || target.title.value).trim(),
                  location: (formLocation || target.location.value).trim(),
                  member_id: target.member.value || null,
                  color: finalColor,
                  dates: finalDates, // Passes the full array of spawned dates
                  time_from: timeFrom,
                  time_to: timeTo,
                  category: formCategory
                })
              });
              
              toast.success(weeksCount > 0 ? `Weekly Series Scheduled for ${weeksCount} Weeks!` : "Quest Logged!");
              onClearSelectedDates(); 
              onClose(); 
              onRefresh();
           }}>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Quest Name</span>
                <input name="title" required placeholder="Clean Bedroom, Soccer Practice..." className="w-full p-5 bg-slate-50 rounded-2xl border-4 border-transparent focus:border-indigo-500 outline-none font-black text-lg" value={formTitle} onChange={(e) => { setFormTitle(e.target.value); setFormColor(getQuestColor(e.target.value)); }} />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Location</span>
                <input name="location" placeholder="e.g. Backyard, School" className="w-full p-5 bg-slate-50 rounded-2xl border-4 border-transparent focus:border-indigo-500 outline-none font-bold text-sm" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} />
              </div>
              
              {/* Start and End Time Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Time From</span>
                  <input type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-4 border-transparent focus:border-indigo-500 outline-none font-black text-sm text-slate-700 cursor-pointer" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Time To</span>
                  <input type="time" value={timeTo} onChange={e => setTimeTo(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-4 border-transparent focus:border-indigo-500 outline-none font-black text-sm text-slate-700 cursor-pointer" />
                </div>
              </div>

              {/* Dynamic Categories & Custom Number Input (Padded for mobile/tablet) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Category</span>
                  <select value={formCategory} onChange={e => setFormCategory(e.target.value)} className="w-full p-4.5 bg-slate-50 rounded-2xl font-black uppercase text-xs cursor-pointer border-4 border-transparent outline-none">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                
                {/* Custom Number Input (Oversized touch targets) */}
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">
                    Repeat on {weekdayName}s (Weeks)
                  </span>
                  <input 
                    type="number" 
                    min={0}
                    max={100}
                    value={formRepeats || ""} 
                    onChange={e => setFormRepeats(parseInt(e.target.value) || 0)} 
                    placeholder="0 (One-Time Quest)" 
                    className="w-full p-4 bg-slate-50 rounded-2xl border-4 border-transparent focus:border-indigo-500 outline-none font-black text-sm text-slate-700 text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Assignee</span>
                  <select name="member" className="w-full p-4.5 bg-slate-50 rounded-2xl font-black uppercase text-xs cursor-pointer border-4 border-transparent outline-none">
                    <option value="">Whole Family</option>
                    {memberList.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                
                {/* Unlocked Custom Color Selector Dropdown */}
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Quest Color</span>
                  <select 
                    name="color" 
                    value={formColor} 
                    onChange={(e) => setFormColor(e.target.value)} 
                    className="w-full p-4.5 bg-slate-50 rounded-2xl font-black uppercase text-xs border-4 border-transparent outline-none cursor-pointer"
                  >
                    <option value="">-- Hashed Auto-Color --</option>
                    {EVENT_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              
              <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-xl shadow-2xl hover:bg-indigo-600 transition-all active:scale-95 flex items-center justify-center gap-3 cursor-pointer mt-4 min-h-[48px]">
                <Check size={24} /> LOG QUESTS
              </button>
           </form>
         </div>
       </div>
    </div>
  );
}
