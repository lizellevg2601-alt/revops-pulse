import assert from "node:assert/strict";
import test from "node:test";
import Stripe from "stripe";
import { applyStripeTransition, asyncPaymentFailureStatements, deriveEntitlementState, fulfillmentStatements, paymentRestrictionStatements } from "../functions/lib/payment-state.mjs";
import { restrictionFromEvent } from "../functions/api/stripe/webhook.js";
import { checkoutSessionParams } from "../functions/api/checkout/create.js";
import { checkoutConfig, requireSandboxEnvironment, validatePrice, verifyStripeEvent } from "../functions/lib/stripe.mjs";

function recordingDb() {
  const batches = [];
  return {
    batches,
    prepare(sql) {
      return { sql, bind(...values) { return { sql, values }; } };
    },
    async batch(statements) { batches.push(statements); },
  };
}

const checkoutEnv = {
  CHECKOUT_ENABLED: "true",
  DEPLOYMENT_ENV: "staging",
  STRIPE_ENVIRONMENT: "sandbox",
  STRIPE_PRICE_ID: "price_test",
  STRIPE_PRODUCT_ID: "prod_test",
  STRIPE_PRICE_AMOUNT: "500",
  STRIPE_PRICE_CURRENCY: "eur",
};

test("Managed Payments requires an exact opt-in inside the existing sandbox gate", () => {
  assert.equal(checkoutConfig(checkoutEnv).managedPayments, false);
  assert.equal(checkoutConfig({ ...checkoutEnv, MANAGED_PAYMENTS_ENABLED: "false" }).managedPayments, false);
  assert.equal(checkoutConfig({ ...checkoutEnv, MANAGED_PAYMENTS_ENABLED: "TRUE" }).managedPayments, false);
  assert.equal(checkoutConfig({ ...checkoutEnv, MANAGED_PAYMENTS_ENABLED: "true" }).managedPayments, true);
  assert.throws(
    () => checkoutConfig({ ...checkoutEnv, DEPLOYMENT_ENV: "production", MANAGED_PAYMENTS_ENABLED: "true" }),
    /Checkout is not configured/,
  );
  assert.throws(
    () => checkoutConfig({ ...checkoutEnv, STRIPE_ENVIRONMENT: "live", MANAGED_PAYMENTS_ENABLED: "true" }),
    /Checkout is not configured/,
  );
});

test("Checkout payload preserves standard mode and adds only the Managed Payments opt-in", () => {
  const input = { email: "buyer@example.com", origin: "https://pulse.example", attemptId: "attempt_1", integrationIdentifier: "revops_pulse_test" };
  const standard = checkoutSessionParams(checkoutConfig(checkoutEnv), input);
  assert.deepEqual(standard, {
    mode: "payment",
    customer_email: input.email,
    line_items: [{ price: "price_test", quantity: 1 }],
    success_url: "https://pulse.example/checkout/success/?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: "https://pulse.example/buy/",
    metadata: { checkout_attempt_id: "attempt_1" },
    integration_identifier: "revops_pulse_test",
  });
  assert.equal(Object.hasOwn(standard, "automatic_tax"), false);

  const managed = checkoutSessionParams(checkoutConfig({ ...checkoutEnv, MANAGED_PAYMENTS_ENABLED: "true" }), input);
  assert.deepEqual(managed, { ...standard, managed_payments: { enabled: true } });
});

test("Stripe verification accepts the exact signed raw body and rejects tampering", async () => {
  const stripe = new Stripe("rk_test_placeholder", { apiVersion: "2026-08-26.dahlia" });
  const payload = JSON.stringify({ id: "evt_test", type: "checkout.session.completed", data: { object: {} } });
  const secret = "whsec_test_secret";
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
  const event = await verifyStripeEvent(stripe, payload, signature, secret);
  assert.equal(event.id, "evt_test");
  await assert.rejects(() => verifyStripeEvent(stripe, `${payload} `, signature, secret), /Invalid webhook signature/);
});

test("historical sandbox prices remain fulfillable after checkout is disabled or rotated", () => {
  const expected = { priceId: "price_old", productId: "prod_old", amount: 500, currency: "eur" };
  const retiredPrice = { id: "price_old", product: "prod_old", unit_amount: 500, currency: "eur", type: "one_time", livemode: false, active: false };
  assert.doesNotThrow(() => requireSandboxEnvironment({ DEPLOYMENT_ENV: "staging", STRIPE_ENVIRONMENT: "sandbox", CHECKOUT_ENABLED: "false" }));
  assert.equal(validatePrice(retiredPrice, expected), false);
  assert.equal(validatePrice(retiredPrice, expected, false), true);
  assert.throws(() => requireSandboxEnvironment({ DEPLOYMENT_ENV: "production", STRIPE_ENVIRONMENT: "sandbox" }), /Checkout is not configured/);
});

test("event ledger and state transitions share one atomic batch", async () => {
  const db = recordingDb();
  await applyStripeTransition(db, { id: "evt_once", type: "charge.refunded" }, [{ sql: "transition", values: [] }]);
  assert.equal(db.batches.length, 1);
  assert.equal(db.batches[0][0].sql, "transition");
  assert.match(db.batches[0].at(-1).sql, /INSERT INTO stripe_events/);
  assert.match(db.batches[0].at(-1).sql, /ON CONFLICT\(event_id\) DO NOTHING/);
});

