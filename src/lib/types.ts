export type ContentType = "article" | "podcast";

export interface FeedItem {
  id: string;
  type: ContentType;
  category?: "crm" | "ai" | "revops" | "gtm";
  title: string;
  source: string;
  sourceUrl?: string;
  author?: string;
  publishedAt: string;
  readTime?: number;
  duration?: number;
  summary: string;
  imageUrl?: string;
  tags: string[];
  relevanceScore: number;
  whyItMatters: string[];
  intelligence?: { signal: string; impact: string; action: string };
  analysis?: { whatChanged: string; whyItMatters: string; strategicImplication: string; whatToWatch: string; recommendedAction: string; confidence: "low" | "medium" | "high"; evidenceType: "rss_metadata" | "licensed_source" | "editor_reviewed"; sourceUrl: string };
  saved: boolean;
  likes?: number;
  comments?: number;
}

export interface RelevanceProfile {
  role: string;
  seniority?: string;
  orgSize: string;
  companyStage?: string;
  functionFocus: string[];
  region: string[];
  industry?: string[];
  revenueModel?: string[];
  salesMotion?: string[];
  techStack?: string[];
  preferredDepth: "brief" | "balanced" | "deep";
  strategicWeight: number;
  tacticalWeight: number;
  podcastWeight: number;
  boostedKeywords: string[];
  blockedTopics: string[];
}

export interface FeedFiltersState {
  contentType: ContentType | "all";
  sort: "recent" | "score";
}

export interface TrendingTheme {
  rank: number;
  topic: string;
  count: number;
  recent3: number;
  change: number | null;
  direction: "up" | "down" | "flat";
  articles: number;
  podcasts: number;
  topItem: string;
  secondItem: string;
}

export interface FeedPayload {
  items: FeedItem[];
  trends: TrendingTheme[];
  fetchedAt: string;
  attemptedAt?: string;
  sources?: { id?: string; source: string; status: "ok" | "failed"; count: number; retainedCount?: number }[];
}

export interface ApprovedArticle {
  id: string;
  title: string;
  category: NonNullable<FeedItem["category"]>;
  whatChanged: string;
  why: string;
  implications: string;
  watch: string;
  action: string;
  editor: string;
  approvedAt: string;
  sources: string[];
}
