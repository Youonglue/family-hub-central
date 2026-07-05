import { createAPIFileRoute } from '@tanstack/react-start/api';

export const APIRoute = createAPIFileRoute('/api/auth/login')({
  POST: async ({ request }) => {
    const body = await request.json();
    const { username, password } = body;

    // Perform your database login verification here

    // Return a standard Web Response matching your user type
    return Response.json({
      id: 'some-id',
      username: username,
      is_admin: false,
      first_run: false
    });
  },
});
