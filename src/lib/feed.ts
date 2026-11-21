import type { FeedFiltersState, FeedItem } from "./types";

export const categories = [
  { id: "all", label: "All news" },
  { id: "crm", label: "CRM & Tech" },
  { id: "ai", label: "Frontier AI" },
  { id: "revops", label: "RevOps" },
  { id: "gtm", label: "GTM Trends" },
] as const;

export type Category = (typeof categories)[number]["id"];

export function categoryLabel(category: FeedItem["category"]) {
  return categories.find(entry => entry.id === category)?.label || "Industry news";
}

export function sourceUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

// Use a fixed locale and time zone so exported HTML and hydration agree.
export function formatDate(value: string, includeTime = false) {
  if (!Number.isFinite(Date.parse(value))) return "Date unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value)) + (includeTime ? " UTC" : "");
}

export function parseSavedIds(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? [...new Set(parsed.filter((id): id is string => typeof id === "string"))] : [];
  } catch {
    return [];
  }
}

export function filterFeed(items: FeedItem[], options: {
  category: Category;
  query: string;
  filters: FeedFiltersState;
  savedOnly: boolean;
  savedIds: string[];
}): FeedItem[] {
  const terms = options.query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return items.filter(item => {
    if (options.category !== "all" && item.category !== options.category) return false;
    if (options.filters.contentType !== "all" && item.type !== options.filters.contentType) return false;
    if (options.savedOnly && !options.savedIds.includes(item.id)) return false;
    const text = [item.title, item.source, item.summary, item.author, ...item.tags].join(" ").toLocaleLowerCase();
    return terms.every(term => text.includes(term));
  }).map(item => ({ ...item, saved: options.savedIds.includes(item.id) })).sort((a, b) => {
    if (options.filters.sort === "score" && a.relevanceScore !== b.relevanceScore) return b.relevanceScore - a.relevanceScore;
    return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
  });
}
