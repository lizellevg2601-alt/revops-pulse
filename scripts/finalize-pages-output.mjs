import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const outputDirectory = fileURLToPath(new URL("../out/", import.meta.url));
const hashes = new Set();

async function collectHtml(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collectHtml(path);
    else if (entry.name.endsWith(".html")) {
      const html = await readFile(path, "utf8");
      for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
        if (!match[1]) continue;
        hashes.add(`'sha256-${createHash("sha256").update(match[1]).digest("base64")}'`);
      }
    }
  }
}

await collectHtml(outputDirectory);
if (hashes.size === 0) throw new Error("No inline Next.js scripts found for CSP hashing");

const headersPath = join(outputDirectory, "_headers");
const headers = await readFile(headersPath, "utf8");
if (!headers.includes("script-src 'self';")) throw new Error("CSP script-src marker is missing");
await writeFile(headersPath, headers.replace("script-src 'self';", `script-src 'self' ${[...hashes].sort().join(" ")};`));
console.log(`Added ${hashes.size} inline-script hashes to out/_headers`);
