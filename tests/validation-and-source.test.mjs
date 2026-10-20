import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { onRequest as preferencesRequest } from "../functions/api/preferences.js";
import { validCheckoutSessionId, validEmail, validPreferences, validSavedItemId, validUuid } from "../functions/lib/validation.mjs";
import { validateFeedItems } from "../scripts/feed-validation.mjs";

const completeProfile = {
  role: "RevOps Leader",
  orgSize: "Mid-market",
  functionFocus: ["Revenue Operations"],
  region: ["Global"],
  preferredDepth: "balanced",
  strategicWeight: 70,
  tacticalWeight: 30,
  podcastWeight: 50,
  boostedKeywords: ["forecasting"],
  blockedTopics: [],
};

test("public input validators enforce format and bounds", () => {
  assert.equal(validEmail("member@example.com"), true);
  assert.equal(validEmail("not-an-email"), false);
  assert.equal(validUuid("d9428888-122b-4f1e-aad7-4b1c4f8ec889"), true);
  assert.equal(validUuid("attempt-1"), false);
  assert.equal(validCheckoutSessionId("cs_test_12345678"), true);
  assert.equal(validCheckoutSessionId("cs_live_12345678"), false);
  assert.equal(validSavedItemId("feed:item-1"), true);
  assert.equal(validSavedItemId("../bad"), false);
  assert.equal(validSavedItemId("x".repeat(129)), false);
  assert.equal(validPreferences(completeProfile), true);
  assert.equal(validPreferences({}), false);
  assert.equal(validPreferences({ ...completeProfile, functionFocus: undefined }), false);
  assert.equal(validPreferences({ ...completeProfile, region: "Global" }), false);
  assert.equal(validPreferences({ role: "x", unexpected: true }), false);
  assert.equal(validPreferences({ blockedTopics: ["x".repeat(81)] }), false);
});

test("malformed stored profiles are returned as defaults rather than reaching the dashboard", async () => {
  const response = await preferencesRequest({
    request: new Request("https://pulse.example/api/preferences"),
    env: { REVOPS_DB: { prepare: () => ({ bind: () => ({ first: async () => ({ profile_json: "{}" }) }) }) } },
    data: { user: { id: "user_1" } },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { preferences: null });
});

test("dashboard source uses the private feed and server persistence, not browser storage", async () => {
  const source = await readFile(new URL("../src/app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /fetch\("\/feed-data\.json"/);
  assert.match(source, /fetch\("\/api\/preferences"/);
  assert.match(source, /fetch\("\/api\/saved-items"/);
  assert.doesNotMatch(source, /localStorage/);
});

test("feed generation rejects empty or wholly invalid output before writing", () => {
  assert.throws(() => validateFeedItems([]), /No valid feed items/);
  assert.throws(() => validateFeedItems([{ id: "bad" }]), /No valid feed items/);
  const item = { id: "feed-1", title: "Useful signal", source: "Source", sourceUrl: "https://example.com/item", publishedAt: "2026-10-20T00:00:00Z" };
  assert.deepEqual(validateFeedItems([item]), [item]);
});
