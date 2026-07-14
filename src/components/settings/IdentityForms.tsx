import { useState } from "react";
import { toast } from "sonner";
import { changePassword, changeUsername, setPin } from "@/lib/auth-client";
import { User, ShieldCheck, KeyRound } from "lucide-react";

interface IdentityFormsProps {
  hasPin: boolean;
  onPinChanged: () => void;
  onUsernameChanged: () => void;
}

export function IdentityForms({ hasPin, onPinChanged, onUsernameChanged }: IdentityFormsProps) {
  // --- FORM STATES ---
  const [newUsername, setNewUsername] = useState("");
  const [unamePwd, setUnamePwd] = useState("");

  const [curPwd, setCurPwd] = useState("");
  const [nextPwd, setNextPwd] = useState("");
  const [nextPwd2, setNextPwd2] = useState("");

  const [pinPwd, setPinPwd] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPin2, setNewPin2] = useState("");

  // --- ACTIONS ---
  async function handleChangeUsername(e: React.FormEvent) {
    e.preventDefault();
    try {
      await changeUsername(unamePwd, newUsername.trim());
      toast.success("Username updated successfully!");
      setNewUsername(""); 
      setUnamePwd("");
      onUsernameChanged();
    } catch (err) { 
      toast.error((err as Error).message || "Failed to update username"); 
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (nextPwd !== nextPwd2) { 
      toast.error("New passwords do not match"); 
      return; 
    }
    try {
      await changePassword(curPwd, nextPwd);
      toast.success("Password updated successfully!");
      setCurPwd(""); 
      setNextPwd(""); 
      setNextPwd2("");
    } catch (err) { 
      toast.error((err as Error).message || "Failed to update password"); 
    }
  }

  async function handleSetPin(e: React.FormEvent) {
    e.preventDefault();
    const p1 = newPin.trim();
    const p2 = newPin2.trim();

    if (p1 !== p2) { 
      toast.error("PINs mismatch: confirmation code does not match"); 
      return; 
    }
    
    try {
      await setPin(pinPwd, p1);
      toast.success(hasPin ? "Admin PIN updated!" : "Admin PIN initialized!");
      setPinPwd(""); 
      setNewPin(""); 
      setNewPin2("");
      onPinChanged();
    } catch (err) { 
      toast.error((err as Error).message || "Failed to save PIN code"); 
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 1. CHANGE USERNAME FORM */}
      <section className="rounded-[3rem] border-4 border-slate-50 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <User className="size-5 text-indigo-500" />
          <h2 className="font-display text-lg font-black uppercase italic">Hero Identity</h2>
        </div>
        <form onSubmit={handleChangeUsername} className="space-y-4">
          <input 
            value={newUsername} 
            onChange={(e) => setNewUsername(e.target.value)} 
            placeholder="New Hero Name" 
            required
            className="w-full rounded-2xl bg-slate-50 p-4 text-sm font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all" 
          />
          <input 
            type="password" 
            value={unamePwd} 
            onChange={(e) => setUnamePwd(e.target.value)} 
            placeholder="Verify Password" 
            required
            className="w-full rounded-2xl bg-slate-50 p-4 text-sm font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all" 
          />
          <button type="submit" className="w-full rounded-2xl bg-slate-900 py-4 text-xs font-black uppercase text-white shadow-lg hover:bg-indigo-600 transition-all cursor-pointer">
            Update Identity
          </button>
        </form>
      </section>

      {/* 2. CHANGE PASSWORD FORM */}
      <section className="rounded-[3rem] border-4 border-slate-50 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <KeyRound className="size-5 text-indigo-500" />
          <h2 className="font-display text-lg font-black uppercase italic">Security Password</h2>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <input 
            type="password" 
            value={curPwd} 
            onChange={(e) => setCurPwd(e.target.value)} 
            placeholder="Current Password" 
            required
            className="w-full rounded-2xl bg-slate-50 p-4 text-sm font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all" 
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input 
              type="password" 
              value={nextPwd} 
              onChange={(e) => setNextPwd(e.target.value)} 
              placeholder="New Password" 
              required
              className="w-full rounded-2xl bg-slate-50 p-4 text-sm font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all" 
            />
            <input 
              type="password" 
              value={nextPwd2} 
              onChange={(e) => setNextPwd2(e.target.value)} 
              placeholder="Confirm New Password" 
              required
              className="w-full rounded-2xl bg-slate-50 p-4 text-sm font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all" 
            />
          </div>
          <button type="submit" className="w-full rounded-2xl bg-slate-900 py-4 text-xs font-black uppercase text-white shadow-lg hover:bg-indigo-600 transition-all cursor-pointer">
            Save New Password
          </button>
        </form>
      </section>

      {/* 3. CHANGE ADMIN PIN FORM */}
      <section className="rounded-[3rem] border-4 border-slate-50 bg-white p-8 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="size-5 text-indigo-500" />
          <h2 className="font-display text-lg font-black uppercase italic">{hasPin ? "Update Admin PIN" : "Initialize PIN"}</h2>
        </div>
        <form onSubmit={handleSetPin} className="space-y-4">
          <input 
            type="password" 
            value={pinPwd} 
            onChange={(e) => setPinPwd(e.target.value)} 
            placeholder="Verify Password" 
            required 
            className="w-full rounded-2xl bg-slate-50 p-4 text-sm font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all" 
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-4">New PIN</label>
              <input 
                type="password" 
                inputMode="numeric" 
                value={newPin} 
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} 
                placeholder="000000" 
                required 
                maxLength={6} 
                className="w-full rounded-2xl bg-slate-50 p-4 text-center text-2xl tracking-[0.5em] font-black outline-none border-2 border-transparent focus:border-indigo-500" 
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-4">Confirm PIN</label>
              <input 
                type="password" 
                inputMode="numeric" 
                value={newPin2} 
                onChange={(e) => setNewPin2(e.target.value.replace(/\D/g, ""))} 
                placeholder="000000" 
                required 
                maxLength={6} 
                className="w-full rounded-2xl bg-slate-50 p-4 text-center text-2xl tracking-[0.5em] font-black outline-none border-2 border-transparent focus:border-indigo-500" 
              />
            </div>
          </div>
          
          <button type="submit" className="w-full rounded-2xl bg-indigo-600 py-4 text-xs font-black uppercase text-white shadow-lg hover:bg-indigo-700 transition-all cursor-pointer">
            Save Security Code
          </button>
        </form>
      </section>
    </div>
  );
}
