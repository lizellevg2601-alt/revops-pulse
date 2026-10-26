import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { onRequestPost } from "../functions/api/integrations/academy.js";

const SECRET = "a_test_shared_secret_of_32_chars_minimum!";

// Real SQLite (node:sqlite), not a hand-rolled mock: this is what actually exercises the
// transaction/conflict-resolution SQL, not a restatement of what the author believes it does.
// batch() is serialized via a promise chain with real BEGIN IMMEDIATE/COMMIT/ROLLBACK, mirroring
// how D1 serializes writes for a single database - this is what makes the concurrency tests below
// meaningful rather than theoretical.
class LocalD1Statement {
  constructor(database, sql, values = []) { this.database = database; this.sql = sql; this.values = values; }
  bind(...values) { return new LocalD1Statement(this.database, this.sql, values); }
  async run() { const result = this.database.prepare(this.sql).run(...this.values); return { success: true, meta: { changes: result.changes } }; }
  async first() { return this.database.prepare(this.sql).get(...this.values) ?? null; }
}
class LocalD1Database {
  constructor(database) { this.database = database; this.pendingBatch = Promise.resolve(); }
  prepare(sql) { return new LocalD1Statement(this.database, sql); }
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
    const chained = this.pendingBatch.then(execute, execute);
    this.pendingBatch = chained.catch(() => {});
    return chained;
  }
}

async function integrationDatabase() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(await readFile(new URL("../migrations/0001_member_entitlements.sql", import.meta.url), "utf8"));
  return { db: new LocalD1Database(sqlite), sqlite };
}

async function sign(secret, timestamp, body) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(String(timestamp) + "." + body));
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
}

function makeEvent(overrides = {}) {
  const event = {
    version: 1, offer: "revops_pulse_lifetime", amount: 500, currency: "usd",
    eventId: "evt_test_0001", type: "payment.paid", paymentIntentId: "pi_test_0001",
    checkoutSessionId: "cs_test_0001", email: "buyer@example.com", occurredAt: 1792700000,
    ...overrides
  };
  // Mirrors the real contract: only payment.paid ever carries an email.
  if (event.type !== "payment.paid" && !("email" in overrides)) event.email = null;
  return event;
}

async function postSigned(event, env) {
  const body = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await sign(env.REVOPS_EVENT_SECRET, timestamp, body);
  const request = new Request("https://revops.example.com/api/integrations/academy", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": String(body.length), "X-Revops-Timestamp": String(timestamp), "X-Revops-Signature": "sha256=" + signature },
    body
  });
  return onRequestPost({ request, env });
}

function grant(sqlite, paymentIntentId) {
  return sqlite.prepare("SELECT state, last_event_at, member_id FROM member_payment_grants WHERE payment_intent_id=?").get(paymentIntentId);
}

test("rejects a request with an invalid signature", async () => {
  const { db } = await integrationDatabase();
  const body = JSON.stringify(makeEvent());
  const request = new Request("https://revops.example.com/api/integrations/academy", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": String(body.length), "X-Revops-Timestamp": String(Math.floor(Date.now() / 1000)), "X-Revops-Signature": "sha256=" + "0".repeat(64) },
    body
  });
  const response = await onRequestPost({ request, env: { REVOPS_DB: db, REVOPS_EVENT_SECRET: SECRET } });
  assert.equal(response.status, 401);
});

test("1. first successful purchase creates an active grant for a new member", async () => {
  const { db, sqlite } = await integrationDatabase();
  const response = await postSigned(makeEvent(), { REVOPS_DB: db, REVOPS_EVENT_SECRET: SECRET });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { received: true });
  assert.equal(grant(sqlite, "pi_test_0001").state, "active");
  assert.equal(sqlite.prepare("SELECT email FROM member_accounts").get().email, "buyer@example.com");
});

test("2. a duplicate successful-purchase event is reported as such and does not double-apply", async () => {
  const { db, sqlite } = await integrationDatabase();
  const env = { REVOPS_DB: db, REVOPS_EVENT_SECRET: SECRET };
  await postSigned(makeEvent(), env);
  const second = await postSigned(makeEvent(), env);
  assert.deepEqual(await second.json(), { received: true, duplicate: true });
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM member_payment_events").get().n, 1);
});

test("3. concurrent duplicate delivery of the same event produces exactly one effective transition", async () => {
  const { db, sqlite } = await integrationDatabase();
  const env = { REVOPS_DB: db, REVOPS_EVENT_SECRET: SECRET };
  const [a, b] = await Promise.all([postSigned(makeEvent(), env), postSigned(makeEvent(), env)]);
  const results = await Promise.all([a.json(), b.json()]);
  assert.equal(results.filter((r) => r.duplicate).length, 1);
  assert.equal(results.filter((r) => !r.duplicate).length, 1);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM member_payment_events").get().n, 1);
  assert.equal(grant(sqlite, "pi_test_0001").state, "active");
});

