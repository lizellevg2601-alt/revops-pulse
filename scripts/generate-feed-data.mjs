import Parser from "rss-parser";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const feedSources = [
  { id: "revops-fm-substack", name: "RevOps FM", type: "article", feedUrl: "https://revopsfm.substack.com/feed", siteUrl: "https://revopsfm.substack.com", author: "Justin Norris" },
  { id: "sam-jacobs-substack", name: "Sam Jacobs", type: "article", feedUrl: "https://samfjacobs.substack.com/feed", siteUrl: "https://samfjacobs.substack.com", author: "Sam Jacobs" },
  { id: "revops-alliance", name: "Revenue Operations Alliance", type: "article", feedUrl: "https://www.revenueoperationsalliance.com/rss/", siteUrl: "https://www.revenueoperationsalliance.com" },
  { id: "seafoam-media", name: "Seafoam Media", type: "article", feedUrl: "https://seafoammedia.com/feed/", siteUrl: "https://seafoammedia.com" },
  { id: "topline-podcast", name: "Topline", type: "podcast", feedUrl: "http://feeds.libsyn.com/470223/rss", siteUrl: "https://www.joinpavilion.com/topline-podcast", author: "Sam Jacobs, AJ Bruno & Asad Zaman" },
  { id: "revops-fm-podcast", name: "RevOps FM", type: "podcast", feedUrl: "https://feeds.captivate.fm/revopsfm/", siteUrl: "https://revops.fm", author: "Justin Norris" },
  { id: "20vc-podcast", name: "20VC", type: "podcast", feedUrl: "http://feeds.libsyn.com/61840/rss", siteUrl: "https://20vc.com", author: "Harry Stebbings" },
  { id: "crm-switch", name: "CRM Switch", type: "article", feedUrl: "https://crmswitch.com/feed/", siteUrl: "https://crmswitch.com", author: "CRM Switch" },
  { id: "salesforce-blog", name: "Salesforce Blog", type: "article", feedUrl: "https://www.salesforce.com/blog/feed/", siteUrl: "https://www.salesforce.com/blog", author: "Salesforce" },
  { id: "outfunnel", name: "Outfunnel", type: "article", feedUrl: "https://outfunnel.com/feed/", siteUrl: "https://outfunnel.com", author: "Outfunnel" },
];

