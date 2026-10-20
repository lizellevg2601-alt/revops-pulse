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

  // Candidate industry feeds. Individual failures are logged; no feed is required for a successful build.
  { id: "hubspot", name: "HubSpot", type: "article", category: "crm", feedUrl: "https://blog.hubspot.com/marketing/rss.xml", siteUrl: "https://blog.hubspot.com", author: "HubSpot" },
  { id: "dynamics365", name: "Microsoft Dynamics 365", type: "article", category: "crm", feedUrl: "https://www.microsoft.com/en-us/dynamics-365/blog/feed/", siteUrl: "https://www.microsoft.com/en-us/dynamics-365/blog" },
  { id: "pipedrive", name: "Pipedrive", type: "article", category: "crm", feedUrl: "https://www.pipedrive.com/en/blog/feed", siteUrl: "https://www.pipedrive.com/en/blog" },
  { id: "openai", name: "OpenAI", type: "article", category: "ai", feedUrl: "https://openai.com/news/rss.xml", siteUrl: "https://openai.com/news" },
  { id: "google-ai", name: "Google AI", type: "article", category: "ai", feedUrl: "https://blog.google/technology/ai/rss/", siteUrl: "https://blog.google/technology/ai" },
  { id: "huggingface", name: "Hugging Face", type: "article", category: "ai", feedUrl: "https://huggingface.co/blog/feed.xml", siteUrl: "https://huggingface.co/blog" },
  { id: "revops-coop", name: "RevOps Co-op", type: "article", category: "revops", feedUrl: "https://www.revopscoop.com/blog/rss.xml", siteUrl: "https://www.revopscoop.com" },
  { id: "gtmnow", name: "GTMnow", type: "article", category: "gtm", feedUrl: "https://gtmnow.com/feed/", siteUrl: "https://gtmnow.com" },
  { id: "clari", name: "Clari", type: "article", category: "revops", feedUrl: "https://www.clari.com/blog/feed/", siteUrl: "https://www.clari.com/blog" },
  { id: "gong", name: "Gong", type: "article", category: "revops", feedUrl: "https://www.gong.io/blog/feed/", siteUrl: "https://www.gong.io/blog" },
  { id: "techcrunch-ai", name: "TechCrunch AI", type: "article", category: "ai", feedUrl: "https://techcrunch.com/category/artificial-intelligence/feed/", siteUrl: "https://techcrunch.com/category/artificial-intelligence/" },
  { id: "venturebeat-ai", name: "VentureBeat AI", type: "article", category: "ai", feedUrl: "https://venturebeat.com/category/ai/feed/", siteUrl: "https://venturebeat.com/category/ai/" },
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

function textOf(item) {
  return `${item.title} ${item.tags?.join(" ") || ""} ${item.summary || ""}`.toLowerCase();
}

const reasonTemplates = {
  "AI & Agents": "Connects directly to your AI & agents focus — how teams are applying automation and model-based workflows.",
  "Revenue Forecasting": "Feeds the Revenue Forecasting thread in your profile with pipeline and prediction signals.",
  "GTM Strategy": "Plugs into your GTM Strategy interest — motion, positioning, and go-to-market execution.",
  "Org Design & Leadership": "Bears on Org Design & Leadership — team build-outs and how RevOps leaders operate.",
  "Data & Attribution": "Supports your Data & Attribution tracking — how revenue work is measured and attributed.",
  "Tech Stack & CPQ": "Touches Tech Stack & CPQ — the tooling and configuration decisions behind the stack.",
  "Composable & Headless": "Advances the Composable & Headless thread — the modern, API-first architecture you follow.",
  "Marketing & Brand": "Adds context to Marketing & Brand — how content and demand feed the funnel.",
  "Founders & Fundraising": "Relevant to Founders & Fundraising — funding dynamics and founder execution.",
};

function signalBullets(item) {
  const t = textOf(item);
  const bullets = [];
  if (/playbook|checklist|how to|template|tips?|guide|step-?by-?step|actionable|best practice/.test(t))
    bullets.push("Actionable — offers concrete steps or a playbook you can lift into your own programs.");
  if (/benchmark|survey|\d+%|\$\d|report|study|data on/.test(t))
    bullets.push("Backed by data or benchmarks you can calibrate your own numbers against.");
  if (/case stud|example|real-world|walkthrough|story of/.test(t))
    bullets.push("Grounded in real examples you can adapt to your own setup.");
  if (/trend|emerging|2026|roadmap|wave|shift|evolv/.test(t))
    bullets.push("Forward-looking — frames where the practice is heading this cycle.");
  return bullets;
}

