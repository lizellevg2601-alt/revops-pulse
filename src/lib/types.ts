export type ContentType = "article" | "podcast";

export interface FeedItem {
  id: string;
  type: ContentType;
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
  sort: "relevant" | "recent" | "discussed" | "score";
}

export interface TrendingTheme {
  rank: number;
  topic: string;
  change: number;
  direction: "up" | "down" | "flat";
}
