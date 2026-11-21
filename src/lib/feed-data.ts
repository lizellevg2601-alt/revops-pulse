import type { ApprovedArticle, FeedItem, FeedPayload, TrendingTheme } from "./types";
import { sourceUrl } from "./feed";

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseFeedPayload(value: unknown): FeedPayload {
  if (!record(value)) return { items: [], trends: [], fetchedAt: "" };
  const items = Array.isArray(value.items) ? value.items.filter((item): item is FeedItem =>
    record(item) && typeof item.id === "string" && typeof item.title === "string" &&
    typeof item.source === "string" && typeof item.summary === "string" &&
    typeof item.publishedAt === "string" && Number.isFinite(Date.parse(item.publishedAt)) &&
    (item.type === "article" || item.type === "podcast") &&
    typeof item.relevanceScore === "number" && Array.isArray(item.tags) && item.tags.every(tag => typeof tag === "string")
  ) : [];
  return {
    items,
    fetchedAt: typeof value.fetchedAt === "string" ? value.fetchedAt : "",
    attemptedAt: typeof value.attemptedAt === "string" ? value.attemptedAt : undefined,
    trends: Array.isArray(value.trends) ? value.trends.filter((theme): theme is TrendingTheme =>
      record(theme) && typeof theme.topic === "string" && typeof theme.count === "number" &&
      typeof theme.rank === "number" && typeof theme.articles === "number" && typeof theme.podcasts === "number" &&
      (typeof theme.change === "number" || theme.change === null) && ["up", "down", "flat"].includes(String(theme.direction))
    ) : [],
    sources: Array.isArray(value.sources) ? value.sources.filter((source): source is NonNullable<FeedPayload["sources"]>[number] =>
      record(source) && typeof source.source === "string" && (source.status === "ok" || source.status === "failed") && typeof source.count === "number"
    ) : [],
  };
}

export function parseApprovedArticles(value: unknown): ApprovedArticle[] {
  if (!Array.isArray(value)) return [];
  return value.filter((article): article is ApprovedArticle => {
    if (!record(article)) return false;
    const fields = ["id", "title", "whatChanged", "why", "implications", "watch", "action", "editor", "approvedAt"];
    return fields.every(field => typeof article[field] === "string" && String(article[field]).trim().length > 0) &&
      ["crm", "ai", "revops", "gtm"].includes(String(article.category)) &&
      Number.isFinite(Date.parse(String(article.approvedAt))) &&
      Array.isArray(article.sources) && article.sources.length > 0 && article.sources.every(url => !!sourceUrl(url));
  });
}
