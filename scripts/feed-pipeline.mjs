const day = 24 * 60 * 60 * 1000;

// Keep RSS-derived text to a short teaser; the full item stays at the publisher.
export const MAX_SUMMARY_CHARS = 180;

export function safeSummary(value) {
  if (typeof value !== "string") return "";
  const text = value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  if (text.length <= MAX_SUMMARY_CHARS) return text;

  const limit = MAX_SUMMARY_CHARS - 1;
  const cut = text.slice(0, limit);
  const boundary = Math.max(cut.lastIndexOf(" "), cut.lastIndexOf("—"), cut.lastIndexOf("–"));
  const shortened = boundary >= limit * 0.6 ? cut.slice(0, boundary) : cut;
  return `${shortened.trimEnd()}…`;
}

export function sanitizeItem(item) {
  if (!item || typeof item !== "object") return item;
  // Podcast RSS descriptions are often full transcripts; link to the episode instead.
  return { ...item, summary: item.type === "podcast" ? "" : safeSummary(item.summary) };
}

export const trendTopics = [
  { topic: "AI & Agents", keywords: ["ai", "a.i", "agent", "agents", "agentic", "copilot", "llm", "llms", "gpt", "machine learning", "automation", "artificial intelligence"] },
  { topic: "Revenue Forecasting", keywords: ["forecast", "forecasts", "forecasting", "pipeline", "arr", "revenue predictability"] },
  { topic: "GTM Strategy", keywords: ["gtm", "go-to-market", "go to market", "commercial", "sales motion", "demand gen", "outbound", "inbound"] },
  { topic: "Org Design & Leadership", keywords: ["org design", "organizational design", "organisational design", "cro", "leadership", "hiring", "talent", "team", "teams", "culture", "career"] },
  { topic: "Data & Attribution", keywords: ["data", "attribution", "enrichment", "hygiene", "quality", "crm"] },
  { topic: "Tech Stack & CPQ", keywords: ["cpq", "salesforce", "hubspot", "tech stack", "platform", "tooling", "integration", "integrations", "integrating"] },
  { topic: "Composable & Headless", keywords: ["headless", "composable", "api-first", "api first", "decoupled", "microarchitecture", "building block", "mcp", "model context protocol", "modular", "agent-ready", "agent native", "agentic crm", "headless 360", "gtm.ai", "ui-less", "uiless", "event-driven", "exposed via api", "api layer", "middleware", "ipaas"] },
  { topic: "Marketing & Brand", keywords: ["marketing", "brand", "content", "thought leadership", "seo", "demand"] },
  { topic: "Founders & Fundraising", keywords: ["startup", "startups", "founder", "founders", "funding", "vc", "valuation", "ipo", "equity"] },
];

export function matchesKeyword(text, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "iu").test(text);
}

export function matchedTopics(item) {
  const text = [item.title, ...(item.tags || []), item.summary].filter(value => typeof value === "string").join(" ");
  return trendTopics.filter(topic => topic.keywords.some(keyword => matchesKeyword(text, keyword))).map(topic => topic.topic);
}

export function computeTrends(items, now = Date.now()) {
  const current = items.filter(item => Date.parse(item.publishedAt) > now - 7 * day && Date.parse(item.publishedAt) <= now);
  const previous = items.filter(item => Date.parse(item.publishedAt) > now - 14 * day && Date.parse(item.publishedAt) <= now - 7 * day);
  return trendTopics.map(topic => {
    const matches = current.filter(item => matchedTopics(item).includes(topic.topic));
    const older = previous.filter(item => matchedTopics(item).includes(topic.topic)).length;
    const currentShare = current.length ? matches.length / current.length : 0;
    const previousShare = previous.length ? older / previous.length : 0;
    // There is no meaningful relative change when the baseline share is zero.
    const change = previousShare > 0 ? Math.round((currentShare - previousShare) / previousShare * 100) : null;
    return {
      topic: topic.topic, count: matches.length,
      recent3: matches.filter(item => Date.parse(item.publishedAt) > now - 3 * day).length,
      change, direction: change === null ? "flat" : change > 8 ? "up" : change < -8 ? "down" : "flat",
      articles: matches.filter(item => item.type === "article").length,
      podcasts: matches.filter(item => item.type === "podcast").length,
      topItem: matches[0]?.title || "", secondItem: matches[1]?.title || "",
    };
  }).filter(topic => topic.count > 0).sort((a, b) => b.count - a.count || b.recent3 - a.recent3)
    .slice(0, 8).map((topic, index) => ({ rank: index + 1, ...topic }));
}

function validItem(item, now) {
  if (!item || typeof item.title !== "string" || !item.title.trim() || typeof item.id !== "string" ||
      !["article", "podcast"].includes(item.type) || typeof item.source !== "string" ||
      typeof item.summary !== "string" || !Array.isArray(item.tags) || !item.tags.every(tag => typeof tag === "string") ||
      typeof item.relevanceScore !== "number" || !["crm", "ai", "revops", "gtm"].includes(item.category)) return false;
  const date = Date.parse(item.publishedAt);
  if (!Number.isFinite(date) || date > now) return false;
  try { return ["http:", "https:"].includes(new URL(item.sourceUrl).protocol); } catch { return false; }
}

export function selectItems(items, now = Date.now()) {
  const seenUrls = new Set();
  const seenTitles = new Set();
  const unique = items.filter(item => validItem(item, now)).map(sanitizeItem)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).filter(item => {
      const url = new URL(item.sourceUrl);
      url.hash = "";
      // Keep identity-bearing query parameters and path case; remove only tracking.
      for (const key of [...url.searchParams.keys()]) if (/^utm_|^(fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
      url.searchParams.sort();
      const canonical = url.href.replace(/\/$/, "");
      const title = item.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
      if (seenUrls.has(canonical) || seenTitles.has(title)) return false;
      seenUrls.add(canonical); seenTitles.add(title); return true;
    });
  const buckets = ["crm", "ai", "revops", "gtm"].map(category => unique.filter(item => item.category === category));
  const selected = [];
  while (selected.length < 120 && buckets.some(bucket => bucket.length)) {
    for (const bucket of buckets) if (bucket.length && selected.length < 120) selected.push(bucket.shift());
  }
  return selected.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

export function buildFeedPayload(previous, results, sources, now = Date.now()) {
  const items = [];
  const health = [];
  let freshCount = 0;
  sources.forEach((source, index) => {
    const result = results[index];
    const fresh = result?.status === "fulfilled" ? result.value.filter(item => validItem(item, now)) : [];
    const retained = fresh.length ? [] : (previous?.items || []).filter(item => item.id?.startsWith(`feed-${source.id}-`) && validItem(item, now));
    freshCount += fresh.length;
    items.push(...fresh, ...retained);
    health.push({ id: source.id, source: source.name, status: fresh.length ? "ok" : "failed", count: fresh.length, retainedCount: retained.length });
  });
  // A total outage must not destroy the last useful feed, including older source IDs.
  if (!freshCount) items.push(...(previous?.items || []));
  const selected = selectItems(items, now);
  if (!selected.length) throw new Error("No usable source updates and no previous feed; refusing to publish an empty feed.");
  return {
    items: selected, trends: computeTrends(selected, now),
    fetchedAt: freshCount ? new Date(now).toISOString() : previous.fetchedAt,
    attemptedAt: new Date(now).toISOString(), sources: health,
  };
}