function buildWhyItMatters(matched, item) {
  const bullets = [];
  for (const topic of matched) {
    const line = reasonTemplates[topic];
    if (line && !bullets.includes(line)) {
      bullets.push(line);
      if (bullets.length >= 2) break;
    }
  }
  for (const line of signalBullets(item)) {
    if (bullets.length >= 3) break;
    bullets.push(line);
  }
  if (bullets.length === 0) {
    bullets.push("Highlights go-to-market themes that shape day-to-day RevOps work.");
  }
  return bullets;
}

function relevanceScoreFor(item, matched) {
  const t = textOf(item);
  let score = 50 + Math.min(24, matched.length * 6);
  if (/benchmark|survey|report|study|data/.test(t)) score += 6;
  if (/playbook|how to|template|guide/.test(t)) score += 6;
  if (new Date(item.publishedAt).getTime() >= Date.now() - 3 * 24 * 3600 * 1000) score += 4;
  return Math.min(96, Math.max(38, score));
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
      return (feed.items || []).slice(0, 20).map((item) => {
        const link = item.link || source.siteUrl;
        const content = item.content || item.contentSnippet || "";
        const isArticle = source.type === "article";
        const summary =
          item.contentSnippet?.trim() ||
          item.content?.replace(/<[^>]*>/g, "").trim().slice(0, 400) ||
          "";
        const tags = (item.categories || []).slice(0, 6);
        const publishedAt = item.isoDate || item.pubDate || new Date().toISOString();
        const baseItem = {
          title: item.title || "Untitled",
          summary,
          tags,
          type: source.type,
          publishedAt,
        };
        const matched = trendTopics
          .filter((tp) => tp.keywords.some((k) => textOf(baseItem).includes(k)))
          .map((tp) => tp.topic);

        return {
          id: `feed-${source.id}-${hashId(link)}`,
          type: source.type,
          category: source.category || (/salesforce|crm-switch|outfunnel/.test(source.id) ? "crm" : /revops|seafoam/.test(source.id) ? "revops" : /20vc|sam-jacobs|topline/.test(source.id) ? "gtm" : "revops"),
          title: baseItem.title,
          source: source.name,
          sourceUrl: link,
          author: item.creator || source.author,
          publishedAt,
          readTime: isArticle ? estimateReadTime(content) : undefined,
          duration: !isArticle ? parseDuration(item["itunes:duration"]) : undefined,
          summary,
          tags,
          relevanceScore: relevanceScoreFor(baseItem, matched),
          whyItMatters: buildWhyItMatters(matched, baseItem),
          saved: false,
        };
      });
    })
  );

  const items = [];
  const health = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const source = feedSources[i];
    if (result.status === "fulfilled") {
      items.push(...result.value);
      health.push({ source: source.name, status: "ok", count: result.value.length });
    } else {
      console.warn("Feed fetch failed for " + source.name + ":", result.reason?.message || result.reason);
      health.push({ source: source.name, status: "failed", count: 0 });
    }
  }

  // Remove repeated URLs and syndicated titles; prefer the most recently published story.
  const seenUrls = new Set();
  const seenTitles = new Set();
  const unique = items
    .filter(item => item.title && item.sourceUrl && Number.isFinite(Date.parse(item.publishedAt)))
    .sort((a,b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .filter(item => {
      const url = item.sourceUrl.replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();
      const title = item.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (seenUrls.has(url) || seenTitles.has(title)) return false;
      seenUrls.add(url); seenTitles.add(title); return true;
    });

  // Round-robin across categories so a high-volume general publication cannot
  // crowd out smaller CRM and RevOps publishers.
  const categories = ["crm", "ai", "revops", "gtm"];
  const buckets = Object.fromEntries(categories.map(c=>[c,unique.filter(item=>item.category===c)]));
  const selected = [];
  while (selected.length < 120 && categories.some(c=>buckets[c].length)) {
    for (const category of categories) {
      if (selected.length >= 120) break;
      if (buckets[category].length) selected.push(buckets[category].shift());
    }
  }
  selected.sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
  const output = {
    items: selected,
    trends: computeTrends(selected),
    fetchedAt: new Date().toISOString(),
    sources: health,
  };
  const outPath = resolve(__dirname, "..", "public", "feed-data.json");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Generated ${selected.length} unique feed items from ${health.filter(x=>x.status==="ok").length}/${health.length} sources`);

}

main().then(() => process.exit(0)).catch((err) => {
  console.error("Failed to generate feed data:", err);
  process.exit(1);
});
