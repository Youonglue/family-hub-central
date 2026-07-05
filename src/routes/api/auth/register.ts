import { createAPIFileRoute } from '@tanstack/react-start/api';

export const APIRoute = createAPIFileRoute('/api/auth/register')({
  POST: async ({ request }) => {
    const body = await request.json();
    const { username, password } = body;

    // Perform your database logic here (e.g., Supabase signup)

    // Return a standard Web Response
    return Response.json({
      id: 'some-id',
      username: username,
      is_admin: false,
      first_run: false
    });
  },
});
