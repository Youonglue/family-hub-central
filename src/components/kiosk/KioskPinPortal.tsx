// src/components/kiosk/KioskPinPortal.tsx
import React, { useState } from "react";
import { ShieldCheck, RefreshCcw, X, KeyRound } from "lucide-react";
import { toast } from "sonner";

interface KioskPinPortalProps {
  adminUsers: any[];
  memberList: any[];
  selectedAdmin: any;
  setSelectedAdmin: (admin: any) => void;
  pinInput: string;
  onPinKeyPress: (digit: string) => void;
  onPinBackspace: () => void;
  onVerifyPin: (e?: React.FormEvent) => void;
  isSubmittingPin: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
}

export function KioskPinPortal({
  adminUsers,
  memberList,
  selectedAdmin,
  setSelectedAdmin,
  pinInput,
  onPinKeyPress,
  onPinBackspace,
  onVerifyPin,
  isSubmittingPin,
  onClose
}: KioskPinPortalProps) {
  // Mode switcher: "pin" | "password" (Account creation moved to Admin Settings only)
  const [authMode, setAuthMode] = useState<"pin" | "password">("pin");

  // Password Login State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const isSelectedAdminNeedsSetup = selectedAdmin && (!selectedAdmin.pin_hash || selectedAdmin.needs_pin_setup === 1);

  // Handle Standard Password Login on Kiosk Bar
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setIsSubmittingForm(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid username or password");

      toast.success(`Welcome back, ${username}! 🛡️`, { position: "top-center" });
      onClose();
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setIsSubmittingForm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-3xl sm:rounded-[3.5rem] border-4 sm:border-8 border-slate-50 p-5 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200 relative my-auto max-h-[95vh] overflow-y-auto">
        
        {/* Close Modal Button */}
        <button 
          type="button"
          onClick={onClose} 
          className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-full transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* 1. PASSWORD LOGIN MODE (Accessible directly on Kiosk) */}
        {authMode === "password" ? (
          <form onSubmit={handlePasswordLogin} className="space-y-4 text-center py-2 animate-in fade-in duration-200">
            <div className="size-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <KeyRound size={28} />
            </div>
            <h3 className="text-2xl font-black uppercase italic tracking-tight text-slate-900">
              Admin Password Login
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Log in with full username & password
            </p>

            <div className="space-y-2.5 text-left pt-2">
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Admin Username"
                className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-black outline-none focus:border-indigo-500 min-h-[48px]"
                autoFocus
              />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-black outline-none focus:border-indigo-500 min-h-[48px]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingForm}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all cursor-pointer min-h-[48px] disabled:opacity-50"
            >
              {isSubmittingForm ? "Signing in..." : "Sign In with Password"}
            </button>

            <div className="pt-2 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => setAuthMode("pin")}
                className="text-[10px] font-black uppercase tracking-wider text-indigo-600 hover:underline cursor-pointer"
              >
                ← Back to 6-Digit PIN Keypad
              </button>
            </div>
          </form>
        ) : (
          /* 2. DEFAULT 6-DIGIT QUICK-PIN MODE */
          !selectedAdmin ? (
            <div className="space-y-4 sm:space-y-6 text-center py-2 sm:py-4">
              <ShieldCheck className="size-12 sm:size-16 text-indigo-500 animate-bounce mx-auto" />
              <div>
                <h3 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter text-slate-900">Select Administrator</h3>
                <p className="text-slate-400 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest mt-1">Choose account to elevate session</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-2">
                {adminUsers.map((u: any) => {
                  const associatedHero = memberList.find(m => m.user_id === u.id || m.name?.toLowerCase() === u.username?.toLowerCase());
                  const needsSetup = !u.pin_hash || u.needs_pin_setup === 1;

                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelectedAdmin(u)}
                      className="group p-4 sm:p-5 bg-slate-50 hover:bg-indigo-50 border-2 border-slate-100 hover:border-indigo-200 rounded-3xl flex flex-col items-center gap-2 sm:gap-3 transition-all cursor-pointer min-h-[110px] justify-center active:scale-95 relative"
                    >
                      {needsSetup && (
                        <span className="absolute top-2 right-2 bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                          New
                        </span>
                      )}
                      
                      <div 
                        className="size-12 sm:size-16 rounded-2xl flex items-center justify-center text-white text-2xl sm:text-3xl font-black uppercase shadow-md group-hover:scale-105 transition-transform"
                        style={{ backgroundColor: associatedHero?.avatar_color || '#334155' }}
                      >
                        {u.username[0]}
                      </div>
                      <span className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider truncate max-w-full">{u.username}</span>
                    </button>
                  );
                })}
              </div>

              {/* Password Login Option on Kiosk Bar */}
              <div className="pt-3 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => setAuthMode("password")}
                  className="text-[10px] font-black uppercase tracking-wider text-indigo-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <KeyRound size={12} /> Log in with Username & Password
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6 text-center">
              <div className="flex items-center justify-start">
                <button 
                  type="button"
                  onClick={() => setSelectedAdmin(null)} 
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer min-h-[44px]"
                >
                  <RefreshCcw size={12} /> Back
                </button>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black uppercase italic tracking-tighter text-slate-900 leading-tight">
                  {isSelectedAdminNeedsSetup 
                    ? `Create 6-Digit PIN for ${selectedAdmin.username}` 
                    : `Enter PIN for ${selectedAdmin.username}`}
                </h3>
                <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1">
                  {isSelectedAdminNeedsSetup 
                    ? "First-time setup: Type 6 digits to initialize your Admin code" 
                    : "Type your 6-digit access code"}
                </p>
              </div>

              {/* PIN Indicator Dots */}
              <div className="flex justify-center gap-2 sm:gap-3 py-1 sm:py-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`size-3.5 sm:size-4 rounded-full border-2 transition-all ${
                      pinInput.length > i ? 'bg-indigo-600 border-indigo-500 scale-110 shadow-sm' : 'bg-slate-100 border-slate-200'
                    }`}
                  />
                ))}
              </div>

              {/* Touch-Friendly Keypad */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3 max-w-[280px] mx-auto">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => onPinKeyPress(num)}
                    className="h-12 sm:h-14 bg-slate-50 hover:bg-slate-100 active:bg-indigo-100 text-slate-800 rounded-2xl font-black text-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 border border-slate-100"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={onPinBackspace}
                  className="h-12 sm:h-14 bg-slate-50 hover:bg-rose-50 text-rose-500 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center cursor-pointer transition-all active:scale-95 border border-slate-100"
                >
                  DEL
                </button>
                <button
                  type="button"
                  onClick={() => onPinKeyPress("0")}
                  className="h-12 sm:h-14 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-2xl font-black text-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 border border-slate-100"
                >
                  0
                </button>
                <button
                  type="button"
                  disabled={pinInput.length !== 6 || isSubmittingPin}
                  onClick={() => onVerifyPin()}
                  className="h-12 sm:h-14 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center cursor-pointer transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-green-100"
                >
                  {isSubmittingPin ? "..." : isSelectedAdminNeedsSetup ? "SET PIN" : "OK"}
                </button>
              </div>

              {/* Password Alternative on Kiosk Keypad */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setUsername(selectedAdmin.username);
                    setAuthMode("password");
                  }}
                  className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-indigo-600 cursor-pointer"
                >
                  Use Password Instead →
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
