// src/components/AppShell.tsx
import { Link, useLocation } from "@tanstack/react-router";
import { 
  LayoutDashboard, 
  Trophy, 
  ShoppingCart, 
  ChefHat, 
  Calendar, 
  Users, 
  Settings, 
  Loader2, 
  Gift,
  X,
  ShieldCheck,
  RefreshCw
} from "lucide-react";
import { useState, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanLive } from "@/hooks/useLanLive";
import { getMe } from "@/lib/auth-client";
import { listMembers } from "@/lib/hub-api";
import { toast } from "sonner";
import { Avatar, parseAvatarConfig } from "@/components/avatar/Avatar";

// Modular Kiosk Subcomponents
import { KioskLockScreen } from "@/components/kiosk/KioskLockScreen";
import { KioskPinPortal } from "@/components/kiosk/KioskPinPortal";
import { KioskHeroSelect } from "@/components/kiosk/KioskHeroSelect";
import { PortraitHeroSwitcher } from "@/components/kiosk/PortraitHeroSwitcher";
import { DevicePairingScreen } from "@/components/kiosk/DevicePairingScreen";

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
  const qc = useQueryClient();
  useLanLive(); 

  const enforceFullscreenIfEnabled = () => {
    try {
      const isEnabled = localStorage.getItem("fh_fullscreen_enabled") === "true";
      if (isEnabled && !document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {}
  };

  const [deviceToken, setDeviceToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem("fh_device_token");
    } catch {
      return null;
    }
  });

  const deviceStatus = useQuery({
    queryKey: ["device-status", deviceToken],
    queryFn: () => {
      const headers: Record<string, string> = {};
      if (deviceToken) headers["x-device-token"] = deviceToken;
      return fetch("/api/auth/device-status", { headers }).then(r => r.json());
    }
  });

  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const members = useQuery({ queryKey: ["members"], queryFn: listMembers });
  
  const usersQuery = useQuery({ 
    queryKey: ["users"], 
    queryFn: () => fetch('/api/auth/users').then(res => res.json()) 
  });
  
  const events = useQuery({ 
    queryKey: ["events"], 
    queryFn: () => fetch('/api/events').then(res => res.json()) 
  });

  const [pinInput, setPinInput] = useState("");
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);

  const [now, setNow] = useState(new Date());
  const [isIdle, setIsIdle] = useState(false);
  const isIdleRef = useRef(false);

  useEffect(() => {
    isIdleRef.current = isIdle;
  }, [isIdle]);

  const [kioskMember, setKioskMember] = useState<any>(() => {
    try {
      return JSON.parse(localStorage.getItem("kiosk_active_member") || "null");
    } catch {
      return null;
    }
  });

  // Modal Triggers at ROOT LEVEL
  const [showHeroPickerModal, setShowHeroPickerModal] = useState(false);
  const [showPortraitHeroModal, setShowPortraitHeroModal] = useState(false);
  const [showAdminPortal, setShowAdminPortal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);

  // PRIVILEGE SHIELD: Admin is ONLY elevated if the current active kiosk member is explicitly Admin
  const isAdmin = me.data?.role?.toLowerCase() === "admin" && kioskMember?.role?.toLowerCase() === "admin";
  const idleTimerRef = useRef<any>(null);

  // ZERO-TRUST KIOSK BOOT
  useEffect(() => {
    if (!kioskMember && me.data?.role?.toLowerCase() === "admin") {
      fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      qc.invalidateQueries({ queryKey: ["me"] });
    }
  }, [kioskMember, me.data?.role]);

  // Return to default kiosk screensaver after 1 minute of inactivity
  const resetIdle = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    
    const timeoutDuration = 60 * 1000;

    idleTimerRef.current = setTimeout(() => {
      fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      qc.invalidateQueries({ queryKey: ["me"] });

      setIsIdle(true);
      isIdleRef.current = true;
      setKioskMember(null);
      setShowAdminPortal(false);
      setShowHeroPickerModal(false);
      setShowPortraitHeroModal(false);
      localStorage.removeItem("kiosk_active_member");
    }, timeoutDuration);
  };

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    resetIdle();

    const activityEvents = ["mousemove", "mousedown", "touchstart", "click", "keypress"];
    const handleActivity = () => {
      if (isIdleRef.current) return;
      resetIdle();
    };

    activityEvents.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));

    return () => {
      clearInterval(t);
      activityEvents.forEach(e => window.removeEventListener(e, handleActivity));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [isAdmin]);

  const handleSelectHero = (member: any) => {
    enforceFullscreenIfEnabled();
    setKioskMember(member);
    localStorage.setItem("kiosk_active_member", JSON.stringify(member));
    setIsIdle(false);
    isIdleRef.current = false;
    setShowHeroPickerModal(false);
    setShowPortraitHeroModal(false);
    resetIdle();
    toast.success(`Welcome back, ${member.name}! ⭐`, { position: "top-center" });
  };

  const handleVerifyAdminPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pinInput.length !== 6 || !selectedAdmin) return;
    
    setIsSubmittingPin(true);
    try {
      const isNeedsSetup = !selectedAdmin.pin_hash || selectedAdmin.needs_pin_setup === 1;

      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: selectedAdmin.id, 
          pin: pinInput,
          isSetup: isNeedsSetup 
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(
          isNeedsSetup 
            ? `Admin PIN Initialized & Session Elevated! 🛡️` 
            : `Admin Session Elevated: Welcome ${selectedAdmin.username}! 🛡️`, 
          { position: "top-center" }
        );
        
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

        const adminHero = { ...hero, role: 'admin' };
        setKioskMember(adminHero);
        localStorage.setItem("kiosk_active_member", JSON.stringify(adminHero));

        setShowAdminPortal(false);
        setShowHeroPickerModal(false);
        setShowPortraitHeroModal(false);
        setSelectedAdmin(null);
        setPinInput("");
        setIsIdle(false);
        isIdleRef.current = false;
        resetIdle();

        enforceFullscreenIfEnabled();
        await qc.invalidateQueries();
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

  const memberList = Array.isArray(members.data) ? members.data : [];
  const userList = Array.isArray(usersQuery.data) ? usersQuery.data : [];
  const eventList = Array.isArray(events.data) ? events.data : [];

  const visibleKioskHeroes = useMemo(() => {
    return memberList.filter((m: any) => m.show_on_kiosk !== 0);
  }, [memberList]);

  const adminUsers = useMemo(() => {
    return userList.filter((u: any) => u.role?.toLowerCase() === 'admin');
  }, [userList]);

  const filteredNav = nav.filter(item => {
    if (item.to === "/settings") return isAdmin;
    return true;
  });

  // 1. Loading Guard
  if (deviceStatus.isLoading || me.isLoading || members.isLoading || events.isLoading) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="size-10 text-indigo-500 animate-spin mb-4" />
        <p className="font-black uppercase tracking-widest text-[10px] text-slate-400 italic text-center animate-pulse">
          Synchronizing Fortress...
        </p>
      </div>
    );
  }

  // 2. Device Pairing Gatekeeper
  if (deviceStatus.data?.is_trusted === false) {
    return (
      <DevicePairingScreen
        onPairedSuccess={(newToken) => {
          setDeviceToken(newToken);
          qc.invalidateQueries({ queryKey: ["device-status"] });
        }}
      />
    );
  }

  // 3. Admin PIN Portal
  if (showAdminPortal) {
    return (
      <KioskPinPortal
        adminUsers={adminUsers}
        memberList={memberList}
        selectedAdmin={selectedAdmin}
        setSelectedAdmin={setSelectedAdmin}
        pinInput={pinInput}
        onPinKeyPress={(digit) => {
          if (pinInput.length < 6) setPinInput(prev => prev + digit);
        }}
        onPinBackspace={() => setPinInput(prev => prev.slice(0, -1))}
        onVerifyPin={handleVerifyAdminPin}
        isSubmittingPin={isSubmittingPin}
        onClose={() => {
          setShowAdminPortal(false);
          setSelectedAdmin(null);
          setPinInput("");
        }}
      />
    );
  }

  // 4. Idle Screensaver View
  if (isIdle) {
    return (
      <KioskLockScreen
        now={now}
        eventsList={eventList}
        memberList={memberList}
        onOpenHeroSelect={() => {
          enforceFullscreenIfEnabled();
          setIsIdle(false);
          isIdleRef.current = false;
          setShowHeroPickerModal(true);
          resetIdle();
        }}
        onOpenAdmin={() => {
          enforceFullscreenIfEnabled();
          setShowAdminPortal(true);
        }}
      />
    );
  }

  // 5. Hero Picker Overlay
  if (showHeroPickerModal || (!kioskMember && visibleKioskHeroes.length > 0)) {
    return (
      <KioskHeroSelect
        heroes={visibleKioskHeroes.length > 0 ? visibleKioskHeroes : memberList}
        onSelectHero={handleSelectHero}
        onOpenAdmin={() => {
          enforceFullscreenIfEnabled();
          setShowAdminPortal(true);
        }}
        onClose={kioskMember ? () => setShowHeroPickerModal(false) : undefined}
      />
    );
  }

  // 6. Main Dashboard Layout
  return (
    <div className="min-h-[100dvh] bg-canvas flex flex-col justify-between relative">
      
      {/* Desktop & Tablet Landscape Sidebar */}
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
        
        {/* RESPONSIVE TABLET TOUCH TARGET: Entire Card is an instant 1-tap trigger */}
        {kioskMember && (
          <div className="mx-3 mb-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowHeroPickerModal(true)}
              className="w-full p-3 bg-slate-50 hover:bg-indigo-50/70 active:bg-indigo-100 border-2 border-slate-200 hover:border-indigo-300 rounded-2xl flex items-center gap-3 transition-all cursor-pointer active:scale-95 shadow-xs touch-manipulation min-h-[56px] text-left group select-none"
              title="Tap to switch character profile"
            >
              <Avatar 
                config={parseAvatarConfig(kioskMember.avatar_config)} 
                className="size-11 rounded-xl shadow-xs border border-white shrink-0 group-hover:scale-105 transition-transform" 
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase text-slate-800 truncate leading-tight">{kioskMember.name}</p>
                <div className="flex items-center gap-1 mt-1 text-[10px] font-black text-indigo-600 uppercase tracking-wider">
                  <RefreshCw size={11} className="group-hover:rotate-180 transition-transform duration-300" />
                  <span>Switch Hero</span>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Admin Return to Standby Button */}
        {isAdmin && (
          <div className="p-3 shrink-0 mb-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
                qc.invalidateQueries({ queryKey: ["me"] });
                setIsIdle(true);
                setKioskMember(null);
                localStorage.removeItem("kiosk_active_member");
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-black uppercase tracking-wider text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer min-h-[44px] touch-manipulation"
            >
              <ShieldCheck className="size-4 shrink-0" />
              Lock Admin Session
            </button>
          </div>
        )}
      </aside>

      {/* Portrait / Mobile Top-Bar Header */}
      <div className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-100 px-4 py-3 flex items-center justify-between shadow-xs pt-[max(env(safe-area-inset-top),0.75rem)]">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-xl bg-indigo-600 text-white font-display text-sm font-black italic shadow-xs">
            H
          </div>
          <span className="font-display text-base font-black uppercase italic tracking-tight text-slate-900">
            Family Hub
          </span>
        </Link>

        <PortraitHeroSwitcher
          kioskMember={kioskMember}
          onOpenDrawer={() => setShowPortraitHeroModal(true)}
        />
      </div>

      {/* Main Content Area */}
      <main className="md:ml-64 pb-28 md:pb-8 flex-1">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 rounded-2xl border border-border bg-panel/95 backdrop-blur px-2 sm:px-3 py-2 shadow-2xl md:hidden w-[94%] max-w-md justify-between safe-area-inset-bottom mb-[max(env(safe-area-inset-bottom),0px)]">
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

      {/* ROOT-LEVEL PORTRAIT HERO SWITCHER MODAL */}
      {showPortraitHeroModal && (
        <div 
          className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150 select-none" 
          onClick={() => setShowPortraitHeroModal(false)}
        >
          <div 
            className="bg-white w-full max-w-md rounded-3xl sm:rounded-[3rem] p-5 sm:p-7 shadow-2xl border-4 border-slate-50 flex flex-col justify-between animate-in zoom-in-95 duration-200 my-auto max-h-[85vh] relative" 
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-xl sm:text-2xl font-black uppercase italic tracking-tight text-slate-900 leading-tight">
                  Switch Hero
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Choose your character profile
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setShowPortraitHeroModal(false)}
                className="p-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-full transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-500 active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Hero Grid */}
            <div className="max-h-[45vh] overflow-y-auto pr-1 my-2 scrollbar-thin flex-1">
              {memberList.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-4">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-wider">No heroes found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 pb-1">
                  {(visibleKioskHeroes.length > 0 ? visibleKioskHeroes : memberList).map((m: any) => {
                    const isCurrent = kioskMember?.id === m.id;
                    const avatarConfig = parseAvatarConfig(m.avatar_config);

                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => handleSelectHero(m)}
                        className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all cursor-pointer active:scale-95 touch-manipulation ${
                          isCurrent 
                            ? 'border-indigo-600 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-500/20' 
                            : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        <Avatar 
                          config={avatarConfig} 
                          className="size-14 sm:size-16 rounded-xl shadow-xs border-2 border-white shrink-0" 
                        />
                        <div className="min-w-0 w-full text-center">
                          <span className="text-xs sm:text-sm font-black uppercase text-slate-800 truncate block">
                            {m.name}
                          </span>
                          <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block mt-0.5">
                            Level {m.level || 1}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Action Button */}
            <div className="pt-3 border-t border-slate-100 shrink-0 flex items-center">
              <button
                type="button"
                onClick={() => {
                  setShowPortraitHeroModal(false);
                  setShowAdminPortal(true);
                }}
                className="w-full py-3.5 bg-slate-900 hover:bg-indigo-600 active:scale-95 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer min-h-[44px] transition-all touch-manipulation"
              >
                <ShieldCheck size={18} /> Admin Login
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

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
