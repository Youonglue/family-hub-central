import { createAPIFileRoute } from '@tanstack/react-start/api';

export const APIRoute = createAPIFileRoute('/api/auth/me')({
  GET: async () => {
    // Return a standard Web Response
    return Response.json({
      id: 'some-id',
      username: 'test-user',
      is_admin: false,
      first_run: false
    });
  },
});
