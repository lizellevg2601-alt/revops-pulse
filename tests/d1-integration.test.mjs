import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { applyStripeTransition, fulfillmentStatements, paymentRestrictionStatements } from "../functions/lib/payment-state.mjs";
import { consumeLoginToken, sha256 } from "../functions/lib/security.mjs";

class LocalD1Statement {
  constructor(database, sql, values = []) {
    this.database = database;
    this.sql = sql;
    this.values = values;
  }

  bind(...values) {
    return new LocalD1Statement(this.database, this.sql, values);
  }

  async run() {
    const { sql, values } = this.sqliteBindings();
    const result = this.database.prepare(sql).run(...values);
    return { success: true, meta: { changes: result.changes } };
  }

  async first() {
    const { sql, values } = this.sqliteBindings();
    return this.database.prepare(sql).get(...values) || null;
  }

  sqliteBindings() {
    const values = [];
    const sql = this.sql.replace(/\?(\d+)/g, (_match, index) => {
      values.push(this.values[Number(index) - 1]);
      return "?";
    });
    return { sql, values: values.length > 0 ? values : this.values };
  }
}

class LocalD1Database {
  constructor(database) {
    this.database = database;
    this.pendingBatch = Promise.resolve();
  }

  prepare(sql) {
    return new LocalD1Statement(this.database, sql);
  }

  batch(statements) {
    const execute = async () => {
      this.database.exec("BEGIN IMMEDIATE");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        this.database.exec("COMMIT");
        return results;
      } catch (error) {
        this.database.exec("ROLLBACK");
        throw error;
      }
    };
    const batch = this.pendingBatch.then(execute, execute);
    this.pendingBatch = batch.catch(() => {});
    return batch;
  }
}

async function integrationDatabase() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(await readFile(new URL("../migrations/0001_revops.sql", import.meta.url), "utf8"));
  sqlite.exec(await readFile(new URL("../migrations/0002_payment_restriction_state.sql", import.meta.url), "utf8"));
  return { db: new LocalD1Database(sqlite), sqlite };
}

async function seedPurchase(db, suffix, userId = "user_1") {
  await db.prepare("INSERT OR IGNORE INTO users (id, email) VALUES (?1, ?2)").bind(userId, `${userId}@example.com`).run();
  await db.prepare(`
    INSERT INTO checkout_attempts (id, user_id, stripe_session_id, expected_price_id, expected_product_id, expected_amount, expected_currency, status)
    VALUES (?1, ?2, ?3, 'price_eur_5', 'prod_revops', 500, 'eur', 'checkout_open')
  `).bind(`attempt_${suffix}`, userId, `cs_${suffix}`).run();
}

function payment(suffix, eventId, userId = "user_1") {
  return {
    orderId: `order_${suffix}`,
    attemptId: `attempt_${suffix}`,
    userId,
    sessionId: `cs_${suffix}`,
    paymentIntentId: `pi_${suffix}`,
    chargeId: `ch_${suffix}`,
    amount: 500,
    currency: "eur",
    eventId,
  };
}

async function applyPayment(db, suffix, eventId, userId = "user_1") {
  const event = { id: eventId, type: "checkout.session.completed" };
  await applyStripeTransition(db, event, fulfillmentStatements(db, payment(suffix, eventId, userId)));
}

async function applyRestriction(db, suffix, reason, active, eventId, eventCreated) {
  const restriction = {
    paymentIntentId: `pi_${suffix}`,
    chargeId: `ch_${suffix}`,
    reason,
    active,
    eventId,
    eventCreated,
    stateRank: reason === "refund" ? (active ? 2 : 1) : (active ? 1 : 2),
  };
  await applyStripeTransition(db, { id: eventId, type: `test.${reason}` }, paymentRestrictionStatements(db, restriction));
}

test("D1 batch guard processes concurrent duplicate events exactly once", async () => {
  const { db, sqlite } = await integrationDatabase();
  try {
    await seedPurchase(db, "duplicate");
    const event = { id: "evt_duplicate", type: "checkout.session.completed" };
    await Promise.all([
      applyStripeTransition(db, event, fulfillmentStatements(db, payment("duplicate", event.id))),
      applyStripeTransition(db, event, fulfillmentStatements(db, payment("duplicate", event.id))),
    ]);
    assert.equal(sqlite.prepare("SELECT count(*) count FROM stripe_events WHERE event_id = ?").get(event.id).count, 1);
    assert.equal(sqlite.prepare("SELECT count(*) count FROM orders WHERE stripe_session_id = 'cs_duplicate'").get().count, 1);
    assert.equal(sqlite.prepare("SELECT status FROM lifetime_entitlements WHERE user_id = 'user_1'").get().status, "active");
  } finally {
    sqlite.close();
  }
});

