import { handleError, json, methodNotAllowed, readBoundedText } from "../../lib/http.mjs";
import { applyStripeTransition, asyncPaymentFailureStatements, fulfillmentStatements, revocationStatements } from "../../lib/payment-state.mjs";
import { checkoutConfig, productId, stripeClient, validatePrice, verifyStripeEvent } from "../../lib/stripe.mjs";

const FULFILLMENT_EVENTS = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded"]);
const DISPUTE_EVENTS = new Set(["charge.dispute.created", "charge.dispute.funds_withdrawn", "charge.dispute.closed"]);
const SUPPORTED_EVENTS = new Set([...FULFILLMENT_EVENTS, "checkout.session.async_payment_failed", "charge.refunded", ...DISPUTE_EVENTS]);

async function checkoutPayment(env, stripe, eventSession) {
  const config = checkoutConfig(env);
  const session = await stripe.checkout.sessions.retrieve(eventSession.id, {
    expand: ["line_items.data.price.product", "payment_intent.latest_charge"],
  });
  const lineItems = session.line_items?.data || [];
  const price = lineItems[0]?.price;
  const attemptId = session.metadata?.checkout_attempt_id;
  const attempt = attemptId
    ? await env.REVOPS_DB.prepare("SELECT * FROM checkout_attempts WHERE id = ?1 AND stripe_session_id = ?2").bind(attemptId, session.id).first()
    : null;
  if (
    session.livemode || session.payment_status !== "paid" || lineItems.length !== 1 || lineItems[0].quantity !== 1 ||
    !validatePrice(price, config) || session.amount_total !== config.amount || session.currency !== config.currency ||
    !attempt || attempt.expected_product_id !== productId(price) || attempt.expected_price_id !== price.id ||
    attempt.expected_amount !== session.amount_total || attempt.expected_currency !== session.currency
  ) throw new Error("Checkout Session did not match the server-owned offer");

  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  const latestChargeObject = typeof session.payment_intent === "object" && typeof session.payment_intent.latest_charge === "object"
    ? session.payment_intent.latest_charge
    : null;
  const latestCharge = typeof session.payment_intent === "object"
    ? (typeof session.payment_intent.latest_charge === "string" ? session.payment_intent.latest_charge : latestChargeObject?.id)
    : null;
  if (!paymentIntent || !latestCharge) throw new Error("Paid Checkout Session is missing payment identifiers");
  return {
    orderId: `order_${session.id}`,
    attemptId: attempt.id,
    userId: attempt.user_id,
    sessionId: session.id,
    paymentIntentId: paymentIntent,
    chargeId: latestCharge,
    amount: config.amount,
    currency: config.currency,
    revocationReason: latestChargeObject?.disputed ? "dispute" : latestChargeObject?.refunded ? "refund" : null,
  };
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return methodNotAllowed(["POST"]);
  let event;
  try {
    const rawBody = await readBoundedText(request, 1_048_576);
    const stripe = stripeClient(env);
    event = await verifyStripeEvent(stripe, rawBody, request.headers.get("Stripe-Signature"), env.STRIPE_WEBHOOK_SECRET);
    if (event.livemode || !SUPPORTED_EVENTS.has(event.type)) {
      await applyStripeTransition(env.REVOPS_DB, event, [], "ignored");
      return json({ received: true, ignored: true });
    }

    if (FULFILLMENT_EVENTS.has(event.type)) {
      if (event.data.object.payment_status === "paid") {
        const payment = await checkoutPayment(env, stripe, event.data.object);
        const statements = [];
        if (payment.revocationReason) {
          statements.push(...revocationStatements(env.REVOPS_DB, {
            paymentIntentId: payment.paymentIntentId,
            chargeId: payment.chargeId,
            reason: payment.revocationReason,
            eventId: event.id,
          }));
        }
        statements.push(...fulfillmentStatements(env.REVOPS_DB, payment));
        await applyStripeTransition(env.REVOPS_DB, event, statements);
      } else {
        await applyStripeTransition(env.REVOPS_DB, event, []);
      }
    } else if (event.type === "checkout.session.async_payment_failed") {
      await applyStripeTransition(env.REVOPS_DB, event, asyncPaymentFailureStatements(env.REVOPS_DB, event.data.object.id));
    } else {
      const object = event.data.object;
      const chargeId = event.type === "charge.refunded" ? object.id : (typeof object.charge === "string" ? object.charge : object.charge?.id);
      let paymentIntentId = typeof object.payment_intent === "string" ? object.payment_intent : object.payment_intent?.id;
      if (!paymentIntentId && chargeId) {
        const charge = await stripe.charges.retrieve(chargeId);
        paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      }
      if (!paymentIntentId || !chargeId) throw new Error("Revocation event is missing payment identifiers");
      await applyStripeTransition(env.REVOPS_DB, event, revocationStatements(env.REVOPS_DB, {
        paymentIntentId,
        chargeId,
        reason: event.type === "charge.refunded" ? "refund" : "dispute",
        eventId: event.id,
      }));
    }
    return json({ received: true });
  } catch (caught) {
    return handleError(caught, "/api/stripe/webhook");
  }
}
