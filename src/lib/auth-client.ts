// src/lib/auth-client.ts
// Hardened client for the local Fastify auth endpoints.
// Session state lives strictly in an HttpOnly, SameSite=Strict cookie.

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
  needs_pin_setup?: boolean | number;
  has_pin?: boolean;
  has_recovery_key?: boolean;
  ntfy_topic?: string;
  first_run: boolean;
};

export function getMe(): Promise<Me | null> {
  return fetch("/api/auth/me", { 
    credentials: "same-origin",
    headers: { "Accept": "application/json" }
  }).then(async (r) => {
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
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ username: username.trim(), password }),
  }).then(j);
}

export function register(username: string, password: string): Promise<Me> {
  return fetch("/api/auth/register", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ username: username.trim(), password }),
  }).then(j);
}

export function logout(): Promise<{ success: true }> {
  return fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Accept": "application/json" }
  }).then(j);
}

function post(path: string, body: unknown) {
  return fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(body),
  }).then(j);
}

export const changePassword = (currentPassword: string, newPassword: string) =>
  post("/api/auth/change-password", { currentPassword, newPassword });

export const changeUsername = (currentPassword: string, newUsername: string) =>
  post("/api/auth/change-username", { currentPassword, newUsername: newUsername.trim() });

export const getPinStatus = (): Promise<{ has_pin: boolean; needs_pin_setup: boolean }> =>
  fetch("/api/auth/pin-status", { 
    credentials: "same-origin",
    headers: { "Accept": "application/json" }
  }).then(j);

export const setPin = (currentPassword: string, pin: string) =>
  post("/api/auth/set-pin", { currentPassword, pin });

export const clearPin = (currentPassword: string) =>
  post("/api/auth/clear-pin", { currentPassword });

export const verifyPin = (pin: string, userId?: string) =>
  post("/api/auth/verify-pin", { pin, userId });

export const emergencyRecover = (payload: { username: string; recoveryKey: string; newPassword: string; newPin?: string }) =>
  post("/api/auth/emergency-recover", payload);
