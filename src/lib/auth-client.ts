// src/lib/auth-client.ts
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
  role?: string;
  is_admin: boolean;
  needs_pin_setup?: number;
  has_pin?: boolean;
  ntfy_topic?: string;
  first_run: boolean; // true when no users exist yet — signup is open
};

export function getMe(): Promise<Me | null> {
  return fetch("/api/auth/me", { credentials: "same-origin" }).then(async (r) => {
    if (r.status === 401) {
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

function post(path: string, body: unknown) {
  return fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).then(j);
}

export const changePassword = (currentPassword: string, newPassword: string) =>
  post("/api/auth/change-password", { currentPassword, newPassword });

export const changeUsername = (currentPassword: string, newUsername: string) =>
  post("/api/auth/change-username", { currentPassword, newUsername });

export const getPinStatus = (): Promise<{ has_pin: boolean; needs_pin_setup: boolean }> =>
  fetch("/api/auth/pin-status", { credentials: "same-origin" }).then(j);

export const setPin = (currentPassword: string, pin: string) =>
  post("/api/auth/set-pin", { currentPassword, pin });

export const clearPin = (currentPassword: string) =>
  post("/api/auth/clear-pin", { currentPassword });

export const verifyPin = (pin: string, userId?: string) =>
  post("/api/auth/verify-pin", { pin, userId });
