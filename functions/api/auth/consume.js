import { error, handleError, json, methodNotAllowed, readJson, requireSameOrigin } from "../../lib/http.mjs";
import { consumeLoginToken, createSession, sessionCookie } from "../../lib/security.mjs";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return methodNotAllowed(["POST"]);
  try {
    requireSameOrigin(request, env);
    const body = await readJson(request, 2_048);
    const consumed = await consumeLoginToken(env.REVOPS_DB, body.token);
    if (!consumed) return error("invalid_token", "This sign-in link is invalid or expired", 400);
    const entitlement = await env.REVOPS_DB.prepare("SELECT 1 AS active FROM lifetime_entitlements WHERE user_id = ?1 AND status = 'active'").bind(consumed.user_id).first();
    if (!entitlement) return error("access_revoked", "Access is not active", 403);
    const session = await createSession(env.REVOPS_DB, consumed.user_id);
    return json({ authenticated: true }, 200, { "Set-Cookie": sessionCookie(session) });
  } catch (caught) {
    return handleError(caught, "/api/auth/consume");
  }
}
