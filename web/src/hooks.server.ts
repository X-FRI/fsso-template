// 文件职责：在 SvelteKit Node 进程里把 /api 与 /openapi 原样代理到 FSSO_API_ORIGIN 指向的 F# Host；只转发 HTTP，不打开 SQLite，也不做数据库认证或会话，空响应不附带正文。
import type { Handle } from "@sveltejs/kit";

const HOP_BY_HOP = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "content-encoding",
];

function apiOrigin(): string {
  return (process.env.FSSO_API_ORIGIN || "http://127.0.0.1:5080").replace(/\/+$/, "");
}

function isProxied(pathname: string): boolean {
  return (
    pathname === "/api" ||
    pathname.startsWith("/api/") ||
    pathname === "/openapi" ||
    pathname.startsWith("/openapi/")
  );
}

export const handle: Handle = async ({ event, resolve }) => {
  if (!isProxied(event.url.pathname)) return resolve(event);

  const target = new URL(`${event.url.pathname}${event.url.search}`, `${apiOrigin()}/`);
  const headers = new Headers(event.request.headers);
  for (const name of HOP_BY_HOP) headers.delete(name);

  const method = event.request.method;
  const hasBody = method !== "GET" && method !== "HEAD";
  const upstream = await fetch(target, {
    method,
    headers,
    body: hasBody ? await event.request.arrayBuffer() : undefined,
    redirect: "manual",
  });

  const responseHeaders = new Headers(upstream.headers);
  for (const name of HOP_BY_HOP) responseHeaders.delete(name);
  const empty = upstream.status === 204 || upstream.status === 205 || upstream.status === 304;
  return new Response(empty ? null : upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
};
