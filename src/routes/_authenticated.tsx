import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // FORCE BYPASS: Do not call supabase.auth.getSession() at all.
    // We just return a hardcoded user object.
    return {
      user: { id: "local-user", email: "admin@family.local" }
    };
  },
  component: () => <Outlet />,
});
