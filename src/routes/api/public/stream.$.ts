import { createFileRoute } from "@tanstack/react-router";

const ALLOWED_HOSTS = [
  /\.cloudfront\.net$/,
  /\.pw\.live$/,
  /\.penpencil\.co$/,
  /\.pw\.io$/,
  /\.pimaxer\.in$/,
  /\.eu\.org$/,
  /pw-api-proxy-v1-dc90b930c4fa\.herokuapp\.com$/,
  /\.herokuapp\.com$/,
];

function isAllowed(host: string) {
  return ALLOWED_HOSTS.some((re) => re.test(host));
}

async function proxy({ request, params }: { request: Request; params: Record<string, string> }) {
  const splat = params["_splat"] ?? "";
  const [host, ...rest] = splat.split("/");
  if (!host || !isAllowed(host)) return new Response("Forbidden host", { status: 403 });

  const incoming = new URL(request.url);
  const target = `https://${host}/${rest.join("/")}${incoming.search}`;

  const upstream = await fetch(target, {
    headers: { accept: request.headers.get("accept") ?? "*/*" },
  });

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  const headers = new Headers({
    "content-type": contentType,
    "access-control-allow-origin": "*",
    "cache-control": "public, max-age=300",
  });

  return new Response(upstream.body, { status: upstream.status, headers });
}

export const Route = createFileRoute("/api/public/stream/$")({
  server: {
    handlers: {
      GET: proxy,
      HEAD: proxy,
      OPTIONS: () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-headers": "*",
            "access-control-allow-methods": "GET,HEAD,OPTIONS",
          },
        }),
    },
  },
});
