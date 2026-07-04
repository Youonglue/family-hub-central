// Tiny client for the local Node server's auth endpoints.
// Session state lives in an HttpOnly cookie; the browser just reads /me.

async function j(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `${res.status} ${res.statusText}`);
  }
  return res.json();
}

export type Me = {
  id: string;
  username: string;
  is_admin: boolean;
  first_run: boolean; // true when no users exist yet — signup is open
};

export function getMe(): Promise<Me | null> {
  return fetch("/api/auth/me", { credentials: "same-origin" }).then(async (r) => {
    if (r.status === 401) {
      // Even when signed out, server tells us whether the DB has any users.
      const body = (await r.json().catch(() => ({}))) as { first_run?: boolean };
      return body.first_run ? ({ first_run: true } as unknown as Me) : null;
    }
    return j(r);
  });
}

export function login(username: string, password: string): Promise<Me> {
  return fetch("/api/auth/login", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  }).then(j);
}

export function register(username: string, password: string): Promise<Me> {
  return fetch("/api/auth/register", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  }).then(j);
}

export function logout(): Promise<{ ok: true }> {
  return fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
  }).then(j);
}
