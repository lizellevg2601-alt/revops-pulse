import assert from "node:assert/strict";
import test from "node:test";
import { clearSessionCookie, consumeLoginToken, parseCookies, randomToken, sessionCookie, sha256, throttleRequest } from "../functions/lib/security.mjs";

test("tokens hash deterministically and random tokens differ", async () => {
  assert.equal((await sha256("token")).length, 64);
  assert.equal(await sha256("token"), await sha256("token"));
  assert.notEqual(randomToken(), randomToken());
});

test("session cookies are host-only, secure, httpOnly and SameSite Lax", () => {
  const cookie = sessionCookie("opaque-token");
  assert.match(cookie, /^revops_session=opaque-token;/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  assert.doesNotMatch(cookie, /Domain=/);
  assert.match(clearSessionCookie(), /Max-Age=0/);
  assert.equal(parseCookies("other=x; revops_session=opaque-token").get("revops_session"), "opaque-token");
});

test("login token consumption delegates to one atomic UPDATE RETURNING", async () => {
  let available = true;
  let sql = "";
  const db = {
    prepare(value) {
      sql = value;
      return { bind: () => ({ first: async () => available ? (available = false, { user_id: "user-1" }) : null }) };
    },
  };
  assert.deepEqual(await consumeLoginToken(db, randomToken()), { user_id: "user-1" });
  assert.equal(await consumeLoginToken(db, randomToken()), null);
  assert.match(sql, /consumed_at IS NULL/);
  assert.match(sql, /RETURNING user_id/);
});

test("public request throttles store a hashed client address and enforce the limit", async () => {
  let count = 0;
  const boundValues = [];
  const db = {
    prepare(sql) {
      return {
        bind(...values) {
          boundValues.push({ sql, values });
          return {
            run: async () => ({}),
            first: async () => ({ request_count: ++count }),
          };
        },
      };
    },
  };
  const request = new Request("https://pulse.example/login", { headers: { "CF-Connecting-IP": "203.0.113.8" } });
  assert.equal(await throttleRequest(db, request, "login", 1, 900, 1_000), true);
  assert.equal(await throttleRequest(db, request, "login", 1, 900, 1_000), false);
  const insert = boundValues.find(({ sql }) => /INSERT INTO request_throttles/.test(sql));
  assert.equal(insert.values[1].length, 64);
  assert.notEqual(insert.values[1], "203.0.113.8");
  assert.ok(boundValues.some(({ sql }) => /DELETE FROM request_throttles/.test(sql)));
});
