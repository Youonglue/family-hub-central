import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
  // Return a fake user so the app thinks we are authenticated
  return {
    user: { id: "local-user", email: "admin@family.local" }
  };
},
  component: () => <Outlet />,
});
