import { handleError, json, methodNotAllowed, requireSameOrigin } from "../../lib/http.mjs";
import { clearSessionCookie, parseCookies, SESSION_COOKIE, sha256 } from "../../lib/security.mjs";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return methodNotAllowed(["POST"]);
  try {
    requireSameOrigin(request, env);
    const token = parseCookies(request.headers.get("Cookie")).get(SESSION_COOKIE);
    if (token && token.length <= 128) await env.REVOPS_DB.prepare("DELETE FROM sessions WHERE token_hash = ?1").bind(await sha256(token)).run();
    return json({ authenticated: false }, 200, { "Set-Cookie": clearSessionCookie() });
  } catch (caught) {
    return handleError(caught, "/api/auth/logout");
  }
}
