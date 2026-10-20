const SAVED_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SESSION_ID = /^cs_test_[a-zA-Z0-9_]{8,200}$/;

export function validEmail(value) {
  return typeof value === "string" && value.length <= 254 && EMAIL.test(value);
}

export function validUuid(value) {
  return typeof value === "string" && UUID.test(value);
}

export function validCheckoutSessionId(value) {
  return typeof value === "string" && SESSION_ID.test(value);
}

export function validSavedItemId(value) {
  return typeof value === "string" && SAVED_ID.test(value);
}

function stringArray(value, maxItems = 30) {
  return Array.isArray(value) && value.length <= maxItems && value.every((item) => typeof item === "string" && item.length >= 1 && item.length <= 80);
}

export function validPreferences(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const allowed = new Set(["role", "seniority", "orgSize", "companyStage", "functionFocus", "region", "industry", "revenueModel", "salesMotion", "techStack", "preferredDepth", "strategicWeight", "tacticalWeight", "podcastWeight", "boostedKeywords", "blockedTopics"]);
  if (Object.keys(value).some((key) => !allowed.has(key))) return false;
  const required = ["role", "orgSize", "functionFocus", "region", "preferredDepth", "strategicWeight", "tacticalWeight", "podcastWeight", "boostedKeywords", "blockedTopics"];
  if (required.some((key) => !Object.hasOwn(value, key))) return false;
  if (!["role", "orgSize"].every((key) => typeof value[key] === "string" && value[key].length >= 1 && value[key].length <= 80)) return false;
  if (["seniority", "companyStage"].some((key) => value[key] !== undefined && (typeof value[key] !== "string" || value[key].length < 1 || value[key].length > 80))) return false;
  if (!["functionFocus", "region", "boostedKeywords", "blockedTopics"].every((key) => stringArray(value[key]))) return false;
  if (["industry", "revenueModel", "salesMotion", "techStack"].some((key) => value[key] !== undefined && !stringArray(value[key]))) return false;
  if (!["brief", "balanced", "deep"].includes(value.preferredDepth)) return false;
  return ["strategicWeight", "tacticalWeight", "podcastWeight"].every((key) => Number.isInteger(value[key]) && value[key] >= 0 && value[key] <= 100);
}
