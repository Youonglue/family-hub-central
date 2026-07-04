import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getMe } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const me = await getMe().catch(() => null);
    if (!me || !("id" in me)) {
      throw redirect({ to: "/auth" });
    }
    return { user: me };
  },
  component: () => <Outlet />,
});
