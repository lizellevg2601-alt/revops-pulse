import { test } from "node:test";
import assert from "node:assert/strict";
import { filterFeed, formatDate, parseSavedIds, sourceUrl } from "../src/lib/feed.ts";
import { parseApprovedArticles, parseFeedPayload } from "../src/lib/feed-data.ts";

const items = [
  { id: "1", type: "article", category: "crm", title: "Salesforce integration guide", source: "CRM Weekly", sourceUrl: "https://example.com/1", author: "Alex", summary: "Improve your pipeline data", tags: ["Architecture"], publishedAt: "2026-11-19T10:00:00Z", relevanceScore: 70, whyItMatters: [], saved: false },
  { id: "2", type: "podcast", category: "revops", title: "Revenue team planning", source: "RevOps FM", summary: "Forecasting interview", tags: [], publishedAt: "2026-11-20T10:00:00Z", relevanceScore: 90, whyItMatters: [], saved: false },
];
const options = { query: "", category: "all", filters: { contentType: "all", sort: "recent" }, savedOnly: false, savedIds: [] };

test("search covers headline, publisher, summary, author and tags, case-insensitively", () => {
  for (const query of ["salesforce", "CRM Weekly", "PIPELINE", "Alex", "Architecture", "salesforce pipeline"]) {
    assert.deepEqual(filterFeed(items, { ...options, query }).map(item => item.id), ["1"]);
  }
  assert.equal(filterFeed(items, { ...options, query: "not present" }).length, 0);
  assert.equal(filterFeed(items, { ...options, query: "  " }).length, 2);
});

test("category, type, search and saved filters compose without mutating input", () => {
  assert.deepEqual(filterFeed(items, { ...options, category: "crm", savedOnly: true, savedIds: ["1"], query: "guide" }).map(item => item.id), ["1"]);
  assert.equal(filterFeed(items, { ...options, category: "crm", filters: { contentType: "podcast", sort: "recent" } }).length, 0);
  assert.equal(filterFeed(items, { ...options, savedOnly: true, savedIds: ["missing"] }).length, 0);
  assert.deepEqual(filterFeed(items, options).map(item => item.id), ["2", "1"]);
  assert.deepEqual(filterFeed(items, { ...options, filters: { contentType: "all", sort: "score" } }).map(item => item.id), ["2", "1"]);
  assert.equal(items[0].saved, false);
  assert.deepEqual(items.map(item => item.id), ["1", "2"]);
});

test("saved IDs tolerate corrupted storage and reject non-string values", () => {
  assert.deepEqual(parseSavedIds("not json"), []);
  assert.deepEqual(parseSavedIds('{"id":"1"}'), []);
  assert.deepEqual(parseSavedIds('["1",null,5,"1","2"]'), ["1", "2"]);
});

test("dates are deterministic and outbound URLs allow only HTTP(S)", () => {
  assert.equal(formatDate("2026-11-20T00:01:00Z"), "20 Nov 2026");
  assert.match(formatDate("2026-11-20T00:01:00Z", true), /UTC$/);
  assert.equal(formatDate("bad"), "Date unavailable");
  assert.equal(sourceUrl("javascript:alert(1)"), undefined);
  assert.equal(sourceUrl("invalid"), undefined);
  assert.equal(sourceUrl("https://example.com"), "https://example.com/");
});

test("feed parsing caps stored excerpts and keeps podcasts link-only", () => {
  const raw = {
    items: [
      { ...items[0], summary: "<p>Long intro</p> " + "detail ".repeat(80) },
      { ...items[1], summary: "Episode transcript ".repeat(40) },
    ],
    trends: [],
    fetchedAt: "",
  };
  const parsed = parseFeedPayload(raw);
  assert.ok(parsed.items[0].summary.length <= 180);
  assert.ok(parsed.items[0].summary.endsWith("…"));
  assert.equal(parsed.items[1].summary, "");
});

test("missing or malformed feed data has a safe empty state; legacy stories are supported", () => {
  assert.deepEqual(parseFeedPayload(null).items, []);
  assert.equal(parseFeedPayload({ items: [items[0], null, { id: "broken" }], trends: [], fetchedAt: "" }).items.length, 1);
});

test("reviewed briefings require complete content, real reviewer/date and usable sources", () => {
  const article = { id: "a", title: "A briefing", category: "crm", whatChanged: "Change", why: "Reason", implications: "Impact", watch: "Metric", action: "Step", editor: "Alex", approvedAt: "2026-11-20T00:00:00Z", sources: ["https://example.com"] };
  assert.equal(parseApprovedArticles([article]).length, 1);
  for (const change of [{ editor: "" }, { approvedAt: "bad" }, { sources: [] }, { sources: ["javascript:alert(1)"] }, { action: "" }]) {
    assert.equal(parseApprovedArticles([{ ...article, ...change }]).length, 0);
  }
  assert.deepEqual(parseApprovedArticles([]), []);
});
