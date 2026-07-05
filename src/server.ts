import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    console.log("Incoming Request URL:", request.url);
// --- API INTERCEPTOR BLOCK ---
    // 1. Handle Registration
    if (request.url.includes('/api/auth/register') && request.method === 'POST') {
      const body = await request.json();
      return new Response(JSON.stringify({ 
        id: '12345', 
        username: body.username, 
        is_admin: false, 
        first_run: false 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Handle Login
    if (request.url.includes('/api/auth/login') && request.method === 'POST') {
      const body = await request.json();
      return new Response(JSON.stringify({ 
        id: '12345', 
        username: body.username, 
        is_admin: false, 
        first_run: false 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Handle 'Me' (Session Check)
    if (request.url.includes('/api/auth/me') && request.method === 'GET') {
      return new Response(JSON.stringify({ 
        id: '12345', 
        username: 'test-user', 
        is_admin: false, 
        first_run: false 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    // --- END OF INTERCEPTOR ---     
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
