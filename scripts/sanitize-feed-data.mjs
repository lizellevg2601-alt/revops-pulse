import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { MAX_SUMMARY_CHARS, sanitizeItem } from "./feed-pipeline.mjs";

const path = `${process.cwd()}/public/feed-data.json`;
const feed = JSON.parse(readFileSync(path, "utf8"));
const output = { ...feed, items: (feed.items || []).map(sanitizeItem) };

writeFileSync(`${path}.tmp`, JSON.stringify(output, null, 2) + "\n");
renameSync(`${path}.tmp`, path);

console.log(`Sanitized ${output.items.length} stories: excerpts capped at ${MAX_SUMMARY_CHARS} characters; podcast descriptions removed.`);
