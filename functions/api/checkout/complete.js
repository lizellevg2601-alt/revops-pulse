import { error, handleError, json, methodNotAllowed, readJson, requireSameOrigin } from "../../lib/http.mjs";
import { GENERIC_MAGIC_LINK_RESPONSE, issueMagicLink } from "../../lib/magic-link.mjs";
import { validCheckoutSessionId } from "../../lib/validation.mjs";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return methodNotAllowed(["POST"]);
  try {
    requireSameOrigin(request, env);
    const body = await readJson(request, 2_048);
    if (!validCheckoutSessionId(body.sessionId)) return error("invalid_session", "Checkout session is invalid", 400);
    const buyer = await env.REVOPS_DB.prepare(`
      SELECT users.id AS user_id, users.email
      FROM orders
      JOIN users ON users.id = orders.user_id
      JOIN lifetime_entitlements ON lifetime_entitlements.user_id = users.id
      WHERE orders.stripe_session_id = ?1
        AND orders.status = 'paid'
        AND NOT EXISTS (
          SELECT 1 FROM payment_revocations
          WHERE payment_revocations.stripe_payment_intent_id = orders.stripe_payment_intent_id
            AND payment_revocations.active = 1
        )
        AND lifetime_entitlements.status = 'active'
      LIMIT 1
    `).bind(body.sessionId).first();
    if (!buyer) return json({ ...GENERIC_MAGIC_LINK_RESPONSE, pending: true }, 202);
    await issueMagicLink({
      db: env.REVOPS_DB,
      env,
      userId: buyer.user_id,
      email: buyer.email.trim().toLowerCase(),
      requestKey: `checkout:${body.sessionId}`,
    });
    return json({ ...GENERIC_MAGIC_LINK_RESPONSE, pending: false }, 200);
  } catch (caught) {
    return handleError(caught, "/api/checkout/complete");
  }
}
