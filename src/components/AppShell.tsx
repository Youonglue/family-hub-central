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
  Loader2, 
  Gift 
} from "lucide-react";
import { useState, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanLive } from "@/hooks/useLanLive";
import { logout, getMe } from "@/lib/auth-client";
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
  const navigate = useNavigate();
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

  const [showAdminPortal, setShowAdminPortal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);

  const isAdmin = me.data?.role?.toLowerCase() === "admin";
  const idleTimerRef = useRef<any>(null);

  const resetIdle = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    
    const timeoutDuration = isAdmin ? 30000 : 60000;
    idleTimerRef.current = setTimeout(() => {
      if (isAdmin) {
        signOut();
        toast.info("Admin session expired for security");
      } else {
        setIsIdle(true);
        isIdleRef.current = true;
        setKioskMember(null);
        setShowAdminPortal(false);
        localStorage.removeItem("kiosk_active_member");
      }
    }, timeoutDuration);
  };

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    resetIdle();

    const activityEvents = ["mousemove", "mousedown", "touchstart", "click", "keypress"];
    const handleActivity = () => {
      if (isIdleRef.current) return;
      enforceFullscreenIfEnabled();
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
    resetIdle();
    toast.success(`Welcome back, ${member.name}! ⭐`, { position: "top-center" });
  };

  async function signOut(isBypassKiosk = false) {
    await qc.cancelQueries();
    qc.clear();
    
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn("Direct logout call failed", err);
    }

    try { await logout(); } catch { /* ignore */ }

    localStorage.removeItem('kiosk_active_member');
    setKioskMember(null);
    setShowAdminPortal(false);

    if (isBypassKiosk) {
      navigate({ to: "/auth", replace: true });
      return;
    }

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
        isIdleRef.current = true;
        qc.invalidateQueries();
        return;
      }
    } catch (e) {
      console.warn("Failed to reactivate kiosk guest session:", e);
    }

    navigate({ to: "/auth", replace: true });
  }

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

        setKioskMember(hero);
        localStorage.setItem("kiosk_active_member", JSON.stringify(hero));

        setShowAdminPortal(false);
        setSelectedAdmin(null);
        setPinInput("");
        setIsIdle(false);
        isIdleRef.current = false;
        resetIdle();

        enforceFullscreenIfEnabled();

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

  // --- 1. GLOBAL LOADING STATE ---
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

  // --- 2. DEVICE PAIRING GATEKEEPER ---
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

  // --- 3. ADMIN QUICK-PIN PORTAL (PRIORITY OVERLAY: CAN LAUNCH FROM ANYWHERE) ---
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

  // --- 4. EXPANDED WEEKLY HORIZON SCREENSAVER ---
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
          resetIdle();
        }}
        onOpenAdmin={() => {
          enforceFullscreenIfEnabled();
          setShowAdminPortal(true);
        }}
      />
    );
  }

  // --- 5. GLOBAL CHARACTER SELECT ("Which Hero Are You?") ---
  if (!kioskMember && !isAdmin && visibleKioskHeroes.length > 0) {
    return (
      <KioskHeroSelect
        heroes={visibleKioskHeroes}
        onSelectHero={handleSelectHero}
        onOpenAdmin={() => {
          enforceFullscreenIfEnabled();
          setShowAdminPortal(true);
        }}
      />
    );
  }

  // --- 6. MAIN APPLICATION LAYOUT ---
  return (
    <div className="min-h-screen bg-canvas">
      
      {/* Desktop / Landscape Tablet Sidebar */}
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
        
        {kioskMember && (
          <div className="p-4 mx-3 mb-2 bg-slate-50 border-2 border-slate-100 rounded-3xl flex items-center gap-3 shrink-0">
            <Avatar 
              config={parseAvatarConfig(kioskMember.avatar_config)} 
              className="size-10 rounded-xl shadow-inner shrink-0" 
            />
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

        <div className="p-3 shrink-0 mb-2 border-t border-slate-100">
          <button
            onClick={() => signOut(true)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-black uppercase tracking-wider text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer min-h-[44px]"
          >
            <LogOut className="size-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Portrait / Mobile Top-Bar Hero Switcher */}
      <div className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-100 px-3.5 py-2.5 flex items-center justify-between shadow-xs">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-xl bg-indigo-600 text-white font-display text-sm font-black italic">
            H
          </div>
          <span className="font-display text-base font-black uppercase italic tracking-tight text-slate-900">
            Family Hub
          </span>
        </Link>

        <PortraitHeroSwitcher
          kioskMember={kioskMember}
          visibleHeroes={visibleKioskHeroes}
          onSelectHero={handleSelectHero}
          onOpenAdmin={() => {
            enforceFullscreenIfEnabled();
            setShowAdminPortal(true);
          }}
          onSignOut={() => signOut(true)}
        />
      </div>

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

      <main className="md:ml-64 pb-24 md:pb-8 min-h-screen">
        {children}
      </main>
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
