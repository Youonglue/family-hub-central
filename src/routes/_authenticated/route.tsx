import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context }) => {
    // Force a fresh check from the server
    try {
      const res = await fetch('/api/auth/me');
      const auth = await res.json();
      
      // If server says no ID, user is not logged in. Redirect to auth.
      if (!auth || !auth.id) {
        throw redirect({ to: '/auth' });
      }
    } catch (err) {
      throw redirect({ to: '/auth' });
    }
  },
})
