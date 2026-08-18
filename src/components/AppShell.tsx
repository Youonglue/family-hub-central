// src/components/AppShell.tsx
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { 
  LayoutDashboard, 
  Trophy, 
  ShoppingCart, 
  ChefHat, 
  Calendar, 
  Users, 
  Settings, 
  LogOut, 
  ShieldCheck, 
  Lock, 
  Loader2, 
  Gift, 
  RefreshCcw, 
  X 
} from "lucide-react";
import { useState, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanLive } from "@/hooks/useLanLive";
import { logout, getMe } from "@/lib/auth-client";
import { listMembers } from "@/lib/hub-api";
import { toast } from "sonner";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/chores", label: "Chores", icon: Trophy },
  { to: "/rewards", label: "Rewards", icon: Gift },
  { to: "/shopping", label: "Shopping", icon: ShoppingCart },
  { to: "/meals", label: "Meals", icon: ChefHat },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/family", label: "Family", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  useLanLive(); 

  // --- DATA FETCHING ---
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const members = useQuery({ queryKey: ["members"], queryFn: listMembers });
  
  const usersQuery = useQuery({ 
    queryKey: ["users"], 
    queryFn: () => fetch('/api/auth/users').then(res => res.json()) 
  });
  
  // Fetch calendar events to display on the Lock Screen
  const events = useQuery({ 
    queryKey: ["events"], 
    queryFn: () => fetch('/api/events').then(res => res.json()) 
  });

  const [pinInput, setPinInput] = useState("");
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);

  // --- GLOBAL KIOSK STATE MANAGEMENT ---
  const [now, setNow] = useState(new Date());
  const [isIdle, setIsIdle] = useState(false);
  const [kioskMember, setKioskMember] = useState<any>(() => {
    try {
      return JSON.parse(localStorage.getItem("kiosk_active_member") || "null");
    } catch {
      return null;
    }
  });

  // Multi-user Admin select states
  const [showAdminPortal, setShowAdminPortal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);

  const isAdmin = me.data?.role?.toLowerCase() === "admin";
  const idleTimerRef = useRef<any>(null);

  // Global Inactivity Handler: 30s high-security logout for Admin, 1m auto-clock lock for Guest Kiosk
  const resetIdle = () => {
    setIsIdle(false);
    
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    
    const timeoutDuration = isAdmin ? 30000 : 60000;

    idleTimerRef.current = setTimeout(() => {
      if (isAdmin) {
        // High-Security Action: Completely log out and terminate Admin sessions on 30s silence
        signOut();
        toast.info("Admin session expired for security");
      } else {
        // Standard Kiosk Action: Clear current hero select and lock screen to clock on 1m silence
        setIsIdle(true);
        setKioskMember(null);
        localStorage.removeItem("kiosk_active_member");
      }
    }, timeoutDuration);
  };

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    resetIdle();

    const activityEvents = ["mousemove", "mousedown", "touchstart", "click", "keypress"];
    activityEvents.forEach(e => window.addEventListener(e, resetIdle, { passive: true }));

    return () => {
      clearInterval(t);
      activityEvents.forEach(e => window.removeEventListener(e, resetIdle));
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [isAdmin]);

  const handleSelectHero = (member: any) => {
    setKioskMember(member);
    localStorage.setItem("kiosk_active_member", JSON.stringify(member));
    setIsIdle(false);
    toast.success(`Welcome back, ${member.name}! ⭐`, { position: "top-center" });
  };

  const handleExitKioskMode = () => {
    setIsIdle(false);
    resetIdle();
  };

  // Secure and seamless Sign Out Functionality
  async function signOut(isBypassKiosk = false) {
    await qc.cancelQueries();
    qc.clear();
    
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn("Direct logout call failed", err);
    }

    try { 
      await logout(); 
    } catch { /* ignore */ }

    localStorage.removeItem('kiosk_active_member');
    setKioskMember(null);

    if (isBypassKiosk) {
      navigate({ to: "/auth", replace: true });
      return;
    }

    // Otherwise silently transition back to Kiosk Guest session
    try {
      const loginPayload = { username: "kiosk_guest", password: "kiosk_guest_password" };
      let res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginPayload)
      });
      
      if (!res.ok) {
        await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginPayload)
        });
        res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginPayload)
        });
      }
      
      if (res.ok) {
        setIsIdle(true);
        qc.invalidateQueries();
        return;
      }
    } catch (e) {
      console.warn("Failed to silently reactivate kiosk guest session:", e);
    }

    navigate({ to: "/auth", replace: true });
  }

  // Numerical pin keypad entry
  const handlePinKeyPress = (num: string) => {
    if (pinInput.length < 6) {
      setPinInput(prev => prev + num);
    }
  };

  const handlePinBackspace = () => {
    setPinInput(prev => prev.slice(0, -1));
  };

  // Direct Admin PIN Verification with Instant Hero & Dashboard Entry
  const handleVerifyAdminPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pinInput.length !== 6 || !selectedAdmin) return;
    
    setIsSubmittingPin(true);
    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedAdmin.id, pin: pinInput })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Admin Session Elevated: Welcome ${selectedAdmin.username}! 🛡️`, { position: "top-center" });
        
        // Find or use returned hero to log straight into the dashboard
        const currentMembers = Array.isArray(members.data) ? members.data : [];
        const hero = data.member || currentMembers.find(
          (m: any) => m.user_id === selectedAdmin.id || m.name?.toLowerCase() === selectedAdmin.username?.toLowerCase()
        ) || {
          id: selectedAdmin.id,
          name: selectedAdmin.username,
          avatar_color: '#4f46e5',
          role: 'admin',
          level: 1
        };

        // Instantly activate hero in memory and local storage
        setKioskMember(hero);
        localStorage.setItem("kiosk_active_member", JSON.stringify(hero));

        // Close all modal & idle barriers
        setShowAdminPortal(false);
        setSelectedAdmin(null);
        setPinInput("");
        setIsIdle(false);

        // Refresh queries to load Admin elevated state and navigate straight to dashboard
        await qc.invalidateQueries();
        navigate({ to: "/dashboard" });
      } else {
        toast.error("Invalid Admin PIN Code!");
        setPinInput("");
      }
    } catch (err) {
      toast.error("Network connection error");
    } finally {
      setIsSubmittingPin(false);
    }
  };

  // Upcoming calendar event for clock screen
  const upcomingEvent = useMemo(() => {
    const list = Array.isArray(events.data) ? events.data : [];
    const todayKey = ymd(now);
    return list.find((e: any) => e.starts_at >= todayKey);
  }, [events.data, now]);

  const memberList = Array.isArray(members.data) ? members.data : [];
  const userList = Array.isArray(usersQuery.data) ? usersQuery.data : [];

  const adminUsers = useMemo(() => {
    return userList.filter((u: any) => u.role?.toLowerCase() === 'admin');
  }, [userList]);

  const filteredNav = nav.filter(item => {
    if (item.to === "/settings") {
      return isAdmin;
    }
    return true;
  });

  // --- 1. GLOBAL LOADING STATE ---
  if (me.isLoading || members.isLoading || events.isLoading) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="size-10 text-indigo-500 animate-spin mb-4" />
        <p className="font-black uppercase tracking-widest text-[10px] text-slate-400 italic text-center animate-pulse">
          Synchronizing Fortress...
        </p>
      </div>
    );
  }

  // --- 2. 6-DIGIT PIN INITIALIZATION GATEKEEPER ---
  if (me.data?.needs_pin_setup === 1) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900 flex items-center justify-center p-4 overflow-y-auto">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500 rounded-full blur-[120px]" />
        </div>

        <div className="relative w-full max-w-md bg-white rounded-[3rem] sm:rounded-[4rem] p-6 sm:p-10 shadow-2xl border-8 sm:border-[16px] border-slate-50 text-center animate-in zoom-in-95 duration-300 my-auto">
          <div className="size-16 sm:size-20 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-indigo-600">
            <ShieldCheck size={40} />
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter text-slate-900 mb-2">Secure Status</h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-8 leading-relaxed">
            Admin Promotion Detected!<br/>Set your 6-digit access code.
          </p>

          <div className="relative mb-6">
            <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 size-5 sm:size-6" />
            <input 
              type="password" 
              inputMode="numeric"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full text-center text-3xl sm:text-5xl tracking-[0.4em] font-black p-5 sm:p-8 bg-slate-50 rounded-[2rem] sm:rounded-[2.5rem] border-4 border-transparent focus:border-indigo-500 outline-none transition-all placeholder:text-slate-200"
            />
          </div>

          <button 
            disabled={pinInput.length !== 6 || isSubmittingPin}
            onClick={async () => {
              setIsSubmittingPin(true);
              try {
                const res = await fetch('/api/auth/set-pin', {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify({ pin: pinInput })
                });
                if (res.ok) {
                  toast.success("Security Active!");
                  window.location.reload();
                } else {
                  toast.error("Set-PIN Failed");
                }
              } catch (err) {
                toast.error("Connection Error");
              } finally {
                setIsSubmittingPin(false);
              }
            }}
            className="w-full py-4 sm:py-6 bg-slate-900 text-white rounded-[2rem] font-black text-base sm:text-xl shadow-xl hover:bg-indigo-600 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20 cursor-pointer min-h-[48px]"
          >
            {isSubmittingPin ? "SECURING..." : "ACTIVATE ADMIN"}
          </button>
          
          <button 
            onClick={() => signOut(true)} 
            className="mt-6 text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-rose-500 transition-colors p-2"
          >
            Cancel & Sign Out
          </button>
        </div>
      </div>
    );
  }

  // --- 3. GLOBAL IDLE CLOCK VIEW (Tablet & Mobile Portrait/Landscape Optimized) ---
  if (isIdle) {
    return (
      <div 
        className="fixed inset-0 z-[9999] bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-1000 cursor-pointer select-none" 
        onClick={handleExitKioskMode}
      >
        <p className="text-xl sm:text-3xl font-light tracking-[0.4em] sm:tracking-[0.5em] text-indigo-500 uppercase mb-2 sm:mb-4 animate-pulse">
          Family Hub
        </p>
        <h1 className="text-6xl sm:text-9xl md:text-[12rem] font-black leading-none tracking-tighter">
          {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </h1>
        <p className="text-xl sm:text-3xl md:text-4xl text-slate-400 font-medium mt-2 sm:mt-4">
          {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        
        <div className="mt-8 sm:mt-16 flex items-center gap-3 sm:gap-4 bg-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10 max-w-lg w-full">
          <Calendar className="size-6 sm:size-8 text-indigo-500 shrink-0 animate-pulse" />
          <div className="text-left min-w-0">
             <p className="text-[9px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest">Next Event</p>
             <p className="text-sm sm:text-xl font-bold truncate">{upcomingEvent ? upcomingEvent.title : "No more events today"}</p>
          </div>
        </div>
        
        <p className="absolute bottom-6 sm:bottom-8 text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-slate-500">
          Tap Screen To Wake
        </p>
      </div>
    );
  }

  // --- 4. ADMIN QUICK-PIN GATEKEEPER PORTAL (Portrait & Landscape Responsive) ---
  if (showAdminPortal) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] sm:rounded-[3.5rem] border-4 sm:border-[12px] border-slate-50 p-5 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200 relative my-auto max-h-[95vh] overflow-y-auto">
          
          {/* Close Portal Button */}
          <button 
            onClick={() => { setShowAdminPortal(false); setSelectedAdmin(null); setPinInput(""); }} 
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-full transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close Admin Portal"
          >
            <X size={18} />
          </button>

          {/* Sub-Screen 1: Select Administrator */}
          {!selectedAdmin ? (
            <div className="space-y-4 sm:space-y-6 text-center py-2 sm:py-4">
              <ShieldCheck className="size-12 sm:size-16 text-indigo-500 animate-bounce mx-auto" />
              <div>
                <h3 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter text-slate-900">Select Administrator</h3>
                <p className="text-slate-400 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest mt-1">Choose account to elevate session</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-2">
                {adminUsers.map((u: any) => {
                  const associatedHero = memberList.find(m => m.user_id === u.id || m.name?.toLowerCase() === u.username?.toLowerCase());
                  return (
                    <button
                      key={u.id}
                      onClick={() => setSelectedAdmin(u)}
                      className="group p-4 sm:p-5 bg-slate-50 hover:bg-indigo-50 border-2 border-slate-100 hover:border-indigo-200 rounded-3xl flex flex-col items-center gap-2 sm:gap-3 transition-all cursor-pointer min-h-[100px] justify-center active:scale-95"
                    >
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
            </div>
          ) : (
            /* Sub-Screen 2: Touch-Optimized Large PIN Keypad */
            <div className="space-y-4 sm:space-y-6 text-center">
              <div className="flex items-center justify-start">
                <button 
                  onClick={() => { setSelectedAdmin(null); setPinInput(""); }} 
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer min-h-[44px]"
                >
                  <RefreshCcw size={12} /> Back
                </button>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black uppercase italic tracking-tighter text-slate-900 leading-tight">
                  Enter PIN for {selectedAdmin.username}
                </h3>
                <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1">Type your 6-digit access code</p>
              </div>

              {/* Pin indicator dots */}
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

              {/* Giant Touch-Friendly Keypad (48px+ targets for portrait & landscape tablets) */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3 max-w-[280px] mx-auto">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handlePinKeyPress(num)}
                    className="h-12 sm:h-14 bg-slate-50 hover:bg-slate-100 active:bg-indigo-100 text-slate-800 rounded-2xl font-black text-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 border border-slate-100"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handlePinBackspace}
                  className="h-12 sm:h-14 bg-slate-50 hover:bg-rose-50 text-rose-500 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center cursor-pointer transition-all active:scale-95 border border-slate-100"
                >
                  DEL
                </button>
                <button
                  type="button"
                  onClick={() => handlePinKeyPress("0")}
                  className="h-12 sm:h-14 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-2xl font-black text-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 border border-slate-100"
                >
                  0
                </button>
                <button
                  type="button"
                  disabled={pinInput.length !== 6 || isSubmittingPin}
                  onClick={() => handleVerifyAdminPin()}
                  className="h-12 sm:h-14 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center cursor-pointer transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-green-100"
                >
                  {isSubmittingPin ? "..." : "OK"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- 5. GLOBAL CHARACTER SELECT ("Which Hero Are You?") ---
  if (!kioskMember && memberList.length > 0) {
    return (
      <div className="fixed inset-0 z-[9998] bg-slate-900 flex flex-col items-center justify-start p-4 sm:p-6 overflow-y-auto scrollbar-thin py-12 sm:py-16">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-500 rounded-full blur-[120px]" />
        </div>

        {/* Admin Login Button */}
        <button 
          onClick={() => setShowAdminPortal(true)}
          className="absolute top-4 right-4 bg-white/10 border border-white/20 hover:bg-white/20 text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all z-50 min-h-[44px]"
        >
          <ShieldCheck size={16} /> Admin Login
        </button>

        <div className="relative text-center max-w-5xl w-full space-y-6 sm:space-y-10 animate-in zoom-in-95 duration-500 my-auto">
          <Trophy className="size-12 sm:size-16 md:size-20 text-yellow-500 mb-2 animate-bounce mx-auto" />
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-black uppercase italic tracking-tighter text-white px-2">
            Which Hero Are You?
          </h1>
          
          {/* Responsive Character Grid (Phones: 2 cols, Tablets/Desktop: 4 cols) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 md:gap-8 w-full max-w-4xl mx-auto px-2">
            {memberList.map((m: any) => {
              return (
                <button 
                  key={m.id} 
                  onClick={() => handleSelectHero(m)} 
                  className="group flex flex-col items-center gap-2 sm:gap-3 cursor-pointer focus:outline-none active:scale-95 transition-transform"
                >
                  <div 
                    className="size-24 sm:size-36 md:size-44 rounded-3xl sm:rounded-[2.5rem] md:rounded-[3rem] shadow-2xl border-4 sm:border-8 md:border-[10px] border-white/15 transition-all group-hover:scale-105 group-hover:rotate-2 flex items-center justify-center text-white text-3xl sm:text-5xl md:text-6xl font-black uppercase" 
                    style={{ backgroundColor: m.avatar_color || '#ccc' }}
                  >
                    {m.name[0]}
                  </div>
                  <span className="text-base sm:text-xl md:text-2xl font-black text-white uppercase tracking-wider leading-none mt-1 truncate max-w-full px-1">
                    {m.name}
                  </span>
                  <p className="text-[8px] sm:text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">
                    Level {m.level || 1}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // --- 6. STANDARD APP LAYOUT (With Persistent Kiosk Sidebar Card) ---
  return (
    <div className="min-h-screen bg-canvas">
      
      {/* Desktop Sidebar (Hidden on mobile and portrait mini-tablets) */}
      <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col border-r border-border bg-panel/70 backdrop-blur hidden md:flex z-40 overflow-y-auto scrollbar-thin">
        <Link to="/dashboard" className="flex items-center gap-2 px-6 py-6 shrink-0">
          <div className="grid size-9 place-items-center rounded-2xl bg-indigo-600 text-white font-display text-lg font-black italic">
            H
          </div>
          <span className="font-display text-xl font-black uppercase italic tracking-tight">Family Hub</span>
        </Link>
        
        <nav className="flex-1 space-y-1.5 px-3 py-2">
          {filteredNav.map((item) => {
            const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-black uppercase tracking-wider transition-all shrink-0 min-h-[44px] ${
                  active 
                    ? "bg-slate-900 text-white shadow-lg scale-[1.01]" 
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <item.icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        
        {/* Dynamic Active Kiosk Hero Card */}
        {kioskMember && (
          <div className="p-4 mx-3 mb-2 bg-slate-50 border-2 border-slate-100 rounded-3xl flex items-center gap-3 shrink-0">
            <div 
              className="size-10 rounded-xl flex items-center justify-center text-white text-lg font-black uppercase shadow-inner shrink-0"
              style={{ backgroundColor: kioskMember.avatar_color || '#ccc' }}
            >
              {kioskMember.name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase text-slate-800 truncate">{kioskMember.name}</p>
              <button 
                onClick={() => {
                  setKioskMember(null);
                  localStorage.removeItem("kiosk_active_member");
                }}
                className="text-[9px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-600 leading-none cursor-pointer block mt-1"
              >
                Switch Hero
              </button>
            </div>
          </div>
        )}

        <div className="p-3 shrink-0 mb-2">
          <button
            onClick={() => signOut(true)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-black uppercase tracking-wider text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer min-h-[44px]"
          >
            <LogOut className="size-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile / Mini-Tablet Bottom Navigation Bar */}
      <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 rounded-2xl border border-border bg-panel/95 backdrop-blur px-2 sm:px-3 py-2 shadow-2xl md:hidden w-[94%] max-w-md justify-between safe-area-inset-bottom">
        {filteredNav.map((item) => {
          const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`grid size-10 sm:size-11 place-items-center rounded-xl transition-all min-h-[44px] min-w-[44px] ${
                active ? "bg-indigo-600 text-white shadow-md scale-105" : "text-slate-400 hover:bg-slate-100 active:bg-slate-200"
              }`}
              aria-label={item.label}
            >
              <item.icon className="size-5" />
            </Link>
          );
        })}
      </nav>

      {/* Main Content Area */}
      <main className="md:ml-64 pb-24 md:pb-8 min-h-screen">
        {children}
      </main>
    </div>
  );
}

/* Utility styles */
export const KID_COLORS = ["amber", "pink", "emerald", "sky", "rose", "violet"] as const;
export type KidColor = (typeof KID_COLORS)[number];
export function kidStyle(color: string): { background: string; color: string } {
  const c = (KID_COLORS as readonly string[]).includes(color) ? color : "amber";
  return { background: `var(--kid-${c}-soft)`, color: `var(--kid-${c})` };
}
export function kidSolid(color: string): { background: string; color: string } {
  const c = (KID_COLORS as readonly string[]).includes(color) ? color : "amber";
  return { background: `var(--kid-${c})`, color: "white" };
}
