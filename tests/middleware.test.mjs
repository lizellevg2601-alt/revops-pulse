import assert from "node:assert/strict";
import test from "node:test";
import { onRequest } from "../functions/_middleware.js";

function emptyDb() {
  return { prepare: () => ({ bind: () => ({ first: async () => null }) }) };
}

test("middleware redirects an unauthenticated dashboard request", async () => {
  const response = await onRequest({
    request: new Request("https://pulse.example/"),
    env: { REVOPS_DB: emptyDb() },
    data: {},
    next: () => { throw new Error("must not pass through"); },
  });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "https://pulse.example/login/");
});

test("middleware returns no-store JSON for an unauthenticated feed", async () => {
  const response = await onRequest({
    request: new Request("https://pulse.example/feed-data.json"),
    env: { REVOPS_DB: emptyDb() },
    data: {},
    next: () => { throw new Error("must not pass through"); },
  });
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal((await response.json()).error.code, "unauthorized");
});

test("middleware fails closed when its database binding is missing", async () => {
  const response = await onRequest({ request: new Request("https://pulse.example/"), env: {}, data: {} });
  assert.equal(response.status, 503);
});
