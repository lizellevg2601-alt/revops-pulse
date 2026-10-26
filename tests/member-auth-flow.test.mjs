import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as requestLink } from "../functions/api/auth/request-link.js";
import { onRequestPost as consume } from "../functions/api/auth/consume.js";
import { onRequestPost as logout } from "../functions/api/auth/logout.js";
import { entitledMember, digest, token } from "../functions/lib/member-auth.mjs";

const APP_ORIGIN = "https://members.example.com";

function makeDb({ accounts = new Map(), grants = new Map(), loginTokens = new Map(), rate = new Map(), sessions = new Map(), throttles = new Map() } = {}) {
  function execFirst(sql, args) {
    if (sql.includes("INSERT INTO request_throttles")) {
      const [scope, keyHash, now, , windowSeconds] = args;
      const key = scope + ":" + keyHash;
      const row = throttles.get(key);
      if (!row || row.windowStartedAt <= now - windowSeconds) throttles.set(key, { windowStartedAt: now, count: 1 });
      else row.count += 1;
      return { request_count: throttles.get(key).count };
    }
    if (sql.includes("INSERT INTO member_login_rate")) {
      const [email] = args, now = Math.floor(Date.now() / 1000);
      const row = rate.get(email);
      if (!row || row.windowStart < now - 900) rate.set(email, { windowStart: now, count: 1 });
      else row.count += 1;
      return { count: rate.get(email).count };
    }
    if (sql.includes("FROM member_sessions s")) {
      const [tokenHash] = args, now = Math.floor(Date.now() / 1000);
      const session = sessions.get(tokenHash);
      if (!session || session.expiresAt <= now) return null;
      const hasActiveGrant = [...grants.values()].some((g) => g.memberId === session.memberId && g.state === "active");
      if (!hasActiveGrant) return null;
      const account = [...accounts.entries()].find(([, a]) => a.id === session.memberId);
      return account ? { id: session.memberId, email: account[0] } : null;
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
    if (sql.includes("INSERT INTO member_sessions")) {
      const [tokenHash, memberId] = args;
      sessions.set(tokenHash, { memberId, expiresAt: Math.floor(Date.now() / 1000) + 2592000 });
      return { success: true };
    }
    if (sql.includes("DELETE FROM member_sessions")) {
      sessions.delete(args[0]);
      return { success: true };
    }
    throw new Error("Unhandled SQL in test double (run): " + sql);
  }
  return {
    accounts, grants, loginTokens, rate, sessions, throttles,
    prepare(sql) { return { bind(...args) { return { first: async () => execFirst(sql, args), run: async () => execRun(sql, args) }; } }; }
  };
}

function withFetchStub(response, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = async () => response;
  return fn().finally(() => { globalThis.fetch = original; });
}

function withFetchThrowing(fn) {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("network error"); };
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

test("consume sets a session cookie with the required security attributes", async () => {
  const value = token(), hash = await digest(value);
  const loginTokens = new Map([[hash, { memberId: "member_1", expiresAt: Math.floor(Date.now() / 1000) + 900, consumedAt: null }]]);
  const grants = new Map([["pi_1", { memberId: "member_1", state: "active" }]]);
  const db = makeDb({ loginTokens, grants });
  const response = await consume({ request: postJson("/api/auth/consume", { token: value }), env: { REVOPS_DB: db, APP_ORIGIN } });
  const setCookie = response.headers.get("Set-Cookie");
  for (const attribute of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/"]) {
    assert.ok(setCookie.includes(attribute), `missing ${attribute} in: ${setCookie}`);
  }
});

test("a network failure sending the sign-in email cleans up the token exactly like a non-OK response does", async () => {
  const accounts = new Map([["buyer@example.com", { id: "member_1" }]]);
  const grants = new Map([["pi_1", { memberId: "member_1", state: "active" }]]);
  const db = makeDb({ accounts, grants });
  const env = { REVOPS_DB: db, APP_ORIGIN, RESEND_API_KEY: "key", RESEND_FROM: "RevOps <noreply@example.com>" };
  const response = await withFetchThrowing(() => requestLink({ request: postJson("/api/auth/request-link", { email: "buyer@example.com" }), env }));
  assert.equal(response.status, 202);
  assert.equal(db.loginTokens.size, 0, "a thrown fetch must clean up the token just like res.ok===false does");
});

test("request-link rate-limits one IP hammering many different emails, which the per-email limiter alone can't catch", async () => {
  const grants = new Map();
  const accounts = new Map();
  for (let i = 0; i < 25; i++) { accounts.set(`buyer${i}@example.com`, { id: `member_${i}` }); grants.set(`pi_${i}`, { memberId: `member_${i}`, state: "active" }); }
  const db = makeDb({ accounts, grants });
  const env = { REVOPS_DB: db, APP_ORIGIN, RESEND_API_KEY: "key", RESEND_FROM: "RevOps <noreply@example.com>" };
  const request = (email) => new Request("https://revops.example.com/api/auth/request-link", { method: "POST", headers: { "Content-Type": "application/json", Origin: APP_ORIGIN, "CF-Connecting-IP": "203.0.113.9" }, body: JSON.stringify({ email }) });
  for (let i = 0; i < 20; i++) await withFetchStub({ ok: true }, () => requestLink({ request: request(`buyer${i}@example.com`), env }));
  assert.equal(db.loginTokens.size, 20);
  await withFetchStub({ ok: true }, () => requestLink({ request: request("buyer20@example.com"), env }));
  assert.equal(db.loginTokens.size, 20, "the 21st request from the same IP, for a brand new email, must still be throttled");
});

test("logout invalidates the session server-side, not just the cookie", async () => {
  const value = token(), hash = await digest(value);
  const sessions = new Map([[hash, { memberId: "member_1", expiresAt: Math.floor(Date.now() / 1000) + 900 }]]);
  const db = makeDb({ sessions });
  const request = new Request("https://revops.example.com/api/auth/logout", { method: "POST", headers: { Origin: APP_ORIGIN, Cookie: "revops_session=" + encodeURIComponent(value) } });
  const response = await logout({ request, env: { REVOPS_DB: db, APP_ORIGIN } });
  assert.equal(response.status, 200);
  assert.equal(db.sessions.has(hash), false, "logout must delete the server-side session row");
  assert.match(response.headers.get("Set-Cookie"), /Max-Age=0/);
});

test("logout rejects a cross-origin request before touching any session", async () => {
  const db = makeDb();
  const response = await logout({ request: new Request("https://revops.example.com/api/auth/logout", { method: "POST", headers: { Origin: "https://evil.example.com" } }), env: { REVOPS_DB: db, APP_ORIGIN } });
  assert.equal(response.status, 403);
});

test("a revoked member loses access even while still holding a previously valid, unexpired session cookie", async () => {
  const value = token(), hash = await digest(value);
  const accounts = new Map([["buyer@example.com", { id: "member_1" }]]);
  const grants = new Map([["pi_1", { memberId: "member_1", state: "active" }]]);
  const sessions = new Map([[hash, { memberId: "member_1", expiresAt: Math.floor(Date.now() / 1000) + 900 }]]);
  const db = makeDb({ accounts, grants, sessions });
  const sessionRequest = () => new Request("https://revops.example.com/me", { headers: { Cookie: "revops_session=" + encodeURIComponent(value) } });
  const whileActive = await entitledMember(db, sessionRequest());
  assert.equal(whileActive?.email, "buyer@example.com");
  // Revoke access (e.g. a refund/dispute) without touching the session row at all - the cookie
  // is still, by itself, perfectly valid and unexpired.
  grants.get("pi_1").state = "refunded";
  const afterRevocation = await entitledMember(db, sessionRequest());
  assert.equal(afterRevocation, null, "a live, unexpired session must not grant access once the underlying grant is no longer active");
});
