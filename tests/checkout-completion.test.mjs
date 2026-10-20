import assert from "node:assert/strict";
import test from "node:test";
import { onRequest } from "../functions/api/checkout/complete.js";
import { issueMagicLink, MAGIC_LINK_TTL_SECONDS } from "../functions/lib/magic-link.mjs";

function magicLinkDb() {
  const requests = new Map();
  const throttles = new Map();
  const tokens = [];
  const statements = [];
  return {
    requests,
    throttles,
    tokens,
    statements,
    prepare(sql) {
      statements.push(sql);
      return {
        bind(...values) {
          return {
            async first() {
              if (sql.includes("FROM orders")) return { user_id: "user_1", email: "Buyer@Example.com" };
              if (sql.includes("INSERT INTO magic_link_requests")) {
                const [key, now, ttl] = values;
                const existing = requests.get(key);
                if (existing && (existing.claimedUntil > now || (existing.lastSentAt !== null && existing.lastSentAt > now - ttl))) return null;
                requests.set(key, { claimedUntil: now + ttl, lastSentAt: existing?.lastSentAt ?? null, currentTokenHash: null });
                return { request_key: key };
              }
              if (sql.includes("login_throttles")) {
                const [email, now, ttl] = values;
                const existing = throttles.get(email);
                const next = !existing || existing.windowStartedAt <= now - ttl
                  ? { windowStartedAt: now, requestCount: 1 }
                  : { ...existing, requestCount: existing.requestCount + 1 };
                throttles.set(email, next);
                return { request_count: next.requestCount };
              }
              if (sql.includes("INSERT INTO login_tokens")) {
                tokens.push({ tokenHash: values[0], requestKey: values[2], expiresAt: values[3] + values[4] });
                return { token_hash: values[0] };
              }
              return null;
            },
            async run() {
              if (sql.includes("UPDATE magic_link_requests") && sql.includes("last_sent_at")) {
                const [now, ttl, tokenHash, key] = values;
                requests.set(key, { claimedUntil: now + ttl, lastSentAt: now, currentTokenHash: tokenHash });
              } else if (sql.includes("UPDATE magic_link_requests")) {
                const [now, key] = values;
                const existing = requests.get(key);
                if (existing?.currentTokenHash === null) requests.set(key, { ...existing, claimedUntil: now });
              }
              return { success: true };
            },
          };
        },
      };
    },
  };
}

const env = {
  APP_ORIGIN: "https://pulse.example",
  RESEND_API_KEY: "test-resend-key",
  RESEND_FROM: "access@pulse.example",
};

test("a paid Checkout Session only emails mailbox proof and never creates a session", async () => {
  const originalFetch = globalThis.fetch;
  let emailCount = 0;
  globalThis.fetch = async (_url, init) => {
    emailCount += 1;
    assert.deepEqual(JSON.parse(init.body).to, ["buyer@example.com"]);
    return new Response("{}", { status: 200 });
  };
  try {
    const db = magicLinkDb();
    const request = new Request("https://pulse.example/api/checkout/complete", {
      method: "POST",
      headers: { Origin: "https://pulse.example", "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: "cs_test_12345678" }),
    });
    const response = await onRequest({ request, env: { ...env, REVOPS_DB: db } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.has("set-cookie"), false);
    assert.equal((await response.json()).pending, false);
    assert.equal(emailCount, 1);
    assert.equal(db.statements.some((sql) => /INSERT INTO sessions/i.test(sql)), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("checkout completion ignores inactive historical restrictions", async () => {
  let eligibilitySql = "";
  const db = {
    prepare(sql) {
      eligibilitySql = sql;
      return { bind: () => ({ first: async () => null }) };
    },
  };
  const response = await onRequest({
    request: new Request("https://pulse.example/api/checkout/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://pulse.example" },
      body: JSON.stringify({ sessionId: "cs_test_valid_session" }),
    }),
    env: { APP_ORIGIN: "https://pulse.example", REVOPS_DB: db },
  });
  assert.equal(response.status, 202);
  assert.match(eligibilitySql, /payment_revocations\.active = 1/);
});

test("checkout link retries are immediate no-ops before throttle and resend after expiry", async () => {
  const originalFetch = globalThis.fetch;
  let emailCount = 0;
  globalThis.fetch = async () => { emailCount += 1; return new Response("{}", { status: 200 }); };
  try {
    const db = magicLinkDb();
    const input = { db, env, userId: "user_1", email: "buyer@example.com", requestKey: "checkout:cs_test_12345678" };
    const [first, concurrentDuplicate] = await Promise.all([
      issueMagicLink({ ...input, nowSeconds: 1_000 }),
      issueMagicLink({ ...input, nowSeconds: 1_000 }),
    ]);
    assert.equal(Number(first) + Number(concurrentDuplicate), 1);
    assert.equal(emailCount, 1);
    assert.equal(db.throttles.get("buyer@example.com").requestCount, 1);

    assert.equal(await issueMagicLink({ ...input, nowSeconds: 1_001 }), false);
    assert.equal(emailCount, 1);
    assert.equal(db.throttles.get("buyer@example.com").requestCount, 1, "duplicate detection happens before throttle accounting");

    assert.equal(await issueMagicLink({ ...input, nowSeconds: 1_000 + MAGIC_LINK_TTL_SECONDS }), true);
    assert.equal(emailCount, 2);
    assert.equal(db.tokens.length, 2);
    assert.notEqual(db.tokens[0].tokenHash, db.tokens[1].tokenHash);
    assert.equal(db.throttles.get("buyer@example.com").requestCount, 1, "the expired throttle window starts over");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