test("D1 reconciliation ignores stale events and composes refund and dispute reasons", async () => {
  const { db, sqlite } = await integrationDatabase();
  try {
    await seedPurchase(db, "primary");
    await applyPayment(db, "primary", "evt_paid");

    await applyRestriction(db, "primary", "refund", false, "evt_partial", 100);
    assert.equal(sqlite.prepare("SELECT status FROM lifetime_entitlements WHERE user_id = 'user_1'").get().status, "active");

    await applyRestriction(db, "primary", "dispute", true, "evt_dispute", 200);
    assert.equal(sqlite.prepare("SELECT status FROM lifetime_entitlements WHERE user_id = 'user_1'").get().status, "revoked");

    await applyRestriction(db, "primary", "dispute", false, "evt_won", 300);
    assert.equal(sqlite.prepare("SELECT status FROM lifetime_entitlements WHERE user_id = 'user_1'").get().status, "active");

    await applyRestriction(db, "primary", "dispute", true, "evt_stale", 250);
    assert.equal(sqlite.prepare("SELECT active FROM payment_revocations WHERE stripe_payment_intent_id = 'pi_primary' AND reason = 'dispute'").get().active, 0);
    assert.equal(sqlite.prepare("SELECT status FROM lifetime_entitlements WHERE user_id = 'user_1'").get().status, "active");

    await applyRestriction(db, "primary", "refund", true, "evt_full", 400);
    await applyRestriction(db, "primary", "dispute", false, "evt_won_again", 500);
    assert.equal(sqlite.prepare("SELECT status FROM lifetime_entitlements WHERE user_id = 'user_1'").get().status, "revoked");
    assert.equal(sqlite.prepare("SELECT revoke_reason FROM lifetime_entitlements WHERE user_id = 'user_1'").get().revoke_reason, "refund");
  } finally {
    sqlite.close();
  }
});

test("D1 reconciliation resolves equal-second snapshots by lifecycle rank", async () => {
  const { db, sqlite } = await integrationDatabase();
  try {
    await seedPurchase(db, "same_second");
    await applyPayment(db, "same_second", "evt_paid_same_second");

    await applyRestriction(db, "same_second", "refund", true, "evt_full_same_second", 100);
    await applyRestriction(db, "same_second", "refund", false, "evt_partial_same_second", 100);
    assert.equal(sqlite.prepare("SELECT active FROM payment_revocations WHERE stripe_payment_intent_id = 'pi_same_second' AND reason = 'refund'").get().active, 1);

    await applyRestriction(db, "same_second", "dispute", false, "evt_won_same_second", 200);
    await applyRestriction(db, "same_second", "dispute", true, "evt_open_same_second", 200);
    assert.equal(sqlite.prepare("SELECT active FROM payment_revocations WHERE stripe_payment_intent_id = 'pi_same_second' AND reason = 'dispute'").get().active, 0);
  } finally {
    sqlite.close();
  }
});

test("restriction migration preserves existing revocations and permits independent reasons", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec(await readFile(new URL("../migrations/0001_revops.sql", import.meta.url), "utf8"));
    sqlite.prepare(`
      INSERT INTO payment_revocations (stripe_payment_intent_id, stripe_charge_id, reason, stripe_event_id)
      VALUES ('pi_existing', 'ch_existing', 'refund', 'evt_existing')
    `).run();
    sqlite.exec(await readFile(new URL("../migrations/0002_payment_restriction_state.sql", import.meta.url), "utf8"));
    const migrated = sqlite.prepare("SELECT reason, active, stripe_event_created, stripe_state_rank FROM payment_revocations").get();
    assert.deepEqual({ ...migrated }, { reason: "refund", active: 1, stripe_event_created: 0, stripe_state_rank: 2 });
    sqlite.prepare(`
      INSERT INTO payment_revocations
        (stripe_payment_intent_id, stripe_charge_id, reason, active, stripe_event_id, stripe_event_created, stripe_state_rank)
      VALUES ('pi_existing', 'ch_existing', 'dispute', 1, 'evt_dispute', 100, 1)
    `).run();
    assert.equal(sqlite.prepare("SELECT count(*) AS count FROM payment_revocations WHERE stripe_payment_intent_id = 'pi_existing'").get().count, 2);
  } finally {
    sqlite.close();
  }
});

test("D1 reconciliation keeps access while any purchase remains eligible", async () => {
  const { db, sqlite } = await integrationDatabase();
  try {
    await seedPurchase(db, "old");
    await seedPurchase(db, "new");
    await applyPayment(db, "old", "evt_old");
    await applyPayment(db, "new", "evt_new");
    await applyRestriction(db, "new", "refund", true, "evt_new_refund", 100);
    const entitlement = sqlite.prepare("SELECT status, source_order_id FROM lifetime_entitlements WHERE user_id = 'user_1'").get();
    assert.deepEqual({ ...entitlement }, { status: "active", source_order_id: "order_old" });
  } finally {
    sqlite.close();
  }
});

test("D1 token consumption rejects the expiry boundary and is single-use under concurrency", async () => {
  const { db, sqlite } = await integrationDatabase();
  try {
    await db.prepare("INSERT INTO users (id, email) VALUES ('user_1', 'buyer@example.com')").run();
    const expired = "x".repeat(32);
    await db.prepare("INSERT INTO login_tokens (token_hash, user_id, expires_at) VALUES (?1, 'user_1', unixepoch())").bind(await sha256(expired)).run();
    assert.equal(await consumeLoginToken(db, expired), null);

    const valid = "y".repeat(32);
    await db.prepare("INSERT INTO login_tokens (token_hash, user_id, expires_at) VALUES (?1, 'user_1', unixepoch() + 60)").bind(await sha256(valid)).run();
    const consumed = await Promise.all([consumeLoginToken(db, valid), consumeLoginToken(db, valid)]);
    assert.equal(consumed.filter(Boolean).length, 1);
    assert.equal(consumed.find(Boolean).user_id, "user_1");
  } finally {
    sqlite.close();
  }
});
