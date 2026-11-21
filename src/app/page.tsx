import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { FeedDashboard } from "@/components/feed/FeedDashboard";
import { parseApprovedArticles, parseFeedPayload } from "@/lib/feed-data";
import { computeTrends } from "../../scripts/feed-pipeline.mjs";
import type { TrendingTheme } from "@/lib/types";

async function readData(filename: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(join(process.cwd(), "public", filename), "utf8"));
  } catch (error) {
    console.warn(`Unable to read ${filename}; rendering a safe empty state.`, error);
    return null;
  }
}

// These files are read at build time, not fetched after the page loads.
export default async function Page() {
  const [feed, approved] = await Promise.all([readData("feed-data.json"), readData("approved-intelligence.json")]);
  const initialFeed = parseFeedPayload(feed);
  initialFeed.trends = computeTrends(initialFeed.items) as TrendingTheme[];
  return <FeedDashboard initialFeed={initialFeed} approvedArticles={parseApprovedArticles(approved)} />;
}