function estimateReadTime(content) {
  const words = (content || "").replace(/<[^>]*>/g, "").split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function parseDuration(duration) {
  if (!duration) return undefined;
  const parts = duration.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 60 + parts[1] + Math.round(parts[2] / 60);
  if (parts.length === 2) return parts[0] + Math.round(parts[1] / 60);
  return Math.round(Number(duration) / 60);
}

const trendTopics = [
  {
    topic: "AI & Agents",
    keywords: ["ai", "a.i", "agent", "copilot", "llm", "gpt", "machine learning", "automation", "artificial intelligence"],
  },
  {
    topic: "Revenue Forecasting",
    keywords: ["forecast", "forecasting", "pipeline", "arr", "revenue predict"],
  },
  {
    topic: "GTM Strategy",
    keywords: ["gtm", "go-to-market", "go to market", "commercial", "sales motion", "demand gen", "outbound", "inbound"],
  },
  {
    topic: "Org Design & Leadership",
    keywords: ["org", "cro", "leadership", "hiring", "structure", "talent", "team", "culture", "career"],
  },
  {
    topic: "Data & Attribution",
    keywords: ["data", "attribution", "enrichment", "hygiene", "quality", "crm"],
  },
  {
    topic: "Tech Stack & CPQ",
    keywords: ["cpq", "salesforce", "hubspot", "tech stack", "platform", "tooling", "integrat"],
  },
  {
    topic: "Composable & Headless",
    keywords: ["headless", "composable", "api-first", "api first", "decoupled", "microarchitecture", "building block", "mcp", "model context protocol", "modular", "agent-ready", "agent native", "agentic crm", "headless 360", "gtm.ai", "ui-less", "uiless", "event-driven", "exposed via api", "api layer", "middleware", "ipaaS"],
  },
  {
    topic: "Marketing & Brand",
    keywords: ["marketing", "brand", "content", "thought leadership", "seo", "demand"],
  },
  {
    topic: "Founders & Fundraising",
    keywords: ["startup", "founder", "funding", "vc", "valuation", "ipo", "equity"],
  },
];

function computeTrends(items) {
  const recentCutoff = new Date().getTime() - 7 * 24 * 3600 * 1000;
  const halfCutoff = new Date().getTime() - 3 * 24 * 3600 * 1000;

  const recentTotal = items.filter((m) => new Date(m.publishedAt).getTime() >= recentCutoff).length;
  const olderTotal = Math.max(items.length - recentTotal, 1);

  const buckets = trendTopics.map((topic) => {
    const matches = items.filter((item) => {
      const haystack = `${item.title} ${item.tags?.join(" ") || ""} ${item.summary || ""}`.toLowerCase();
      return topic.keywords.some((k) => haystack.includes(k));
    });
    const recent = matches.filter((m) => new Date(m.publishedAt).getTime() >= recentCutoff).length;
    const older = matches.length - recent;
    const recent3 = matches.filter((m) => new Date(m.publishedAt).getTime() >= halfCutoff).length;

    const recentShare = recentTotal > 0 ? recent / recentTotal : 0;
    const olderShare = older / olderTotal;

    let change = 0;
    let direction = "flat";
    if (olderShare > 0) {
      change = Math.round(((recentShare - olderShare) / olderShare) * 100);
    } else if (recentShare > 0) {
      change = 100;
    }
    if (change > 8) direction = "up";
    else if (change < -8) direction = "down";

    const articles = matches.filter((m) => m.type === "article").length;
    const podcasts = matches.filter((m) => m.type === "podcast").length;

    return {
      topic: topic.topic,
      count: matches.length,
      recent3,
      change,
      direction,
      articles,
      podcasts,
      topItems: matches.slice(0, 3).map((m) => m.title),
    };
  });

  return buckets
    .filter((b) => b.count > 0)
    .sort((a, b) => b.count - a.count || b.recent3 - a.recent3)
    .slice(0, 8)
    .map((b, i) => ({
      rank: i + 1,
      ...b,
      topItems: undefined,
      topItem: b.topItems[0] || "",
      secondItem: b.topItems[1] || "",
    }));
}

function hashId(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

const parser = new Parser({
  headers: { "User-Agent": "RevOpsPulse/1.0" },
  customFields: { item: ["itunes:duration", "itunes:image"] },
});

async function fetchFeed(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "RevOpsPulse/1.0", Accept: "application/rss+xml, application/xml, text/xml, */*" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  return parser.parseString(text);
}

async function main() {
  console.log("Fetching RSS feeds...");

  const results = await Promise.allSettled(
    feedSources.map(async (source) => {
      const feed = await fetchFeed(source.feedUrl);
      return (feed.items || []).slice(0, 15).map((item) => {
        const link = item.link || source.siteUrl;
        const content = item.content || item.contentSnippet || "";
        const isArticle = source.type === "article";

        return {
          id: `feed-${source.id}-${hashId(link)}`,
          type: source.type,
          title: item.title || "Untitled",
          source: source.name,
          sourceUrl: link,
          author: item.creator || source.author,
          publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
          readTime: isArticle ? estimateReadTime(content) : undefined,
          duration: !isArticle ? parseDuration(item["itunes:duration"]) : undefined,
          summary: item.contentSnippet?.trim() || item.content?.replace(/<[^>]*>/g, "").trim().slice(0, 400) || "",
          tags: (item.categories || []).slice(0, 6),
          relevanceScore: 50,
          whyItMatters: [],
          saved: false,
        };
      });
    })
  );

  const items = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      items.push(...result.value);
    } else {
      console.warn("Feed fetch failed:", result.reason?.message || result.reason);
    }
  }

  items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  const output = {
    items: items.slice(0, 100),
    trends: computeTrends(items.slice(0, 100)),
    fetchedAt: new Date().toISOString(),
  };
  const outPath = resolve(__dirname, "..", "public", "feed-data.json");

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log(`Generated feed-data.json with ${output.items.length} items and ${output.trends.length} trends`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("Failed to generate feed data:", err);
  process.exit(1);
});
