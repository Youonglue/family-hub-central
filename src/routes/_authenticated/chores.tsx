import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { getMe } from "@/lib/auth-client";
import { Timer } from "lucide-react";

// Sub-component Imports (Compartmentalized)
import { ChoreCharacterSelect } from "@/components/chores/ChoreCharacterSelect";
import { ChoreActiveDashboard } from "@/components/chores/ChoreActiveDashboard";
import { ChoreAdminPanel } from "@/components/chores/ChoreAdminPanel";

export const Route = createFileRoute("/_authenticated/chores")({
  ssr: false,
  component: ChoresKiosk,
});

function ChoresKiosk() {
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  
  // Core Kiosk States
  const [activeMember, setActiveMember] = useState<any>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isAdminView, setIsAdminView] = useState(false);

  const isSystemAdmin = me.data?.role?.toLowerCase() === "admin";

  // --- INACTIVITY TIMEOUT (Resets active character after 60 seconds of idle time) ---
  useEffect(() => {
    if (!activeMember) return;
    const interval = setInterval(() => {
      if (Date.now() - lastActivity > 60000) {
        setActiveMember(null);
        setIsAdminView(false);
        toast("Hub Reset for Safety", { icon: <Timer className="size-4" /> });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeMember, lastActivity]);

  const recordActivity = useCallback(() => setLastActivity(Date.now()), []);

  // Determine if active character is a parent OR if logged in user is a system admin
  const canAccessAdmin = isSystemAdmin || activeMember?.is_parent === 1 || activeMember?.is_parent === true;

  // --- SESSION LOADING GUARD ---
  if (me.isLoading) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[85vh] p-6">
          <p className="font-black text-slate-400 uppercase tracking-widest text-xs italic animate-pulse text-center">Synchronizing Kiosk...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div 
        className="mx-auto max-w-5xl p-2 md:p-6" 
        onMouseMove={recordActivity} 
        onClick={recordActivity}
      >
        {/* Render SCREEN A: Admin Panel View */}
        {isAdminView ? (
          <ChoreAdminPanel
            activeMember={activeMember}
            onBack={() => {
              if (activeMember) {
                setIsAdminView(false);
              } else {
                setIsAdminView(false);
                setActiveMember(null);
              }
            }}
            isAdminView={isAdminView}
            setIsAdminView={setIsAdminView}
          />
        ) : activeMember ? (
          // Render SCREEN B: Active Kid Dashboard View
          <ChoreActiveDashboard
            activeMember={activeMember}
            onBack={() => {
              setActiveMember(null);
              setIsAdminView(false);
            }}
            isAdminView={isAdminView}
            setIsAdminView={setIsAdminView}
            canAccessAdmin={canAccessAdmin}
          />
        ) : (
          // Render SCREEN C: Character Select View
          <ChoreCharacterSelect
            onSelectMember={(m) => {
              setActiveMember(m);
              recordActivity();
            }}
            onOpenAdmin={() => {
              setIsAdminView(true);
              recordActivity();
            }}
          />
        )}

        <footer className="pt-20 text-center">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] flex items-center justify-center gap-2 opacity-50">
            <Timer className="size-3" /> Auto-Reset Kiosk Engaged
          </p>
        </footer>
      </div>
    </AppShell>
  );
}
