import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as requestLink } from "../functions/api/auth/request-link.js";
import { onRequestPost as consume } from "../functions/api/auth/consume.js";
import { digest, token } from "../functions/lib/member-auth.mjs";

const APP_ORIGIN = "https://members.example.com";

function makeDb({ accounts = new Map(), grants = new Map(), loginTokens = new Map(), rate = new Map() } = {}) {
  function execFirst(sql, args) {
    if (sql.includes("INSERT INTO member_login_rate")) {
      const [email] = args, now = Math.floor(Date.now() / 1000);
      const row = rate.get(email);
      if (!row || row.windowStart < now - 900) rate.set(email, { windowStart: now, count: 1 });
      else row.count += 1;
      return { count: rate.get(email).count };
    }
    if (sql.includes("FROM member_accounts m WHERE m.email=?")) {
      const [email] = args;
      const account = accounts.get(email);
      if (!account) return null;
      const hasActiveGrant = [...grants.values()].some((g) => g.memberId === account.id && g.state === "active");
      return hasActiveGrant ? { id: account.id } : null;
    }
    if (sql.includes("UPDATE member_login_tokens SET consumed_at")) {
      const [tokenHash] = args, now = Math.floor(Date.now() / 1000);
      const row = loginTokens.get(tokenHash);
      if (!row || row.consumedAt || row.expiresAt <= now) return null;
      row.consumedAt = now;
      return { member_id: row.memberId };
    }
    if (sql.includes("FROM member_payment_grants WHERE member_id=? AND state='active'")) {
      const [memberId] = args;
      return [...grants.values()].some((g) => g.memberId === memberId && g.state === "active") ? { 1: 1 } : null;
    }
    throw new Error("Unhandled SQL in test double (first): " + sql);
  }
  function execRun(sql, args) {
    if (sql.includes("INSERT INTO member_login_tokens")) {
      const [tokenHash, memberId] = args;
      loginTokens.set(tokenHash, { memberId, expiresAt: Math.floor(Date.now() / 1000) + 900, consumedAt: null });
      return { success: true };
    }
    if (sql.includes("DELETE FROM member_login_tokens")) {
      loginTokens.delete(args[0]);
      return { success: true };
    }
    if (sql.includes("INSERT INTO member_sessions")) return { success: true };
    throw new Error("Unhandled SQL in test double (run): " + sql);
  }
  return {
    accounts, grants, loginTokens, rate,
    prepare(sql) { return { bind(...args) { return { first: async () => execFirst(sql, args), run: async () => execRun(sql, args) }; } }; }
  };
}

function withFetchStub(response, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = async () => response;
  return fn().finally(() => { globalThis.fetch = original; });
}

function postJson(path, body, origin = APP_ORIGIN) {
  return new Request("https://revops.example.com" + path, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body) });
}

test("request-link gives the same generic response for an email with no active access (no account enumeration)", async () => {
  const db = makeDb();
  const env = { REVOPS_DB: db, APP_ORIGIN, RESEND_API_KEY: "key", RESEND_FROM: "RevOps <noreply@example.com>" };
  const response = await withFetchStub({ ok: true }, () => requestLink({ request: postJson("/api/auth/request-link", { email: "nobody@example.com" }), env }));
  assert.equal(response.status, 202);
  assert.equal(db.loginTokens.size, 0);
});

test("request-link issues a login token only for an email with active access", async () => {
  const accounts = new Map([["buyer@example.com", { id: "member_1" }]]);
  const grants = new Map([["pi_1", { memberId: "member_1", state: "active" }]]);
  const db = makeDb({ accounts, grants });
  const env = { REVOPS_DB: db, APP_ORIGIN, RESEND_API_KEY: "key", RESEND_FROM: "RevOps <noreply@example.com>" };
  const response = await withFetchStub({ ok: true }, () => requestLink({ request: postJson("/api/auth/request-link", { email: "buyer@example.com" }), env }));
  assert.equal(response.status, 202);
  assert.equal(db.loginTokens.size, 1);
});

test("request-link rejects a cross-origin request", async () => {
  const db = makeDb();
  const env = { REVOPS_DB: db, APP_ORIGIN, RESEND_API_KEY: "key", RESEND_FROM: "RevOps <noreply@example.com>" };
  const response = await requestLink({ request: postJson("/api/auth/request-link", { email: "buyer@example.com" }, "https://evil.example.com"), env });
  assert.equal(response.status, 403);
});

test("request-link rate-limits repeated requests for the same email within the window", async () => {
  const accounts = new Map([["buyer@example.com", { id: "member_1" }]]);
  const grants = new Map([["pi_1", { memberId: "member_1", state: "active" }]]);
  const db = makeDb({ accounts, grants });
  const env = { REVOPS_DB: db, APP_ORIGIN, RESEND_API_KEY: "key", RESEND_FROM: "RevOps <noreply@example.com>" };
  for (let i = 0; i < 3; i++) await withFetchStub({ ok: true }, () => requestLink({ request: postJson("/api/auth/request-link", { email: "buyer@example.com" }), env }));
  assert.equal(db.loginTokens.size, 3);
  await withFetchStub({ ok: true }, () => requestLink({ request: postJson("/api/auth/request-link", { email: "buyer@example.com" }), env }));
  assert.equal(db.loginTokens.size, 3, "a 4th request within the 15-minute window must not issue another token");
});

test("consume accepts a valid single-use token exactly once, then rejects replay", async () => {
  const value = token(), hash = await digest(value);
  const loginTokens = new Map([[hash, { memberId: "member_1", expiresAt: Math.floor(Date.now() / 1000) + 900, consumedAt: null }]]);
  const grants = new Map([["pi_1", { memberId: "member_1", state: "active" }]]);
  const db = makeDb({ loginTokens, grants });
  const env = { REVOPS_DB: db, APP_ORIGIN };
  const first = await consume({ request: postJson("/api/auth/consume", { token: value }), env });
  assert.equal(first.status, 200);
  assert.equal(first.headers.get("Set-Cookie")?.includes("revops_session="), true);
  const replay = await consume({ request: postJson("/api/auth/consume", { token: value }), env });
  assert.equal(replay.status, 400);
});

test("consume rejects a token whose access is no longer active", async () => {
  const value = token(), hash = await digest(value);
  const loginTokens = new Map([[hash, { memberId: "member_1", expiresAt: Math.floor(Date.now() / 1000) + 900, consumedAt: null }]]);
  const db = makeDb({ loginTokens, grants: new Map() });
  const env = { REVOPS_DB: db, APP_ORIGIN };
  const response = await consume({ request: postJson("/api/auth/consume", { token: value }), env });
  assert.equal(response.status, 403);
});
