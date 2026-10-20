import { error, handleError, json, methodNotAllowed, readJson, requireSameOrigin } from "../../lib/http.mjs";
import { randomLowercase } from "../../lib/security.mjs";
import { checkoutConfig, productId, stripeClient, validatePrice } from "../../lib/stripe.mjs";
import { validEmail, validUuid } from "../../lib/validation.mjs";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return methodNotAllowed(["POST"]);
  try {
    const origin = requireSameOrigin(request, env);
    const body = await readJson(request, 2_048);
    if (!validEmail(body.email) || !validUuid(body.attemptId)) return error("invalid_checkout", "Email or checkout attempt is invalid", 400);
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

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [{ price: config.priceId, quantity: 1 }],
      success_url: `${origin}/checkout/success/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/buy/`,
      metadata: { checkout_attempt_id: body.attemptId },
      integration_identifier: `revops_pulse_${randomLowercase(8)}`,
    }, { idempotencyKey: body.attemptId });
    if (session.livemode || !session.url || !session.id.startsWith("cs_test_")) throw new Error("Stripe returned an invalid sandbox Checkout Session");
    await env.REVOPS_DB.prepare(`
      UPDATE checkout_attempts SET stripe_session_id = ?1, status = 'checkout_open', updated_at = unixepoch() WHERE id = ?2
    `).bind(session.id, body.attemptId).run();
    return json({ checkoutUrl: session.url });
  } catch (caught) {
    return handleError(caught, "/api/checkout/create");
  }
}
