import type { FeedItem, RelevanceProfile } from "@/lib/types";
import { mockProfile } from "@/data/mockProfile";

export const PROFILE_KEY = "revops-pulse-profile-v1";
export function loadProfile(): RelevanceProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return mockProfile;
    const parsed: Partial<RelevanceProfile> = JSON.parse(raw);
    return {
      ...mockProfile, ...parsed,
      functionFocus: Array.isArray(parsed.functionFocus) ? parsed.functionFocus : mockProfile.functionFocus,
      region: Array.isArray(parsed.region) ? parsed.region : mockProfile.region,
      boostedKeywords: Array.isArray(parsed.boostedKeywords) ? parsed.boostedKeywords : mockProfile.boostedKeywords,
      blockedTopics: Array.isArray(parsed.blockedTopics) ? parsed.blockedTopics : mockProfile.blockedTopics,
    };
  } catch { return mockProfile; }
}

// Explicit regional evidence in article content only. A global or untagged story
// remains eligible regardless of region; we do not infer location from a publisher.
const regionSignals: Record<string, RegExp> = {
  "North America": /\b(?:north america|usa|u\.s\.|united states|canada|american|canadian)\b/i,
  "United Kingdom": /\b(?:united kingdom|u\.k\.|britain|british|england|scotland|wales|london)\b/i,
  Europe: /\b(?:europe|european|emea|european union|eu regulation|gdpr|germany|france|spain|portugal|netherlands)\b/i,
  "Latin America": /\b(?:latin america|latam|brazil|mexico|argentina|colombia)\b/i,
  "Middle East & Africa": /\b(?:middle east|africa|mena|south africa|uae|saudi arabia|nigeria|kenya)\b/i,
  "Asia Pacific": /\b(?:asia pacific|apac|australia|new zealand|japan|singapore|india|south korea)\b/i,
};

const roleSignals: Record<string, RegExp> = {
  "RevOps Leader": /\b(?:revops|revenue operations|forecast|pipeline|crm|gtm|revenue|attribution)\b/i,
  "Revenue Operations": /\b(?:revops|revenue operations|forecast|pipeline|crm|attribution|data quality)\b/i,
  "Sales Operations": /\b(?:sales operations|sales ops|salesforce|pipeline|quota|forecast|territor|deal desk|sales enablement)\b/i,
  "Marketing Operations": /\b(?:marketing|demand generation|demand gen|attribution|campaign|lead routing|martech|conversion)\b/i,
  "Customer Success": /\b(?:customer success|retention|renewal|churn|onboard|customer health|expansion|customer lifecycle)\b/i,
  "GTM Leader": /\b(?:gtm|go.to.market|growth|revenue|sales strategy|market expansion|commercial)\b/i,
  "Founder / Operator": /\b(?:founder|startup|fundrais|operating model|growth|scal|lean team|business model)\b/i,
  "AI & Automation": /\b(?:artificial intelligence|ai agent|agentic|copilot|automation|workflow|llm|machine learning)\b/i,
};
function storyText(item: FeedItem): string {
  // Avoid the pre-generated generic "Why this matters" text: it can mention
  // categories unrelated to the actual article and distort matching.
  return [item.title, item.summary, ...item.tags].join(" ").toLowerCase();
}
function topicMatch(text: string, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return false;
  return text.includes(needle);
}
export function matchedRegions(item: FeedItem): string[] {
  const text = storyText(item);
  return Object.entries(regionSignals).filter(([,pattern]) => pattern.test(text)).map(([region])=>region);
}
export function relevanceReasons(item: FeedItem, profile: RelevanceProfile): string[] {
  const text = storyText(item);
  const reasons: string[] = [];
  const interests = [...profile.boostedKeywords, ...profile.functionFocus];
  const found = interests.find(term=>topicMatch(text,term));
  if(found) reasons.push("Matches your interest in " + found);
  if (roleSignals[profile.role]?.test(text)) reasons.push("Relevant to " + profile.role);
  const regions = matchedRegions(item);
  const selected = profile.region.find(region=>regions.includes(region));
  if(selected && !profile.region.includes("Global")) reasons.push("Mentions " + selected);
  return reasons;
}
export function personalisedScore(item: FeedItem, profile: RelevanceProfile): number {
  const text = storyText(item);
  const topics = [...new Set([...profile.functionFocus,...profile.boostedKeywords,...(profile.techStack||[])])];
  const hits = topics.filter(term=>topicMatch(text,term)).length;
  const roleBoost = roleSignals[profile.role]?.test(text) ? 18 : 0;
  const explicitRegions = matchedRegions(item);
  const regionBoost = !profile.region.includes("Global") && profile.region.some(region=>explicitRegions.includes(region)) ? 16 : 0;
  const formatBoost = item.type==="podcast" ? (profile.podcastWeight-50)/3 : 0;
  const strategy = /\b(?:strategy|leadership|forecast|market trends|business model)\b/i.test(text);
  const tactical = /\b(?:how.to|workflow|implementation|tutorial|playbook|guide|step.by.step)\b/i.test(text);
  const focusBoost = profile.strategicWeight > profile.tacticalWeight ? (strategy?8:0) : (tactical?8:0);
  const age = Date.now() - new Date(item.publishedAt).getTime();
  const recentBoost = Number.isFinite(age) && age>=0 ? Math.max(0,12-Math.floor(age/(7*86400000))*3) : 0;
  return item.relevanceScore + Math.min(36,hits*12) + roleBoost + regionBoost + formatBoost + focusBoost + recentBoost;
}
export function isBlocked(item: FeedItem, profile: RelevanceProfile): boolean {
  const text=storyText(item);
  return profile.blockedTopics.some(term=>topicMatch(text,term));
}
