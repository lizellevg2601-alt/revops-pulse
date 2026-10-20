import type { FeedItem, RelevanceProfile } from "@/lib/types";
import { mockProfile } from "@/data/mockProfile";

export const PROFILE_KEY = "revops-pulse-profile-v1";
export function loadProfile(): RelevanceProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return mockProfile;
    const parsed: Partial<RelevanceProfile> = JSON.parse(raw);
    return {
      ...mockProfile,
      ...parsed,
      functionFocus: Array.isArray(parsed.functionFocus) ? parsed.functionFocus : mockProfile.functionFocus,
      region: Array.isArray(parsed.region) ? parsed.region : mockProfile.region,
      boostedKeywords: Array.isArray(parsed.boostedKeywords) ? parsed.boostedKeywords : mockProfile.boostedKeywords,
      blockedTopics: Array.isArray(parsed.blockedTopics) ? parsed.blockedTopics : mockProfile.blockedTopics,
    };
  } catch { return mockProfile; }
}
export function personalisedScore(item: FeedItem, profile: RelevanceProfile): number {
  const haystack = [item.title,item.summary,...item.tags,...item.whyItMatters].join(" ").toLowerCase();
  const terms = [...profile.functionFocus, ...profile.boostedKeywords, profile.role, ...(profile.techStack || [])];
  const boosts = terms.reduce((sum, term) => sum + (term && haystack.includes(term.toLowerCase()) ? 12 : 0), 0);
  const regionBoost = profile.region.some(region => region !== "Global" && haystack.includes(region.toLowerCase())) ? 15 : 0;
  const formatBoost = item.type === "podcast" ? (profile.podcastWeight - 50) / 4 : 0;
  const focusBoost = profile.strategicWeight > profile.tacticalWeight
    ? (/strategy|leadership|forecast|market|trend/.test(haystack) ? 8 : 0)
    : (/how to|workflow|implementation|tutorial|guide/.test(haystack) ? 8 : 0);
  return item.relevanceScore + boosts + regionBoost + formatBoost + focusBoost;
}
export function isBlocked(item: FeedItem, profile: RelevanceProfile) {
  const searchable = [item.title, item.summary, ...item.tags].join(" ").toLowerCase();
  return profile.blockedTopics.some(term => term.trim() && searchable.includes(term.trim().toLowerCase()));
}
