export function validateFeedItems(items) {
  if (!Array.isArray(items)) throw new Error("Generated feed items must be an array");
  const validItems = items.filter((item) =>
    item &&
    typeof item.id === "string" && item.id.length > 0 &&
    typeof item.title === "string" && item.title.trim().length > 0 &&
    typeof item.source === "string" && item.source.trim().length > 0 &&
    typeof item.sourceUrl === "string" && /^https?:\/\//.test(item.sourceUrl) &&
    typeof item.publishedAt === "string" && Number.isFinite(Date.parse(item.publishedAt))
  );
  if (validItems.length === 0) throw new Error("No valid feed items were generated; refusing to replace the deployed feed");
  return validItems;
}
