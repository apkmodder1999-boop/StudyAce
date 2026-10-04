import { createFileRoute } from "@tanstack/react-router";

const HEROKU_UPSTREAM = "https://pw-api-proxy-v1-dc90b930c4fa.herokuapp.com";
const UPSTREAM = "https://a.pimaxer.in/v1/videos/video-url-details";

/**
 * Server-side proxy for video details and MP4 stream resolution.
 */
async function handler({ request }: { request: Request }) {
  const url = new URL(request.url);
  const parentId = url.searchParams.get("parentId");
  const childId = url.searchParams.get("childId") || url.searchParams.get("videoId");
  if (!childId) {
    return json({ error: "Missing childId/videoId" }, 400);
  }

  // 1. Try Heroku /v1/videos/{childId} first
  try {
    const res = await fetch(`${HEROKU_UPSTREAM}/v1/videos/${childId}`, {
      headers: {
        accept: "application/json",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      },
    });
    if (res.ok) {
      const body = (await res.json()) as {
        success?: boolean;
        data?: {
          videoUrl?: string;
          name?: string;
          image?: string;
          duration?: string;
          types?: string[];
        };
      };
      if (body?.data?.videoUrl) {
        // Rewrite a.pimaxer.in to the required Heroku proxy base
        const cleanVideoUrl = body.data.videoUrl.replace("https://a.pimaxer.in", HEROKU_UPSTREAM);
        return json(
          {
            success: true,
            data: {
              ...body.data,
              videoUrl: cleanVideoUrl,
              url: cleanVideoUrl,
            },
          },
          200,
        );
      }
    }
  } catch {
    /* fallback to legacy endpoint */
  }

  // 2. Fallback to video-url-details
  if (parentId) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`${UPSTREAM}?parentId=${parentId}&childId=${childId}`, {
          headers: {
            accept: "application/json",
            origin: "https://pw.learntopper.in",
            referer: "https://pw.learntopper.in/",
            "user-agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
          },
        });
        const body = (await res.json()) as {
          success?: boolean;
          error?: string;
          data?: { url?: string };
        };
        if (res.ok && body?.data?.url && !body.error) return json(body, 200);
      } catch {
        /* retry */
      }
      if (attempt < 2) await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }

  return json({ error: "Upstream unavailable" }, 502);
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
    },
  });
}

export const Route = createFileRoute("/api/public/video-url")({
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
