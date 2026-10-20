import { getSession } from "./lib/security.mjs";
import { error } from "./lib/http.mjs";

const PUBLIC_APIS = new Set([
  "/api/auth/request-link",
  "/api/auth/consume",
  "/api/checkout/create",
  "/api/checkout/complete",
  "/api/stripe/webhook",
]);

export async function onRequest(context) {
  const { request, env } = context;
  const path = new URL(request.url).pathname.replace(/\/$/, "") || "/";
  if (PUBLIC_APIS.has(path)) return context.next();

  if (!env.REVOPS_DB) {
    return path.startsWith("/api/") || path === "/feed-data.json"
      ? error("service_unavailable", "Authentication service is unavailable", 503)
      : new Response("Service unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const user = await getSession(request, env.REVOPS_DB);
    if (user) {
      context.data.user = user;
      return context.next();
    }
  } catch (caught) {
    console.error(JSON.stringify({ message: "authentication_failed", path, error: caught instanceof Error ? caught.message : "unknown" }));
    return path.startsWith("/api/") || path === "/feed-data.json"
      ? error("service_unavailable", "Authentication service is unavailable", 503)
      : new Response("Service unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  if (path.startsWith("/api/") || path === "/feed-data.json") return error("unauthorized", "Authentication required", 401);
  return Response.redirect(`${new URL(request.url).origin}/login/`, 302);
}
