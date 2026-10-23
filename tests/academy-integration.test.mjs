import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost } from "../functions/api/integrations/academy.js";

const SECRET = "a_test_shared_secret_of_32_chars_minimum!";

async function sign(secret, timestamp, body) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(String(timestamp) + "." + body));
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
}

function makeEvent(overrides = {}) {
  return {
    version: 1, offer: "revops_pulse_lifetime", amount: 500, currency: "usd",
    eventId: "evt_test_0001", type: "payment.paid", paymentIntentId: "pi_test_0001",
    checkoutSessionId: "cs_test_0001", email: "buyer@example.com", occurredAt: 1792700000,
    ...overrides
  };
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

// Minimal in-memory D1 simulator covering exactly the statements academy.js issues.
function makeDb() {
  const accounts = new Map(); // email -> {id,email}
  const events = new Set(); // event_id
  const grants = new Map(); // payment_intent_id -> {checkout_session_id,member_id,last_event_at,state}
  function execRun(sql, args) {
    if (sql.includes("INSERT INTO member_accounts")) {
      const [id, email] = args;
      if (accounts.has(email)) return { meta: { changes: 0 } };
      accounts.set(email, { id, email });
      return { meta: { changes: 1 } };
    }
    if (sql.includes("INSERT OR IGNORE INTO member_payment_events")) {
      const [eventId] = args;
      if (events.has(eventId)) return { meta: { changes: 0 } };
      events.add(eventId);
      return { meta: { changes: 1 } };
    }
    if (sql.includes("INSERT INTO member_payment_grants")) {
      const [paymentIntentId, checkoutSessionId, occurredAt, state, email] = args;
      const account = accounts.get(email);
      const existing = grants.get(paymentIntentId);
      if (!existing) {
        grants.set(paymentIntentId, { checkout_session_id: checkoutSessionId, member_id: account?.id, last_event_at: occurredAt, state });
        return { meta: { changes: 1 } };
      }
      if (occurredAt >= existing.last_event_at) {
        existing.last_event_at = occurredAt;
        existing.state = state;
        return { meta: { changes: 1 } };
      }
      return { meta: { changes: 0 } };
    }
    throw new Error("Unhandled SQL in test double: " + sql);
  }
  function execFirst(sql, args) {
    if (sql.includes("FROM member_payment_grants p JOIN member_accounts m")) {
      const [paymentIntentId] = args;
      const grant = grants.get(paymentIntentId);
      if (!grant) return null;
      const account = [...accounts.values()].find((a) => a.id === grant.member_id);
      return account ? { email: account.email } : null;
    }
    throw new Error("Unhandled SQL in test double: " + sql);
  }
  return {
    accounts, events, grants,
    prepare(sql) {
      return { bind(...args) { return { first: async () => execFirst(sql, args), run: async () => execRun(sql, args) }; } };
    },
    async batch(statements) {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      return results;
    }
  };
}

test("rejects a request with an invalid signature", async () => {
  const db = makeDb();
  const body = JSON.stringify(makeEvent());
  const request = new Request("https://revops.example.com/api/integrations/academy", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": String(body.length), "X-Revops-Timestamp": String(Math.floor(Date.now() / 1000)), "X-Revops-Signature": "sha256=" + "0".repeat(64) },
    body
  });
  const response = await onRequestPost({ request, env: { REVOPS_DB: db, REVOPS_EVENT_SECRET: SECRET } });
  assert.equal(response.status, 401);
});

test("accepts a validly signed paid event and creates an active grant", async () => {
  const db = makeDb();
  const response = await postSigned(makeEvent(), { REVOPS_DB: db, REVOPS_EVENT_SECRET: SECRET });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { received: true });
  assert.equal(db.grants.get("pi_test_0001").state, "active");
});

test("a replayed event is reported as a duplicate and does not double-apply", async () => {
  const db = makeDb();
  const env = { REVOPS_DB: db, REVOPS_EVENT_SECRET: SECRET };
  await postSigned(makeEvent(), env);
  const second = await postSigned(makeEvent(), env);
  assert.deepEqual(await second.json(), { received: true, duplicate: true });
  assert.equal(db.events.size, 1);
});

test("a dispute event on the same payment revokes active access (deliberate RevOps policy)", async () => {
  const db = makeDb();
  const env = { REVOPS_DB: db, REVOPS_EVENT_SECRET: SECRET };
  await postSigned(makeEvent(), env);
  await postSigned(makeEvent({ eventId: "evt_test_0002", type: "payment.disputed", occurredAt: 1792700060 }), env);
  assert.equal(db.grants.get("pi_test_0001").state, "disputed");
});

test("same-second events still apply instead of silently dropping (ordering tiebreak)", async () => {
  const db = makeDb();
  const env = { REVOPS_DB: db, REVOPS_EVENT_SECRET: SECRET };
  await postSigned(makeEvent({ occurredAt: 1792700000 }), env);
  await postSigned(makeEvent({ eventId: "evt_test_0002", type: "payment.disputed", occurredAt: 1792700000 }), env);
  assert.equal(db.grants.get("pi_test_0001").state, "disputed");
});

test("a different buyer email cannot take over an existing payment's grant", async () => {
  const db = makeDb();
  const env = { REVOPS_DB: db, REVOPS_EVENT_SECRET: SECRET };
  await postSigned(makeEvent(), env);
  const conflict = await postSigned(makeEvent({ eventId: "evt_test_0003", email: "someone-else@example.com" }), env);
  assert.equal(conflict.status, 409);
});
