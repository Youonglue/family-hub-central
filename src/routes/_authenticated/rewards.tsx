// src/routes/_authenticated/rewards.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { getMe } from "@/lib/auth-client";
import { Timer } from "lucide-react";

// Sub-component Imports (CharacterSelect removed entirely)
import { RewardActiveShop } from "@/components/rewards/RewardActiveShop";
import { RewardAdminCatalog } from "@/components/rewards/RewardAdminCatalog";

export const Route = createFileRoute("/_authenticated/rewards")({
  ssr: false,
  component: RewardsShop,
});

function RewardsShop() {
  const navigate = useNavigate();
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });

  // STRICTLY LINKED TO GLOBAL KIOSK HERO: No local character select screen
  const [activeMember, setActiveMember] = useState<any>(() => {
    try {
      return JSON.parse(localStorage.getItem("kiosk_active_member") || "null");
    } catch {
      return null;
    }
  });

  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isAdminView, setIsAdminView] = useState(false);

  const isSystemAdmin = me.data?.role?.toLowerCase() === "admin";

  // --- KIOSK STATE SYNCER ---
  // Keeps the active hero strictly in sync with the kiosk selection
  useEffect(() => {
    const syncMember = () => {
      try {
        const stored = localStorage.getItem("kiosk_active_member");
        const parsed = stored ? JSON.parse(stored) : null;
        if (JSON.stringify(parsed) !== JSON.stringify(activeMember)) {
          setActiveMember(parsed);
        }
      } catch (e) {}
    };

    const t = setInterval(syncMember, 500);
    window.addEventListener("storage", syncMember);

    return () => {
      clearInterval(t);
      window.removeEventListener("storage", syncMember);
    };
  }, [activeMember]);

  // If no hero has been chosen on the kiosk, return to dashboard where kiosk handles selection
  useEffect(() => {
    if (!activeMember && !isAdminView && !me.isLoading) {
      navigate({ to: "/dashboard" });
    }
  }, [activeMember, isAdminView, me.isLoading, navigate]);

  // --- INACTIVITY TIMEOUT ---
  useEffect(() => {
    if (!activeMember) return;
    const interval = setInterval(() => {
      if (Date.now() - lastActivity > 60000) {
        setActiveMember(null);
        setIsAdminView(false);
        localStorage.removeItem("kiosk_active_member");
        toast("Vault Standby", { icon: <Timer className="size-4" /> });
        navigate({ to: "/dashboard" });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeMember, lastActivity, navigate]);

  const recordActivity = useCallback(() => setLastActivity(Date.now()), []);

  // SECURITY: Only parent characters with admin credentials can customize the shop
  const isParentCharacter = (activeMember?.is_parent === 1 || activeMember?.is_parent === true || activeMember?.role?.toLowerCase() === "admin") && activeMember?.is_kid !== 1;
  const canAccessAdmin = Boolean(isSystemAdmin && (isParentCharacter || !activeMember));

  useEffect(() => {
    if (!canAccessAdmin && isAdminView) {
      setIsAdminView(false);
    }
  }, [canAccessAdmin, isAdminView]);

  if (me.isLoading) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[85vh] p-6">
          <p className="font-black text-slate-400 uppercase tracking-widest text-xs italic animate-pulse text-center">
            Synchronizing Vault...
          </p>
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
        {/* Render SCREEN A: Admin Panel Catalog View (Admin Only) */}
        {isAdminView && canAccessAdmin ? (
          <RewardAdminCatalog
            activeMember={activeMember}
            onBack={() => setIsAdminView(false)}
            isAdminView={isAdminView}
            setIsAdminView={setIsAdminView}
          />
        ) : activeMember ? (
          // Render SCREEN B: Active Kid Shop View (Strictly uses the kiosk-selected hero)
          <RewardActiveShop
            activeMember={activeMember}
            onBack={() => {
              // Exiting Vault cleanly returns to Dashboard without popping open extra pickers
              navigate({ to: "/dashboard" });
            }}
            isAdminView={isAdminView}
            setIsAdminView={setIsAdminView}
            canAccessAdmin={canAccessAdmin}
          />
        ) : null}

        <footer className="pt-20 text-center">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] flex items-center justify-center gap-2 opacity-50">
            <Timer className="size-3" /> Auto-Reset Vault Engaged
          </p>
        </footer>
      </div>
    </AppShell>
  );
}
