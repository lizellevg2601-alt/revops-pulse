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

function extractImage(content) {
  const match = (content || "").match(/<img[^>]+src=["']([^"']+)["']/);
  return match?.[1];
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
  timeout: 15000,
  headers: { "User-Agent": "RevOpsPulse/1.0" },
  customFields: { item: ["itunes:duration", "itunes:image"] },
});

async function main() {
  console.log("Fetching RSS feeds...");

  const results = await Promise.allSettled(
    feedSources.map(async (source) => {
      const feed = await parser.parseURL(source.feedUrl);
      return (feed.items || []).slice(0, 10).map((item) => {
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
          imageUrl: isArticle ? extractImage(content) : item["itunes:image"] || undefined,
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

  const output = { items: items.slice(0, 50), fetchedAt: new Date().toISOString() };
  const outPath = resolve(__dirname, "..", "public", "feed-data.json");

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log(`Generated feed-data.json with ${output.items.length} items`);
}

main().catch((err) => {
  console.error("Failed to generate feed data:", err);
  process.exit(1);
});