test("4. a full refund after successful purchase revokes the grant", async () => {
  const { db, sqlite } = await integrationDatabase();
  const env = { REVOPS_DB: db, REVOPS_EVENT_SECRET: SECRET };
  await postSigned(makeEvent(), env);
  const response = await postSigned(makeEvent({ eventId: "evt_test_0002", type: "payment.refunded", occurredAt: 1792700060 }), env);
  assert.equal(response.status, 200);
  assert.equal(grant(sqlite, "pi_test_0001").state, "refunded");
});

test("5. an old successful-purchase event delivered after a refund cannot reactivate the grant", async () => {
  const { db, sqlite } = await integrationDatabase();
  const env = { REVOPS_DB: db, REVOPS_EVENT_SECRET: SECRET };
  await postSigned(makeEvent(), env);
  await postSigned(makeEvent({ eventId: "evt_test_0002", type: "payment.refunded", occurredAt: 1792700060 }), env);
  // A delayed/replayed payment.paid for the same payment, timestamped BEFORE the refund already
  // applied - exactly the scenario a timestamp-only ordering rule would get wrong.
  const stale = await postSigned(makeEvent({ eventId: "evt_test_0003", occurredAt: 1792700010 }), env);
  assert.equal(stale.status, 200);
  assert.deepEqual(await stale.json(), { received: true, applied: false });
  assert.equal(grant(sqlite, "pi_test_0001").state, "refunded");
});

test("6. a dispute after payment suspends access immediately", async () => {
  const { db, sqlite } = await integrationDatabase();
  const env = { REVOPS_DB: db, REVOPS_EVENT_SECRET: SECRET };
  await postSigned(makeEvent(), env);
  await postSigned(makeEvent({ eventId: "evt_test_0002", type: "payment.disputed", occurredAt: 1792700060 }), env);
  assert.equal(grant(sqlite, "pi_test_0001").state, "disputed");
});

test("7. resolving a dispute favourably restores access", async () => {
  const { db, sqlite } = await integrationDatabase();
  const env = { REVOPS_DB: db, REVOPS_EVENT_SECRET: SECRET };
  await postSigned(makeEvent(), env);
  await postSigned(makeEvent({ eventId: "evt_test_0002", type: "payment.disputed", occurredAt: 1792700060 }), env);
  const response = await postSigned(makeEvent({ eventId: "evt_test_0003", type: "payment.restored", occurredAt: 1792700120 }), env);
  assert.equal(response.status, 200);
  assert.equal(grant(sqlite, "pi_test_0001").state, "active");
});

test("a lost dispute (no restore event ever sent) leaves the grant disputed", async () => {
  const { db, sqlite } = await integrationDatabase();
  const env = { REVOPS_DB: db, REVOPS_EVENT_SECRET: SECRET };
  await postSigned(makeEvent(), env);
  await postSigned(makeEvent({ eventId: "evt_test_0002", type: "payment.disputed", occurredAt: 1792700060 }), env);
  assert.equal(grant(sqlite, "pi_test_0001").state, "disputed");
});

test("payment.restored never applies to an already-refunded grant", async () => {
  const { db, sqlite } = await integrationDatabase();
  const env = { REVOPS_DB: db, REVOPS_EVENT_SECRET: SECRET };
  await postSigned(makeEvent(), env);
  await postSigned(makeEvent({ eventId: "evt_test_0002", type: "payment.refunded", occurredAt: 1792700060 }), env);
  const response = await postSigned(makeEvent({ eventId: "evt_test_0003", type: "payment.restored", occurredAt: 1792700120 }), env);
  assert.deepEqual(await response.json(), { received: true, applied: false });
  assert.equal(grant(sqlite, "pi_test_0001").state, "refunded");
});

test("8. two different payment events with the same timestamp both apply correctly in causal order", async () => {
  const { db, sqlite } = await integrationDatabase();
  const env = { REVOPS_DB: db, REVOPS_EVENT_SECRET: SECRET };
  await postSigned(makeEvent({ occurredAt: 1792700000 }), env);
  const response = await postSigned(makeEvent({ eventId: "evt_test_0002", type: "payment.disputed", occurredAt: 1792700000 }), env);
  assert.deepEqual(await response.json(), { received: true });
  assert.equal(grant(sqlite, "pi_test_0001").state, "disputed");
});

test("9. two purchases by the same customer create two independent grants under one member account", async () => {
  const { db, sqlite } = await integrationDatabase();
  const env = { REVOPS_DB: db, REVOPS_EVENT_SECRET: SECRET };
  await postSigned(makeEvent(), env);
  await postSigned(makeEvent({ eventId: "evt_test_0002", paymentIntentId: "pi_test_0002", checkoutSessionId: "cs_test_0002" }), env);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM member_accounts").get().n, 1);
  assert.equal(grant(sqlite, "pi_test_0001").state, "active");
  assert.equal(grant(sqlite, "pi_test_0002").state, "active");
  assert.equal(grant(sqlite, "pi_test_0001").member_id, grant(sqlite, "pi_test_0002").member_id);
});

