import { corsHeaders, error, handleError, json, methodNotAllowed, readJson, requireAllowedCheckoutOrigin } from "../../lib/http.mjs";
import { randomLowercase, throttleRequest } from "../../lib/security.mjs";
import { checkoutConfig, productId, stripeClient, validatePrice } from "../../lib/stripe.mjs";
import { validEmail, validUuid } from "../../lib/validation.mjs";

export function checkoutSessionParams(config, { email, origin, attemptId, integrationIdentifier }) {
  return {
    mode: "payment",
    ...(config.managedPayments ? { managed_payments: { enabled: true } } : {}),
    customer_email: email,
    line_items: [{ price: config.priceId, quantity: 1 }],
    success_url: `${origin}/checkout/success/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/buy/`,
    metadata: { checkout_attempt_id: attemptId },
    integration_identifier: integrationIdentifier,
  };
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") {
    const preflightOrigin = request.headers.get("Origin");
    try {
      const { requestOrigin } = requireAllowedCheckoutOrigin({ headers: new Headers({ Origin: preflightOrigin || "" }) }, env);
      return new Response(null, { status: 204, headers: corsHeaders(requestOrigin) });
    } catch {
      return new Response(null, { status: 204 });
    }
  }
  if (request.method !== "POST") return methodNotAllowed(["POST"]);
  let requestOrigin;
  try {
    const originResult = requireAllowedCheckoutOrigin(request, env);
    requestOrigin = originResult.requestOrigin;
    const origin = originResult.appOrigin;
    const body = await readJson(request, 2_048);
    if (!validEmail(body.email) || !validUuid(body.attemptId)) return error("invalid_checkout", "Email or checkout attempt is invalid", 400);
    if (!await throttleRequest(env.REVOPS_DB, request, "checkout", 10)) return error("rate_limited", "Too many checkout attempts", 429);
    const email = body.email.trim().toLowerCase();
    const config = checkoutConfig(env);
    const stripe = stripeClient(env);
    const price = await stripe.prices.retrieve(config.priceId);
    if (!validatePrice(price, config)) throw new Error(`Configured Stripe Price failed validation: ${productId(price) ? "mismatch" : "missing product"}`);

    const user = await env.REVOPS_DB.prepare(`
      INSERT INTO users (id, email) VALUES (?1, ?2)
      ON CONFLICT(email) DO UPDATE SET email = excluded.email
      RETURNING id
    `).bind(crypto.randomUUID(), email).first();
    await env.REVOPS_DB.prepare(`
      INSERT OR IGNORE INTO checkout_attempts
        (id, user_id, expected_price_id, expected_product_id, expected_amount, expected_currency)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6)
    `).bind(body.attemptId, user.id, config.priceId, config.productId, config.amount, config.currency).run();
    const attempt = await env.REVOPS_DB.prepare("SELECT * FROM checkout_attempts WHERE id = ?1").bind(body.attemptId).first();
    if (!attempt || attempt.user_id !== user.id || attempt.expected_price_id !== config.priceId || attempt.expected_product_id !== config.productId || attempt.expected_amount !== config.amount || attempt.expected_currency !== config.currency) {
      return error("attempt_conflict", "Checkout attempt cannot be reused", 409);
    }

    const session = await stripe.checkout.sessions.create(checkoutSessionParams(config, {
      email,
      origin,
      attemptId: body.attemptId,
      integrationIdentifier: `revops_pulse_${randomLowercase(8)}`,
    }), { idempotencyKey: body.attemptId });
    if (session.livemode || !session.url || !session.id.startsWith("cs_test_")) throw new Error("Stripe returned an invalid sandbox Checkout Session");
    await env.REVOPS_DB.prepare(`
      UPDATE checkout_attempts SET stripe_session_id = ?1, status = 'checkout_open', updated_at = unixepoch() WHERE id = ?2
    `).bind(session.id, body.attemptId).run();
    return json({ checkoutUrl: session.url }, 200, corsHeaders(requestOrigin));
  } catch (caught) {
    const response = handleError(caught, "/api/checkout/create");
    if (!requestOrigin) return response;
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders(requestOrigin))) headers.set(key, value);
    return new Response(response.body, { status: response.status, headers });
  }
}
