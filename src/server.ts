import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import {
  processTelegramLog,
  handleTelegramWebhook,
  getRegisteredGroups,
  syncDiscoveredChats,
  CORS_HEADERS,
} from "./lib/telegram-logger";
import { getAdminDashboardStats, updateStudentName, recordEvent } from "./lib/admin-store";

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
    try {
      const url = new URL(request.url);

      // Handle Telegram Logger API in both Preview & Local server
      if (url.pathname === "/api/log") {
        if (request.method === "OPTIONS") {
          return new Response(null, { status: 204, headers: CORS_HEADERS });
        }
        return await processTelegramLog(request, env as Record<string, string> | undefined);
      }

      // Real-time Telegram Webhook for Auto-Discovery
      if (url.pathname === "/api/telegram-webhook") {
        if (request.method === "OPTIONS") {
          return new Response(null, { status: 204, headers: CORS_HEADERS });
        }
        return await handleTelegramWebhook(request);
      }

      // Status check showing all auto-discovered active groups
      if (url.pathname === "/api/telegram-status") {
        await syncDiscoveredChats();
        return new Response(
          JSON.stringify({
            status: "active",
            autoDiscoveryEnabled: true,
            registeredGroups: getRegisteredGroups(),
          }),
          { status: 200, headers: CORS_HEADERS },
        );
      }

      // Admin Dashboard Protected Stats API (Passcode: NAITIK)
      if (url.pathname === "/api/admin/stats") {
        if (request.method === "OPTIONS") {
          return new Response(null, { status: 204, headers: CORS_HEADERS });
        }
        const passcode =
          request.headers.get("x-admin-passcode") || url.searchParams.get("passcode") || "";
        const expectedPasscode = (process.env.ADMIN_PASSCODE || "NAITIK").trim().toUpperCase();
        if (passcode.trim().toUpperCase() !== expectedPasscode) {
          return new Response(JSON.stringify({ error: "Unauthorized. Passcode incorrect." }), {
            status: 401,
            headers: CORS_HEADERS,
          });
        }

        const stats = getAdminDashboardStats();
        return new Response(JSON.stringify(stats), {
          status: 200,
          headers: CORS_HEADERS,
        });
      }

      // Admin or User update student name
      if (url.pathname === "/api/admin/update-name" && request.method === "POST") {
        try {
          const body = (await request.json()) as { sessionId?: string; name?: string };
          if (body.sessionId && body.name) {
            updateStudentName(body.sessionId, body.name);
          }
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: CORS_HEADERS,
          });
        } catch {
          return new Response(JSON.stringify({ error: "Invalid payload" }), {
            status: 400,
            headers: CORS_HEADERS,
          });
        }
      }

      // Client Heartbeat API: keeps online user status & study seconds updated
      if (url.pathname === "/api/heartbeat" && request.method === "POST") {
        try {
          const body = (await request.json()) as Record<string, unknown>;
          recordEvent({
            sessionId: body["sessionId"] as string | undefined,
            studentName: body["studentName"] as string | undefined,
            eventType: "heartbeat",
            watchSeconds: Number(body["watchSeconds"] || 0),
            pageUrl: body["pageUrl"] as string | undefined,
            ip: request.headers.get("cf-connecting-ip") || "Client",
            userAgent: request.headers.get("user-agent") || "Web Browser",
          });
          return new Response(JSON.stringify({ status: "alive" }), {
            status: 200,
            headers: CORS_HEADERS,
          });
        } catch {
          return new Response(JSON.stringify({ status: "ok" }), {
            status: 200,
            headers: CORS_HEADERS,
          });
        }
      }

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
