# RevOps Pulse

RevOps Pulse is a static Next.js App Router site for CRM, AI, revenue operations, and go-to-market source updates. The homepage is pre-rendered from committed feed data, so real headlines are present in the delivered HTML.

## Editorial boundaries

- **Source updates** are publisher RSS headlines and excerpts linked to the original publisher. RevOps Pulse has not independently verified them.
- **Automated context** is low-confidence, keyword-based guidance derived from RSS metadata. It is not editor-reviewed and does not establish facts about a publisher's story.
- **Editor-reviewed briefings** are rendered only from complete records in `public/approved-intelligence.json`, with a named reviewer, approval date, and supporting sources. Automated stories never inherit that status.
- Saved stories are kept in browser local storage only; there is no account or cross-device sync.

The public methodology page is at `/about/`.

## Local development

```bash
npm ci
npm run dev
```

Open http://localhost:3000.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run generate:feed` | Fetch monitored RSS feeds, deduplicate and rank stories, refresh trends, and write `public/feed-data.json`. Failed publishers retain previously collected stories; a total outage preserves the last useful feed. |
| `npm run build` | Generate the feed and build the static export into `out/`. Use this when publishing fresh RSS data. |
| `npm run build:static` | Build from the committed feed data without contacting publishers. Used by quality checks and preview deployments. |
| `npm run preview` | Serve the built `out/` directory at http://127.0.0.1:4173. |
| `npm run lint` | Run ESLint. |
| `npm test` | Run the Node unit tests for filtering, validation, keyword matching, and feed fallback logic. |
| `npm run test:e2e` | Run Playwright browser checks against `out/`. Install the browser once with `npx playwright install chromium`, and build first with `npm run build:static`. |
| `npm run test:empty` | Temporarily replace the feed with an empty outage fixture, rebuild, test the empty state, then restore the feed and rebuild. Do not interrupt it while it runs. |

## Data files

- `public/feed-data.json` — generated source updates, topic counts, refresh time, and publisher health.
- `public/approved-intelligence.json` — editor-reviewed briefings. An empty array is valid; no placeholder briefings are generated.
- `src/app/about/page.tsx` — reader-facing explanation of sources, ranking, freshness, outages, and saved stories.

The local editorial review tool lives in `tools/editorial-studio/` and is intentionally outside the published routes. See `tools/editorial-studio/README.md`.
