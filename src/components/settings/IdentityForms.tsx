// src/components/settings/IdentityForms.tsx
import { useState } from "react";
import { toast } from "sonner";
import { User, ShieldCheck, KeyRound, Check } from "lucide-react";

interface IdentityFormsProps {
  hasPin: boolean;
  onPinChanged: () => void;
  onUsernameChanged: () => void;
}

export function IdentityForms({ hasPin, onPinChanged, onUsernameChanged }: IdentityFormsProps) {
  // --- FORM STATES ---
  const [newUsername, setNewUsername] = useState("");
  const [unamePwd, setUnamePwd] = useState("");
  const [updatingUsername, setUpdatingUsername] = useState(false);

  const [curPwd, setCurPwd] = useState("");
  const [nextPwd, setNextPwd] = useState("");
  const [nextPwd2, setNextPwd2] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [pinPwd, setPinPwd] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPin2, setNewPin2] = useState("");
  const [updatingPin, setUpdatingPin] = useState(false);

  // --- ACTIONS ---
  async function handleChangeUsername(e: React.FormEvent) {
    e.preventDefault();
    setUpdatingUsername(true);
    try {
      const res = await fetch("/api/auth/change-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: unamePwd, newUsername: newUsername.trim() })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update username");

      toast.success("Hero Identity updated successfully!");
      setNewUsername(""); 
      setUnamePwd("");
      onUsernameChanged();
    } catch (err) { 
      toast.error((err as Error).message || "Failed to update username"); 
    } finally {
      setUpdatingUsername(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (nextPwd !== nextPwd2) { 
      toast.error("New passwords do not match"); 
      return; 
    }
    if (nextPwd.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }

    setUpdatingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: curPwd, newPassword: nextPwd })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");

      toast.success("Password updated successfully!");
      setCurPwd(""); 
      setNextPwd(""); 
      setNextPwd2("");
    } catch (err) { 
      toast.error((err as Error).message || "Failed to update password"); 
    } finally {
      setUpdatingPassword(false);
    }
  }

  async function handleSetPin(e: React.FormEvent) {
    e.preventDefault();
    const p1 = newPin.trim();
    const p2 = newPin2.trim();

    if (p1.length !== 6 || p2.length !== 6) {
      toast.error("PIN must be exactly 6 digits");
      return;
    }

    if (p1 !== p2) { 
      toast.error("PIN mismatch: Confirmation code does not match"); 
      return; 
    }
    
    setUpdatingPin(true);
    try {
      const res = await fetch("/api/auth/set-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: p1, currentPassword: pinPwd })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save PIN code");

      toast.success(hasPin ? "Admin PIN updated successfully!" : "Admin PIN initialized!");
      setPinPwd(""); 
      setNewPin(""); 
      setNewPin2("");
      onPinChanged();
    } catch (err) { 
      toast.error((err as Error).message || "Failed to save PIN code"); 
    } finally {
      setUpdatingPin(false);
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      
      {/* 1. CHANGE USERNAME FORM */}
      <section className="rounded-3xl sm:rounded-[3rem] border-2 sm:border-4 border-slate-50 bg-white p-5 sm:p-8 shadow-sm">
        <div className="mb-4 sm:mb-6 flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <User className="size-5" />
          </div>
          <div>
            <h2 className="font-display text-base sm:text-lg font-black uppercase italic tracking-tight text-slate-900">Hero Identity</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Change Admin Login Username</p>
          </div>
        </div>
        <form onSubmit={handleChangeUsername} className="space-y-3 sm:space-y-4">
          <input 
            value={newUsername} 
            onChange={(e) => setNewUsername(e.target.value)} 
            placeholder="New Admin Username" 
            required
            className="w-full rounded-2xl bg-slate-50 p-4 text-sm font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all min-h-[48px]" 
          />
          <input 
            type="password" 
            value={unamePwd} 
            onChange={(e) => setUnamePwd(e.target.value)} 
            placeholder="Verify Current Password" 
            required
            className="w-full rounded-2xl bg-slate-50 p-4 text-sm font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all min-h-[48px]" 
          />
          <button 
            type="submit" 
            disabled={updatingUsername}
            className="w-full rounded-2xl bg-slate-900 py-4 text-xs font-black uppercase text-white shadow-lg hover:bg-indigo-600 active:scale-95 transition-all cursor-pointer min-h-[48px] disabled:opacity-50"
          >
            {updatingUsername ? "Updating..." : "Update Identity"}
          </button>
        </form>
      </section>

      {/* 2. CHANGE PASSWORD FORM */}
      <section className="rounded-3xl sm:rounded-[3rem] border-2 sm:border-4 border-slate-50 bg-white p-5 sm:p-8 shadow-sm">
        <div className="mb-4 sm:mb-6 flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <KeyRound className="size-5" />
          </div>
          <div>
            <h2 className="font-display text-base sm:text-lg font-black uppercase italic tracking-tight text-slate-900">Security Password</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Update your login credentials</p>
          </div>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-3 sm:space-y-4">
          <input 
            type="password" 
            value={curPwd} 
            onChange={(e) => setCurPwd(e.target.value)} 
            placeholder="Current Password (Optional if PIN verified)" 
            className="w-full rounded-2xl bg-slate-50 p-4 text-sm font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all min-h-[48px]" 
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <input 
              type="password" 
              value={nextPwd} 
              onChange={(e) => setNextPwd(e.target.value)} 
              placeholder="New Password" 
              required
              className="w-full rounded-2xl bg-slate-50 p-4 text-sm font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all min-h-[48px]" 
            />
            <input 
              type="password" 
              value={nextPwd2} 
              onChange={(e) => setNextPwd2(e.target.value)} 
              placeholder="Confirm New Password" 
              required
              className="w-full rounded-2xl bg-slate-50 p-4 text-sm font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all min-h-[48px]" 
            />
          </div>
          <button 
            type="submit" 
            disabled={updatingPassword}
            className="w-full rounded-2xl bg-slate-900 py-4 text-xs font-black uppercase text-white shadow-lg hover:bg-indigo-600 active:scale-95 transition-all cursor-pointer min-h-[48px] disabled:opacity-50"
          >
            {updatingPassword ? "Saving..." : "Save New Password"}
          </button>
        </form>
      </section>

      {/* 3. CHANGE ADMIN PIN FORM */}
      <section className="rounded-3xl sm:rounded-[3rem] border-2 sm:border-4 border-slate-50 bg-white p-5 sm:p-8 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h2 className="font-display text-base sm:text-lg font-black uppercase italic tracking-tight text-slate-900">
              {hasPin ? "Update Admin PIN" : "Initialize PIN"}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">6-Digit Rapid Kiosk Elevation Code</p>
          </div>
        </div>
        <form onSubmit={handleSetPin} className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-3">New 6-Digit PIN</label>
              <input 
                type="password" 
                inputMode="numeric" 
                value={newPin} 
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} 
                placeholder="000000" 
                required 
                maxLength={6} 
                className="w-full rounded-2xl bg-slate-50 p-4 text-center text-2xl tracking-[0.4em] font-black outline-none border-2 border-transparent focus:border-indigo-500 min-h-[48px]" 
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-3">Confirm 6-Digit PIN</label>
              <input 
                type="password" 
                inputMode="numeric" 
                value={newPin2} 
                onChange={(e) => setNewPin2(e.target.value.replace(/\D/g, ""))} 
                placeholder="000000" 
                required 
                maxLength={6} 
                className="w-full rounded-2xl bg-slate-50 p-4 text-center text-2xl tracking-[0.4em] font-black outline-none border-2 border-transparent focus:border-indigo-500 min-h-[48px]" 
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={updatingPin || newPin.length !== 6 || newPin2.length !== 6}
            className="w-full rounded-2xl bg-indigo-600 py-4 text-xs font-black uppercase text-white shadow-lg hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer min-h-[48px] disabled:opacity-40"
          >
            {updatingPin ? "Saving..." : "Save Security Code"}
          </button>
        </form>
      </section>
    </div>
  );
}
