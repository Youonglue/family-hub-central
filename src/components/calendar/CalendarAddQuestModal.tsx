// src/components/calendar/CalendarAddQuestModal.tsx
import { useState } from "react";
import { toast } from "sonner";
import { 
  X, 
  Check, 
  Clock, 
  Sparkles, 
  Paintbrush, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  RotateCcw,
  Loader2,
  Lock
} from "lucide-react";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDaysL = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d: Date) => { 
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate()); 
  const dow = (s.getDay() + 6) % 7; 
  return addDaysL(s, -dow); 
};
const startOfMonthGrid = (d: Date) => startOfWeek(new Date(d.getFullYear(), d.getMonth(), 1));

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const EVENT_COLORS = [
  { id: "#0284c7", name: "Sky Blue" },
  { id: "#e11d48", name: "Rose Red" },
  { id: "#d97706", name: "Amber Gold" },
  { id: "#059669", name: "Emerald Green" },
  { id: "#7c3aed", name: "Violet Purple" },
  { id: "#4f46e5", name: "Indigo Blue" },
  { id: "#ea580c", name: "Orange" },
  { id: "#0d9488", name: "Teal" },
];

const CATEGORIES = ["Work", "School", "Sports", "Fun", "Chores", "General"];

const QUEST_TEMPLATES = [
  { title: "🏢 Dad at Work", location: "Workplace", color: "#0284c7", category: "Work", time_from: "08:00", time_to: "17:00", tintTile: true },
  { title: "🎒 School Day", location: "School", color: "#d97706", category: "School", time_from: "08:30", time_to: "15:15", tintTile: true },
  { title: "⚽ Football Practice", location: "Sports Field", color: "#059669", category: "Sports", time_from: "17:30", time_to: "18:30", tintTile: false },
  { title: "🏊 Swim Class", location: "Pool", color: "#0d9488", category: "Sports", time_from: "10:00", time_to: "11:00", tintTile: false },
  { title: "🧹 Clean Room", location: "Bedroom", color: "#7c3aed", category: "Chores", time_from: "11:00", time_to: "11:30", tintTile: false },
  { title: "🍿 Movie Night", location: "Living Room", color: "#e11d48", category: "Fun", time_from: "19:00", time_to: "21:00", tintTile: false },
];

