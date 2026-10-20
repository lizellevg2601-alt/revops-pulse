import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

test("Pages routes send every generated private dashboard representation through middleware", async () => {
  const routes = JSON.parse(await readFile(new URL("../public/_routes.json", import.meta.url), "utf8"));
  assert.deepEqual(routes.include.slice(0, 4), ["/", "/index.html", "/index.txt", "/__next.*"]);
  assert.ok(routes.include.includes("/feed-data.json"));
  assert.ok(routes.include.includes("/api/*"));
  assert.ok(routes.exclude.includes("/_next/*"));
  assert.ok(routes.exclude.includes("/login/*"));
  assert.ok(routes.exclude.includes("/buy/*"));
  assert.ok(routes.exclude.includes("/checkout/success/*"));
});
