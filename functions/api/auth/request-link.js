import { handleError, json, methodNotAllowed, readJson, requireSameOrigin } from "../../lib/http.mjs";
import { GENERIC_MAGIC_LINK_RESPONSE, issueMagicLink, throttleMagicLink } from "../../lib/magic-link.mjs";
import { validEmail } from "../../lib/validation.mjs";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return methodNotAllowed(["POST"]);

  try {
    requireSameOrigin(request, env);
  } catch (caught) {
    return handleError(caught, "/api/auth/request-link");
  }
  try {
    const body = await readJson(request, 2_048);
    if (!validEmail(body.email)) return json(GENERIC_MAGIC_LINK_RESPONSE, 202);
    const email = body.email.trim().toLowerCase();
    const allowed = await throttleMagicLink(env.REVOPS_DB, email);

    const user = await env.REVOPS_DB.prepare(`
      SELECT users.id
      FROM users JOIN lifetime_entitlements ON lifetime_entitlements.user_id = users.id
      WHERE users.email = ?1 AND lifetime_entitlements.status = 'active'
      LIMIT 1
    `).bind(email).first();
    if (user && allowed) await issueMagicLink({ db: env.REVOPS_DB, env, userId: user.id, email, throttled: true });
    return json(GENERIC_MAGIC_LINK_RESPONSE, 202);
  } catch (caught) {
    console.error(JSON.stringify({ message: "magic_link_request_failed", error: caught instanceof Error ? caught.message : "unknown" }));
    return json(GENERIC_MAGIC_LINK_RESPONSE, 202);
  }
}