export function CalendarAddQuestModal({ 
  anchor, 
  selectedDates: initialSelectedDates = [], 
  memberList, 
  existingRoutines = [],
  onClose, 
  onRefresh, 
  onClearSelectedDates 
}: any) {
  const [formTitle, setFormTitle] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formCategory, setFormCategory] = useState("Work");
  const [formMemberId, setFormMemberId] = useState("");
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tint Tile Switch Defaults to FALSE (Off)
  const [tintTile, setTintTile] = useState(false);

  // Find colors already in use by active routines to gray them out
  const usedColors = new Set(existingRoutines.map((r: any) => r.color?.toLowerCase()));
  
  // Pick the first available unused color as default
  const defaultAvailableColor = EVENT_COLORS.find(c => !usedColors.has(c.id.toLowerCase()))?.id || "#0284c7";
  const [formColor, setFormColor] = useState(defaultAvailableColor);

  const [customMultiDates, setCustomMultiDates] = useState<string[]>(() => {
    return initialSelectedDates.length > 0 ? initialSelectedDates : [ymd(anchor || new Date())];
  });

  const [pickerDate, setPickerDate] = useState<Date>(() => new Date(anchor || new Date()));

  const handleApplyTemplate = (tpl: any) => {
    setFormTitle(tpl.title);
    setFormLocation(tpl.location);
    if (!usedColors.has(tpl.color.toLowerCase())) {
      setFormColor(tpl.color);
    }
    setFormCategory(tpl.category || "General");
    if (tpl.time_from) setTimeFrom(tpl.time_from);
    if (tpl.time_to) setTimeTo(tpl.time_to);
    if (tpl.tintTile !== undefined) setTintTile(tpl.tintTile);
    toast.success(`Loaded "${tpl.title}" preset!`);
  };

  const toggleDateSelection = (dateKey: string) => {
    setCustomMultiDates((prev) => 
      prev.includes(dateKey) ? prev.filter((d) => d !== dateKey) : [...prev, dateKey]
    );
  };

  const gridStart = startOfMonthGrid(pickerDate);
  const monthDays = Array.from({ length: 42 }, (_, i) => addDaysL(gridStart, i));

  const selectAllWeekdayInCurrentMonth = (weekdayIndex: number) => {
    const datesToAdd: string[] = [];
    for (let day = 1; day <= 31; day++) {
      const d = new Date(pickerDate.getFullYear(), pickerDate.getMonth(), day);
      if (d.getMonth() === pickerDate.getMonth() && d.getDay() === weekdayIndex) {
        datesToAdd.push(ymd(d));
      }
    }
    setCustomMultiDates(prev => Array.from(new Set([...prev, ...datesToAdd])));
    toast.success(`Selected matching weekdays in ${MONTHS[pickerDate.getMonth()]}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error("Please enter a quest or shift title");
      return;
    }

    const finalDates = customMultiDates.length > 0 ? customMultiDates : [ymd(anchor || new Date())];
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          location: formLocation.trim(),
          member_id: formMemberId ? formMemberId : null,
          color: formColor,
          tile_color: tintTile ? formColor : null,
          is_recurring: tintTile ? 1 : 0,
          dates: finalDates,
          time_from: timeFrom,
          time_to: timeTo,
          category: formCategory
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Only Admins can schedule quests");
      }

      toast.success(tintTile ? `Shift Tinted on ${finalDates.length} days! 🎨` : "Quest Logged!");
      
      if (onClearSelectedDates) onClearSelectedDates();
      if (onRefresh) onRefresh();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule quest");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-md p-3 sm:p-4 overflow-y-auto" onClick={onClose}>
       <div className="w-full max-w-2xl bg-white rounded-3xl sm:rounded-[3.5rem] p-5 sm:p-8 shadow-2xl border-4 sm:border-8 border-slate-50 animate-in zoom-in-95 duration-200 flex flex-col max-h-[94vh] my-auto" onClick={e => e.stopPropagation()}>
         
         <div className="flex justify-between items-center mb-4 shrink-0 border-b border-slate-100 pb-3">
           <div>
             <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-slate-900 leading-tight">
               Schedule Quest & Shift
             </h2>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
               Admin Schedule Console
             </p>
           </div>
           <button 
             type="button"
             onClick={onClose} 
             className="p-2.5 bg-slate-100 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
           >
             <X size={18} />
           </button>
         </div>
         
         <div className="overflow-y-auto pr-1 space-y-4 sm:space-y-5 flex-1 scrollbar-thin">
           
           {/* Quick Routine Presets */}
           <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
             <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1">
               <Sparkles size={12} /> One-Tap Presets:
             </span>
             <div className="flex flex-wrap gap-1.5">
               {QUEST_TEMPLATES.map((tpl) => (
                 <button 
                   type="button"
                   key={tpl.title}
                   onClick={() => handleApplyTemplate(tpl)}
                   className="px-3 py-1.5 rounded-xl font-black uppercase text-[9px] shadow-xs transition-all bg-white hover:scale-105 active:scale-95 cursor-pointer text-slate-800 border border-slate-200 min-h-[34px]"
                 >
                   {tpl.title}
                 </button>
               ))}
             </div>
           </div>

           <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-3">Quest / Shift Title</span>
                <input 
                  required 
                  placeholder="e.g. 🏢 Dad at Work, ⚽ Football, 🎒 School" 
                  className="w-full p-3.5 sm:p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none font-black text-base min-h-[48px]" 
                  value={formTitle} 
                  onChange={(e) => setFormTitle(e.target.value)} 
                />
              </div>

              {/* TINT ENTIRE DAY TILE TOGGLE (Defaults to OFF) */}
              <div className="p-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl flex items-center justify-between gap-3 select-none">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl text-white transition-colors ${tintTile ? "bg-indigo-600" : "bg-slate-300"}`}>
                    <Paintbrush size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-tight text-slate-900 block">
                      Tint Entire Day Tile
                    </span>
                    <span className="text-[9px] font-bold text-slate-500">
                      Colors the date background (Title appears in the sidebar key only)
                    </span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tintTile}
                    onChange={(e) => setTintTile(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* MINI MULTI-MONTH YEAR DATE PICKER (Active when Tint is on or choosing dates) */}
              {tintTile && (
                <div className="bg-slate-50 p-4 rounded-3xl border-2 border-indigo-100 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarIcon size={16} className="text-indigo-600" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Select Shift Dates
                      </span>
                    </div>
                    
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-white border border-indigo-200 px-2.5 py-1 rounded-xl shadow-xs">
                      {customMultiDates.length} {customMultiDates.length === 1 ? "Date" : "Dates"} Selected
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-white px-3 py-2 rounded-2xl border border-slate-200 shadow-xs">
                    <button
                      type="button"
                      onClick={() => setPickerDate(new Date(pickerDate.getFullYear(), pickerDate.getMonth() - 1, 1))}
                      className="p-1.5 hover:bg-slate-100 rounded-xl transition-all cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                      {MONTHS[pickerDate.getMonth()]} {pickerDate.getFullYear()}
                    </span>

                    <button
                      type="button"
                      onClick={() => setPickerDate(new Date(pickerDate.getFullYear(), pickerDate.getMonth() + 1, 1))}
                      className="p-1.5 hover:bg-slate-100 rounded-xl transition-all cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black uppercase tracking-wider text-slate-400">
                    <span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span>
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {monthDays.map(d => {
                      const key = ymd(d);
                      const isSelected = customMultiDates.includes(key);
                      const isCurrentMonth = d.getMonth() === pickerDate.getMonth();

                      return (
                        <button
                          type="button"
                          key={key}
                          onClick={() => toggleDateSelection(key)}
                          className={`h-9 sm:h-10 rounded-xl text-xs font-black transition-all flex items-center justify-center cursor-pointer select-none active:scale-90 ${
                            isSelected
                              ? "bg-indigo-600 text-white shadow-md scale-105 ring-2 ring-indigo-300"
                              : isCurrentMonth
                              ? "bg-white text-slate-800 border border-slate-200/80 hover:bg-indigo-50"
                              : "bg-transparent text-slate-300 opacity-40 hover:opacity-80"
                          }`}
                        >
                          {d.getDate()}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => setCustomMultiDates([])}
                      className="text-[9px] font-black uppercase tracking-wider text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw size={10} /> Clear Dates
                    </button>

                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map(dayNum => (
                        <button
                          key={dayNum}
                          type="button"
                          onClick={() => selectAllWeekdayInCurrentMonth(dayNum)}
                          className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[8px] font-black uppercase text-slate-600 cursor-pointer"
                          title={`Select all in ${MONTHS[pickerDate.getMonth()]}`}
                        >
                          +{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][dayNum]}s
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Location Input */}
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-3">Location</span>
                <input 
                  placeholder="e.g. Office, Sports Field, School" 
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
                    className="w-full p-3 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none font-black text-sm text-slate-800 cursor-pointer min-h-[44px]" 
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
                    className="w-full p-3 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none font-black text-sm text-slate-800 cursor-pointer min-h-[44px]" 
                  />
                </div>
              </div>

              {/* Assignee, Category & Color Palette (With Greyed-Out In-Use Colors) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-3">Assign Hero</span>
                  <select 
                    value={formMemberId}
                    onChange={(e) => setFormMemberId(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 rounded-2xl font-black uppercase text-xs cursor-pointer border-2 border-transparent outline-none min-h-[44px]"
                  >
                    <option value="">Whole Family</option>
                    {memberList.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-3">Category</span>
                  <select 
                    value={formCategory} 
                    onChange={e => setFormCategory(e.target.value)} 
                    className="w-full p-3.5 bg-slate-50 rounded-2xl font-black uppercase text-xs cursor-pointer border-2 border-transparent outline-none min-h-[44px]"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                
                {/* Tile Color Picker (Locks out colors already assigned to routines) */}
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-3">Tile Color</span>
                  <select 
                    name="color" 
                    value={formColor} 
                    onChange={(e) => setFormColor(e.target.value)} 
                    className="w-full p-3.5 bg-slate-50 rounded-2xl font-black uppercase text-xs border-2 border-transparent outline-none cursor-pointer min-h-[44px]"
                  >
                    {EVENT_COLORS.map(c => {
                      const isAlreadyUsed = usedColors.has(c.id.toLowerCase());
                      return (
                        <option 
                          key={c.id} 
                          value={c.id} 
                          disabled={isAlreadyUsed}
                          className={isAlreadyUsed ? "text-slate-300 bg-slate-100 italic" : ""}
                        >
                          {c.name} {isAlreadyUsed ? "(In Use - Locked)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={isSubmitting || !formTitle.trim()}
                className="w-full bg-slate-900 hover:bg-indigo-600 active:scale-95 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 min-h-[48px] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin size-5" /> SAVING...
                  </>
                ) : (
                  <>
                    <Check size={20} /> SCHEDULE ON {customMultiDates.length} {customMultiDates.length === 1 ? 'DAY' : 'DAYS'}
                  </>
                )}
              </button>
           </form>
         </div>
       </div>
    </div>
  );
}
