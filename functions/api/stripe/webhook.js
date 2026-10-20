import { handleError, json, methodNotAllowed, readBoundedText } from "../../lib/http.mjs";
import { applyStripeTransition, asyncPaymentFailureStatements, fulfillmentStatements, paymentRestrictionStatements } from "../../lib/payment-state.mjs";
import { productId, requireSandboxEnvironment, stripeClient, validatePrice, verifyStripeEvent } from "../../lib/stripe.mjs";

const FULFILLMENT_EVENTS = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded"]);
const DISPUTE_EVENTS = new Set(["charge.dispute.created", "charge.dispute.funds_withdrawn", "charge.dispute.funds_reinstated", "charge.dispute.closed"]);
const FAVORABLE_DISPUTE_STATUSES = new Set(["won", "prevented", "warning_closed"]);
const TERMINAL_DISPUTE_STATUSES = new Set([...FAVORABLE_DISPUTE_STATUSES, "lost"]);
const SUPPORTED_EVENTS = new Set([...FULFILLMENT_EVENTS, "checkout.session.async_payment_failed", "charge.refunded", ...DISPUTE_EVENTS]);

async function checkoutPayment(env, stripe, eventSession) {
  const session = await stripe.checkout.sessions.retrieve(eventSession.id, {
    expand: ["line_items.data.price.product", "payment_intent.latest_charge"],
  });
  const lineItems = session.line_items?.data || [];
  const price = lineItems[0]?.price;
  const attemptId = session.metadata?.checkout_attempt_id;
  const attempt = attemptId
    ? await env.REVOPS_DB.prepare("SELECT * FROM checkout_attempts WHERE id = ?1 AND stripe_session_id = ?2").bind(attemptId, session.id).first()
    : null;
  const expected = attempt && {
    priceId: attempt.expected_price_id,
    productId: attempt.expected_product_id,
    amount: attempt.expected_amount,
    currency: attempt.expected_currency,
  };
  if (
    session.livemode || session.payment_status !== "paid" || lineItems.length !== 1 || lineItems[0].quantity !== 1 ||
    !attempt || !validatePrice(price, expected, false) || session.amount_total !== expected.amount || session.currency !== expected.currency ||
    attempt.expected_product_id !== productId(price) || attempt.expected_price_id !== price.id ||
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
    amount: expected.amount,
    currency: expected.currency,
    restrictions: [
      ...(latestChargeObject?.amount_refunded >= latestChargeObject?.amount ? ["refund"] : []),
      ...(latestChargeObject?.disputed ? ["dispute"] : []),
    ],
  };
}

export async function restrictionFromEvent(stripe, event) {
  const object = event.data.object;
  if (event.type === "charge.refunded") {
    const charge = await stripe.charges.retrieve(object.id);
    const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
    if (!paymentIntentId) throw new Error("Refund event is missing a PaymentIntent");
    return {
      paymentIntentId,
      chargeId: charge.id,
      reason: "refund",
      active: charge.refunded === true && charge.amount_refunded >= charge.amount,
      stateRank: charge.refunded === true && charge.amount_refunded >= charge.amount ? 2 : 1,
      eventId: event.id,
      eventCreated: event.created,
    };
  }

  const dispute = await stripe.disputes.retrieve(object.id);
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
  let paymentIntentId = typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id;
  if (!paymentIntentId && chargeId) {
    const charge = await stripe.charges.retrieve(chargeId);
    paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  }
  if (!paymentIntentId || !chargeId) throw new Error("Dispute event is missing payment identifiers");
  return {
    paymentIntentId,
    chargeId,
    reason: "dispute",
    active: !FAVORABLE_DISPUTE_STATUSES.has(dispute.status),
    stateRank: TERMINAL_DISPUTE_STATUSES.has(dispute.status) ? 2 : 1,
    eventId: event.id,
    eventCreated: event.created,
  };
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return methodNotAllowed(["POST"]);
  let event;
  try {
    const rawBody = await readBoundedText(request, 1_048_576);
    requireSandboxEnvironment(env);
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
        for (const reason of payment.restrictions) {
          statements.push(...paymentRestrictionStatements(env.REVOPS_DB, {
            paymentIntentId: payment.paymentIntentId,
            chargeId: payment.chargeId,
            reason,
            active: true,
            stateRank: reason === "refund" ? 2 : 1,
            eventId: event.id,
            eventCreated: event.created,
          }));
        }
        payment.eventId = event.id;
        statements.push(...fulfillmentStatements(env.REVOPS_DB, payment));
        await applyStripeTransition(env.REVOPS_DB, event, statements);
      } else {
        await applyStripeTransition(env.REVOPS_DB, event, []);
      }
    } else if (event.type === "checkout.session.async_payment_failed") {
      await applyStripeTransition(env.REVOPS_DB, event, asyncPaymentFailureStatements(env.REVOPS_DB, event.data.object.id, event.id));
    } else {
      const restriction = await restrictionFromEvent(stripe, event);
      await applyStripeTransition(env.REVOPS_DB, event, paymentRestrictionStatements(env.REVOPS_DB, restriction));
    }
    return json({ received: true });
  } catch (caught) {
    return handleError(caught, "/api/stripe/webhook");
  }
}
