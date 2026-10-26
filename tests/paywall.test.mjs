import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isProtectedPath, onRequest } from "../functions/_middleware.js";

for (const p of ["/", "/index.html", "/index.txt", "/__next.__PAGE__.txt", "/__next._full.txt", "/__next._head.txt", "/__next._index.txt", "/__next._tree.txt", "/feed-data.json", "/approved-intelligence.json"]) {
  test("protects " + p, () => assert.equal(isProtectedPath(p), true));
}
test("protects any path nobody has reasoned about yet (deny-by-default, not an allowlist of known paths)", () => {
  for (const p of ["/dashboard", "/some-future-page", "/api/me", "/api/member/preferences", "/__next.something-not-invented-yet.txt"]) {
    assert.equal(isProtectedPath(p), true, p);
  }
});
test("public login and its own static-export representations stay accessible", () => {
  for (const p of ["/login", "/login/", "/login/index.html", "/login/__next._full.txt", "/login/__next.login.__PAGE__.txt"]) {
    assert.equal(isProtectedPath(p), false, p);
  }
});
test("the Academy webhook and member auth API routes stay public (they carry their own independent auth, not a member session cookie)", () => {
  for (const p of ["/api/auth/request-link", "/api/auth/consume", "/api/auth/logout", "/api/integrations/academy"]) {
    assert.equal(isProtectedPath(p), false, p);
  }
});
test("generic Next.js template assets and Cloudflare's own routing manifest stay public", () => {
  for (const p of ["/_next/static/chunks/main.js", "/favicon.ico", "/file.svg", "/globe.svg", "/next.svg", "/vercel.svg", "/window.svg", "/404.html", "/_routes.json"]) {
    assert.equal(isProtectedPath(p), false, p);
  }
});

test("paywall on, DB unavailable fails closed", async () => {
  const request = new Request("https://example.com/feed-data.json");
  const response = await onRequest({ request, env: { REVOPS_PAYWALL_ENABLED: "true" }, next: () => { throw Error("should not serve static content"); } });
  assert.equal(response.status, 503);
});
test("paywall off does not change existing public site", async () => {
  const request = new Request("https://example.com/");
  const response = await onRequest({ request, env: { REVOPS_PAYWALL_ENABLED: "false" }, next: () => new Response("existing site") });
  assert.equal(await response.text(), "existing site");
});
test("unauthenticated feed request blocked", async () => {
  const request = new Request("https://example.com/approved-intelligence.json");
  const db = { prepare: () => ({ bind: () => ({ first: async () => null }) }) };
  const response = await onRequest({ request, env: { REVOPS_PAYWALL_ENABLED: "true", REVOPS_DB: db }, next: () => new Response("should not render") });
  assert.equal(response.status, 401);
});
test("a previously-missed static-export file (__next._head.txt) is now blocked when unauthenticated, not served", async () => {
  const request = new Request("https://example.com/__next._head.txt");
  const db = { prepare: () => ({ bind: () => ({ first: async () => null }) }) };
  const response = await onRequest({ request, env: { REVOPS_PAYWALL_ENABLED: "true", REVOPS_DB: db }, next: () => new Response("should not render") });
  assert.equal(response.status, 401);
});

test("public/_routes.json's exclude list and the middleware's own public set describe the same surface, so they can't silently drift apart again", async () => {
  const routes = JSON.parse(await readFile(new URL("../public/_routes.json", import.meta.url), "utf8"));
  assert.deepEqual(routes.include, ["/*"], "everything should reach the Function by default; isProtectedPath is the single source of truth for what's actually gated");
  for (const excluded of routes.exclude) {
    // Each exclude entry (a static-asset bypass of the Function entirely) must correspond to
    // something the middleware itself also treats as public - otherwise a path could be marked
    // "safe to serve as a raw static file" by one list while the other still thinks it's gated,
    // which is exactly the kind of drift that let real build output slip through unauthenticated.
    const sample = excluded.endsWith("/*") ? excluded.slice(0, -1) + "probe" : excluded;
    assert.equal(isProtectedPath(sample), false, `public/_routes.json excludes ${excluded} but isProtectedPath(${sample}) says protected`);
  }
});

test("every file in a real `next build` output is classified correctly - public under /login and a short named list, protected otherwise", async () => {
  let files;
  try {
    files = await listBuildOutput(new URL("../out/", import.meta.url));
  } catch {
    return; // `npm run build` hasn't been run in this environment; nothing to check against.
  }
  assert.ok(files.length > 5, "expected a real build to have produced output");
  const explicitlyPublic = new Set(["/favicon.ico", "/file.svg", "/globe.svg", "/next.svg", "/vercel.svg", "/window.svg", "/404.html", "/_routes.json"]);
  let sawPreviouslyMissedFile = false;
  for (const path of files) {
    const expectPublic = path.startsWith("/login") || path.startsWith("/_next/") || explicitlyPublic.has(path);
    assert.equal(isProtectedPath(path), !expectPublic, path);
    if (["/__next._head.txt", "/__next._index.txt", "/__next._tree.txt"].includes(path)) sawPreviouslyMissedFile = true;
  }
  // Confirm the specific files the original audit found slipping through unauthenticated
  // actually exist in a real build, and are now correctly protected by the check above.
  assert.ok(sawPreviouslyMissedFile, "expected at least one of the previously-missed __next._*.txt files in real build output");
});

async function listBuildOutput(dirUrl) {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(dirUrl, { withFileTypes: true, recursive: true });
  const base = dirUrl.pathname;
  return entries.filter((e) => e.isFile()).map((e) => {
    const full = (e.parentPath || e.path) + "/" + e.name;
    return full.slice(base.length - 1).replace(/^\/+/, "/");
  });
}
