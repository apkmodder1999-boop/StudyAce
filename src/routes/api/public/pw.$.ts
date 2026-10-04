import { createFileRoute } from "@tanstack/react-router";

const UPSTREAM_HEROKU = "https://pw-api-proxy-v1-dc90b930c4fa.herokuapp.com";
const UPSTREAM_PENPENCIL = "https://api.penpencil.co";

/**
 * Same-origin fallback proxy for PW APIs.
 * Routes through pw-api-proxy-v1-dc90b930c4fa.herokuapp.com as primary.
 */
async function handler({ request, params }: { request: Request; params: Record<string, string> }) {
  const rawSplat = params["_splat"] ?? "";
  const splat = rawSplat.replace(/^radha\/?/, "");
  const incoming = new URL(request.url);

  // Extract token from multiple potential sources
  const envToken =
    process.env["PW_TOKEN"] || process.env["AUTH_TOKEN"] || process.env["PW_AUTH_TOKEN"] || "";
  const clientAuth = request.headers.get("authorization") || "";
  const queryToken = incoming.searchParams.get("token") || "";

  let bearerToken = "";
  if (clientAuth) {
    bearerToken = clientAuth.startsWith("Bearer ") ? clientAuth.slice(7).trim() : clientAuth.trim();
  } else if (queryToken) {
    bearerToken = queryToken.trim();
  } else if (envToken) {
    bearerToken = envToken.trim();
  }

  // Create clean search string without the token parameter
  const searchParams = new URLSearchParams(incoming.searchParams);
  searchParams.delete("token");
  const cleanSearch = searchParams.toString() ? `?${searchParams.toString()}` : "";

  const targets = [
    `${UPSTREAM_HEROKU}/${splat}${cleanSearch}`,
    `${UPSTREAM_HEROKU}/v1/${splat}${cleanSearch}`,
    `${UPSTREAM_PENPENCIL}/${splat}${cleanSearch}`,
  ];

  let lastErrorStatus = 502;
  let lastErrorBody = JSON.stringify({ error: "Upstream unavailable" });

  for (const target of targets) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      const headers: Record<string, string> = {
        accept: "application/json",
        origin: "https://pw.learntopper.in",
        referer: "https://pw.learntopper.in/",
        "client-type": "WEB",
        "client-version": "1.0.0",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      };

      if (bearerToken) {
        headers["authorization"] = `Bearer ${bearerToken}`;
      }

      const upstream = await fetch(target, {
        signal: controller.signal,
        headers,
      });
      clearTimeout(timeout);

      const body = await upstream.text();

      // If upstream rejects with 401 (token expired/unauthorized), return immediately without wasting time
      if (upstream.status === 401) {
        return new Response(body, {
          status: 401,
          headers: {
            "content-type": "application/json",
            "access-control-allow-origin": "*",
            "cache-control": "no-store",
          },
        });
      }

      if (upstream.ok || upstream.status === 304) {
        // Check if response is valid non-blocked JSON
        if (body.startsWith("{") || body.startsWith("[")) {
          try {
            const parsed = JSON.parse(body);
            // If upstream returned token expired error in JSON body
            if (
              parsed.code === 401 ||
              parsed.error?.status === 401 ||
              parsed.message?.toLowerCase().includes("unauthorised") ||
              parsed.error?.message?.toLowerCase().includes("token")
            ) {
              return new Response(body, {
                status: 401,
                headers: {
                  "content-type": "application/json",
                  "access-control-allow-origin": "*",
                  "cache-control": "no-store",
                },
              });
            }

            if (parsed.success !== false || (parsed.data && parsed.data.length > 0)) {
              return new Response(body, {
                status: upstream.status,
                headers: {
                  "content-type": "application/json",
                  "access-control-allow-origin": "*",
                  "cache-control": "no-store",
                },
              });
            }
          } catch {
            // JSON parse failed, try next
          }
        }
      } else {
        lastErrorStatus = upstream.status;
        lastErrorBody = body;
      }
    } catch {
      clearTimeout(timeout);
      // Try next target
    }
  }

  return new Response(lastErrorBody, {
    status: lastErrorStatus,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });
}

export const Route = createFileRoute("/api/public/pw/$")({
  server: {
    handlers: {
      GET: handler,
      OPTIONS: () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-headers": "*",
            "access-control-allow-methods": "GET,OPTIONS",
          },
        }),
    },
  },
});
