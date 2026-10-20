import assert from "node:assert/strict";
import test from "node:test";
import Stripe from "stripe";
import { applyStripeTransition, asyncPaymentFailureStatements, deriveEntitlementState, fulfillmentStatements, revocationStatements } from "../functions/lib/payment-state.mjs";
import { requireSandboxEnvironment, validatePrice, verifyStripeEvent } from "../functions/lib/stripe.mjs";

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
  assert.match(db.batches[0][0].sql, /INSERT INTO stripe_events/);
  assert.equal(db.batches[0][1].sql, "transition");
  assert.match(db.batches[0].at(-1).sql, /UPDATE stripe_events SET status/);
});

test("fulfillment checks durable tombstones during insert and conflict update", () => {
  const db = recordingDb();
  const statements = fulfillmentStatements(db, {
    orderId: "order_1", attemptId: "attempt_1", userId: "user_1", sessionId: "cs_test_1",
    paymentIntentId: "pi_1", chargeId: "ch_1", amount: 1000, currency: "usd",
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

test("revocation transition creates a durable tombstone before reconciliation", () => {
  const db = recordingDb();
  const statements = revocationStatements(db, { paymentIntentId: "pi_1", chargeId: "ch_1", reason: "refund", eventId: "evt_1" });
  assert.match(statements[1].sql, /INSERT INTO payment_revocations/);
  assert.match(statements[1].sql, /ON CONFLICT\(stripe_payment_intent_id\)/);
  assert.match(statements.at(-1).sql, /UPDATE lifetime_entitlements/);
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
  const statement = asyncPaymentFailureStatements(db, "cs_test_delayed")[0];
  assert.match(statement.sql, /status IN \('created', 'checkout_open'\)/);
  assert.doesNotMatch(statement.sql, /status\s*!=\s*'paid'/);
  for (const terminal of ["paid", "refunded", "disputed", "failed"]) {
    assert.equal(["created", "checkout_open"].includes(terminal), false);
  }
});