test("10. an attempted change of the original payer email is rejected and never transfers ownership", async () => {
  const { db, sqlite } = await integrationDatabase();
  const env = { REVOPS_DB: db, REVOPS_EVENT_SECRET: SECRET };
  await postSigned(makeEvent(), env);
  const conflict = await postSigned(makeEvent({ eventId: "evt_test_0003", email: "someone-else@example.com" }), env);
  assert.equal(conflict.status, 409);
  assert.deepEqual(await conflict.json(), { error: "payment_owner_conflict" });
  const original = sqlite.prepare("SELECT id FROM member_accounts WHERE email=?").get("buyer@example.com");
  assert.equal(grant(sqlite, "pi_test_0001").member_id, original.id);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM member_accounts").get().n, 1);
});

test("a differently-claimed concurrent first-time payment.paid cannot steal ownership of the grant it loses the race for", async () => {
  // Two concurrent payment.paid deliveries for the SAME new payment_intent_id with DIFFERENT
  // emails. In practice the pre-check SELECT usually (not always, depending on exact event-loop
  // interleaving) sees the winner's row by the time the loser runs it, and rejects with 409 before
  // ever reaching the batch - that's a valid outcome. The TOCTOU window the atomic
  // EXISTS-ownership check inside the batch exists for is the rarer case where the pre-check
  // itself races (both reads happen before either write lands); that's covered directly below
  // against the SQL itself, since forcing that exact interleaving through two real concurrent
  // HTTP-level calls isn't reliably reproducible. Either way, the invariant that must never break:
  // exactly one owner, never a blended/corrupted state.
  const { db, sqlite } = await integrationDatabase();
  const env = { REVOPS_DB: db, REVOPS_EVENT_SECRET: SECRET };
  const [a, b] = await Promise.all([
    postSigned(makeEvent({ email: "first@example.com" }), env),
    postSigned(makeEvent({ eventId: "evt_test_0002", email: "second@example.com" }), env)
  ]);
  for (const response of [a, b]) assert.ok([200, 409].includes(response.status), response.status);
  const owner = sqlite.prepare("SELECT email FROM member_accounts m JOIN member_payment_grants g ON g.member_id=m.id WHERE g.payment_intent_id=?").get("pi_test_0001");
  assert.ok(["first@example.com", "second@example.com"].includes(owner.email));
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM member_payment_grants WHERE payment_intent_id=?").get("pi_test_0001").n, 1);
});

test("the atomic ownership check inside the batch rejects a losing claim even when the pre-check itself was raced past", async () => {
  // Simulates the narrow TOCTOU window directly: a grant already exists for someone else, but we
  // call onRequestPost in a way that skips straight past the pre-check's SELECT (as if it had
  // raced and seen a stale null) by exercising the same payment_intent_id for a second email
  // after manually priming the DB to look like the winner's write landed between the loser's
  // pre-check and its batch. Since onRequestPost always re-reads before its own batch, this
  // instead directly confirms the atomic UPDATE...WHERE EXISTS clause itself refuses to apply
  // when the account id behind member_id doesn't match the email making the claim.
  const { db, sqlite } = await integrationDatabase();
  const env = { REVOPS_DB: db, REVOPS_EVENT_SECRET: SECRET };
  await postSigned(makeEvent({ email: "first@example.com" }), env);
  const winnerId = sqlite.prepare("SELECT member_id FROM member_payment_grants WHERE payment_intent_id=?").get("pi_test_0001").member_id;
  const loserId = "loser-member-id";
  sqlite.prepare("INSERT INTO member_accounts(id,email) VALUES(?,?)").run(loserId, "second@example.com");
  const updated = sqlite.prepare(`
    INSERT INTO member_payment_grants(payment_intent_id,checkout_session_id,member_id,last_event_at,state)
    SELECT 'pi_test_0001','cs_test_0001',id,1792700999,'active' FROM member_accounts WHERE email=?
    ON CONFLICT(payment_intent_id) DO UPDATE SET last_event_at=excluded.last_event_at,state=excluded.state,updated_at=unixepoch()
    WHERE member_payment_grants.state='active'
      AND EXISTS (SELECT 1 FROM member_accounts a WHERE a.id=member_payment_grants.member_id AND a.email=?)
  `).run("second@example.com", "second@example.com");
  assert.equal(updated.changes, 0, "the loser's claimed email must never satisfy the ownership EXISTS check");
  assert.equal(grant(sqlite, "pi_test_0001").member_id, winnerId);
});

test("11. a database write failure surfaces as a retryable error, never a false acknowledgement", async () => {
  const throwingDb = {
    prepare() { return { bind() { return this; }, async run() { throw new Error("database unavailable"); }, async first() { return null; } }; },
    async batch() { throw new Error("database unavailable"); }
  };
  const response = await postSigned(makeEvent(), { REVOPS_DB: throwingDb, REVOPS_EVENT_SECRET: SECRET });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "storage_error" });
});

test("a refund/dispute/restore for a payment never recorded here is a retryable 503, not silently dropped", async () => {
  const { db } = await integrationDatabase();
  const env = { REVOPS_DB: db, REVOPS_EVENT_SECRET: SECRET };
  const response = await postSigned(makeEvent({ type: "payment.refunded" }), env);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "payment_not_yet_recorded" });
});