test("fulfillment checks durable tombstones during insert and conflict update", () => {
  const db = recordingDb();
  const statements = fulfillmentStatements(db, {
    orderId: "order_1", attemptId: "attempt_1", userId: "user_1", sessionId: "cs_test_1",
    paymentIntentId: "pi_1", chargeId: "ch_1", amount: 500, currency: "eur", eventId: "evt_paid",
  });
  assert.match(statements[1].sql, /payment_revocations/);
  assert.match(statements[1].sql, /ON CONFLICT\(stripe_session_id\) DO UPDATE/);
  assert.match(statements[3].sql, /NOT EXISTS[\s\S]*payment_revocations/);
});

test("refund-before-fulfillment remains revoked in either event ordering", () => {
  const run = (actions) => {
    const orders = [];
    const revoked = new Set();
    for (const action of actions) {
      if (action === "fulfill") orders.push({ id: "order_1", paymentIntentId: "pi_1", status: "paid" });
      else revoked.add("pi_1");
    }
    return deriveEntitlementState(orders, revoked);
  };
  assert.deepEqual(run(["refund", "fulfill"]), { active: false, sourceOrderId: "order_1" });
  assert.deepEqual(run(["fulfill", "refund"]), { active: false, sourceOrderId: "order_1" });
});

test("payment restriction transition stores ordered active state before reconciliation", () => {
  const db = recordingDb();
  const statements = paymentRestrictionStatements(db, {
    paymentIntentId: "pi_1", chargeId: "ch_1", reason: "refund", active: true, eventId: "evt_1", eventCreated: 100, stateRank: 2,
  });
  assert.match(statements[1].sql, /INSERT INTO payment_revocations/);
  assert.match(statements[1].sql, /ON CONFLICT\(stripe_payment_intent_id, reason\)/);
  assert.match(statements[1].sql, /excluded\.stripe_state_rank >= payment_revocations\.stripe_state_rank/);
  assert.match(statements.at(-1).sql, /UPDATE lifetime_entitlements/);
});

test("refund reconciliation revokes only a fully refunded charge", async () => {
  const partial = await restrictionFromEvent({
    charges: { retrieve: async () => ({ id: "ch_1", payment_intent: "pi_1", amount: 500, amount_refunded: 100, refunded: false }) },
  }, { id: "evt_partial", type: "charge.refunded", created: 100, data: { object: { id: "ch_1" } } });
  const full = await restrictionFromEvent({
    charges: { retrieve: async () => ({ id: "ch_1", payment_intent: "pi_1", amount: 500, amount_refunded: 500, refunded: true }) },
  }, { id: "evt_full", type: "charge.refunded", created: 200, data: { object: { id: "ch_1" } } });
  assert.equal(partial.active, false);
  assert.equal(full.active, true);
  assert.equal(partial.stateRank, 1);
  assert.equal(full.stateRank, 2);
});

test("favorable dispute outcomes restore eligibility and lost disputes remain restricted", async () => {
  const stripe = {
    disputes: { retrieve: async (id) => ({ id, charge: "ch_1", payment_intent: "pi_1", status: id.replace("dp_", "") }) },
    charges: { retrieve: async () => { throw new Error("PaymentIntent is already present"); } },
  };
  const won = await restrictionFromEvent(stripe, { id: "evt_won", type: "charge.dispute.closed", created: 200, data: { object: { id: "dp_won" } } });
  const prevented = await restrictionFromEvent(stripe, { id: "evt_prevented", type: "charge.dispute.closed", created: 250, data: { object: { id: "dp_prevented" } } });
  const warningClosed = await restrictionFromEvent(stripe, { id: "evt_warning_closed", type: "charge.dispute.closed", created: 275, data: { object: { id: "dp_warning_closed" } } });
  const lost = await restrictionFromEvent(stripe, { id: "evt_lost", type: "charge.dispute.closed", created: 300, data: { object: { id: "dp_lost" } } });
  assert.equal(won.active, false);
  assert.equal(prevented.active, false);
  assert.equal(warningClosed.active, false);
  assert.equal(lost.active, true);
  assert.equal(won.stateRank, 2);
  assert.equal(prevented.stateRank, 2);
  assert.equal(warningClosed.stateRank, 2);
  assert.equal(lost.stateRank, 2);
});

test("refunding a newer order preserves an older qualifying purchase", () => {
  const orders = [
    { id: "old", paymentIntentId: "pi_old", status: "paid" },
    { id: "new", paymentIntentId: "pi_new", status: "paid" },
  ];
  assert.deepEqual(deriveEntitlementState(orders, new Set(["pi_new"])), { active: true, sourceOrderId: "old" });
});

test("refunding an older order preserves a newer qualifying purchase", () => {
  const orders = [
    { id: "old", paymentIntentId: "pi_old", status: "paid" },
    { id: "new", paymentIntentId: "pi_new", status: "paid" },
  ];
  assert.deepEqual(deriveEntitlementState(orders, new Set(["pi_old"])), { active: true, sourceOrderId: "new" });
});

test("async payment failure preserves every terminal checkout state", () => {
  const db = recordingDb();
  const statement = asyncPaymentFailureStatements(db, "cs_test_delayed", "evt_failed")[0];
  assert.match(statement.sql, /status IN \('created', 'checkout_open'\)/);
  assert.doesNotMatch(statement.sql, /status\s*!=\s*'paid'/);
  for (const terminal of ["paid", "refunded", "disputed", "failed"]) {
    assert.equal(["created", "checkout_open"].includes(terminal), false);
  }
});
