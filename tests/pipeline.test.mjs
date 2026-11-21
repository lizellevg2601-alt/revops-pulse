import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFeedPayload, computeTrends, matchedTopics, matchesKeyword, MAX_SUMMARY_CHARS, safeSummary, sanitizeItem, selectItems } from "../scripts/feed-pipeline.mjs";

const now = Date.parse("2026-11-20T16:00:00Z");
const day = 86400000;
const story = (id, changes = {}) => ({ id: `feed-one-${id}`, type: "article", category: "crm", title: `Story ${id}`, source: "One", sourceUrl: `https://example.com/${id}`, summary: "", tags: [], relevanceScore: 60, publishedAt: new Date(now - day).toISOString(), ...changes });

test("RSS excerpts are stripped, shortened at a word boundary, and podcasts stay link-only", () => {
  const long = "<p>Short intro &amp; detail</p> " + "review ".repeat(60);
  assert.equal(safeSummary("  Short   intro  "), "Short intro");
  const shortened = safeSummary(long);
  assert.ok(shortened.length <= MAX_SUMMARY_CHARS);
  assert.ok(shortened.endsWith("…"));
  assert.ok(!shortened.includes("<"));
  assert.ok(shortened.includes("Short intro & detail"));

  assert.equal(sanitizeItem(story("pod", { type: "podcast", summary: long })).summary, "");
  assert.ok(sanitizeItem(story("article", { summary: long })).summary.length <= MAX_SUMMARY_CHARS);
  assert.equal(selectItems([story("selected", { summary: long })], now)[0].summary.length <= MAX_SUMMARY_CHARS, true);
});

test("keywords use word boundaries rather than accidental substrings", () => {
  assert.equal(matchesKeyword("email campaign", "ai"), false);
  assert.equal(matchesKeyword("across the organisation", "cro"), false);
  assert.equal(matchesKeyword("retail", "ai"), false);
  assert.equal(matchesKeyword("AI-powered agents", "ai"), true);
  assert.equal(matchesKeyword("GTM.AI", "gtm.ai"), true);
  assert.equal(matchedTopics({ title: "Salesforce to Salesforce cross-org sharing", tags: [] }).includes("Org Design & Leadership"), false);
  assert.equal(matchedTopics({ title: "AI agents", tags: [] }).includes("AI & Agents"), true);
});

test("trends compare equal 7-day windows, exclude future/old stories and report missing baselines", () => {
  const trends = computeTrends([
    story("a", { title: "AI agents" }), story("b"),
    story("c", { title: "AI agents before", publishedAt: new Date(now - 8 * day).toISOString() }), story("d", { publishedAt: new Date(now - 9 * day).toISOString() }),
    story("old", { title: "AI old", publishedAt: new Date(now - 20 * day).toISOString() }),
    story("future", { title: "AI future", publishedAt: new Date(now + day).toISOString() }),
  ], now);
  const ai = trends.find(topic => topic.topic === "AI & Agents");
  assert.equal(ai.count, 1);
  assert.equal(ai.change, 0);
  assert.equal(computeTrends([story("new", { title: "AI agents" })], now)[0].change, null);
});

test("deduplication removes tracking but preserves query identity and rejects invalid/future dates", () => {
  const result = selectItems([
    story("1", { sourceUrl: "https://example.com/item?id=1&utm_source=test" }),
    story("2", { sourceUrl: "https://example.com/item?id=1" }),
    story("3", { sourceUrl: "https://example.com/item?id=2" }),
    story("4", { publishedAt: "" }), story("5", { publishedAt: new Date(now + day).toISOString() }),
    story("6", { sourceUrl: "javascript:alert(1)" }),
  ], now);
  assert.equal(result.length, 2);
});

test("selection balances category coverage and caps the feed at 120", () => {
  const items = ["crm", "ai", "revops", "gtm"].flatMap(category => Array.from({ length: 40 }, (_, index) => story(`${category}-${index}`, { category })));
  const selected = selectItems(items, now);
  assert.equal(selected.length, 120);
  for (const category of ["crm", "ai", "revops", "gtm"]) assert.equal(selected.filter(item => item.category === category).length, 30);
});

test("a total outage preserves stories and the last successful timestamp", () => {
  const previous = { items: [story("old")], fetchedAt: "2026-11-19T16:00:00Z" };
  const output = buildFeedPayload(previous, [{ status: "rejected" }], [{ id: "one", name: "One" }], now);
  assert.equal(output.items[0].id, previous.items[0].id);
  assert.equal(output.fetchedAt, previous.fetchedAt);
  assert.equal(output.attemptedAt, new Date(now).toISOString());
  assert.equal(output.sources[0].retainedCount, 1);
  assert.equal(output.sources[0].status, "failed");
});

test("partial/empty/invalid-source results retain failed-source stories but replace successful ones", () => {
  const previous = { items: [story("old"), story("old-two", { id: "feed-two-old" })], fetchedAt: "2026-11-19T16:00:00Z" };
  const sources = [{ id: "one", name: "One" }, { id: "two", name: "Two" }];
  for (const failed of [{ status: "rejected" }, { status: "fulfilled", value: [] }, { status: "fulfilled", value: [story("invalid", { publishedAt: "bad" })] }]) {
    const output = buildFeedPayload(previous, [{ status: "fulfilled", value: [story("new")] }, failed], sources, now);
    assert.deepEqual(new Set(output.items.map(item => item.id)), new Set(["feed-one-new", "feed-two-old"]));
    assert.equal(output.fetchedAt, new Date(now).toISOString());
    assert.equal(output.sources[1].retainedCount, 1);
  }
});

test("first generation with no useful data refuses to publish an empty file", () => {
  assert.throws(() => buildFeedPayload(null, [{ status: "rejected" }], [{ id: "one", name: "One" }], now), /refusing to publish an empty feed/);
});
