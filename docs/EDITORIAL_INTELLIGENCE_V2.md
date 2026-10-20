# RevOps Pulse — Editorial Intelligence V2 Implementation Spec

## Product constraint
- No payment, login, email collection or gating changes. External $5 lifetime purchase flow is out of scope.
- Editorial magazine-style homepage (cream, coral, charcoal) with reusable artwork placeholders pending licensed Canva imagery.
- News articles remain linked to their original publishers. Do not rehost publisher photography or copyrighted bodies.

## Structured intelligence schema
Each FeedItem may contain `analysis`:
```ts
interface EditorialAnalysis {
  whatChanged: string;
  whyItMatters: string;
  strategicImplication: string;
  whatToWatch: string;
  recommendedAction: string;
  confidence: "low" | "medium" | "high";
  evidenceType: "rss_metadata" | "licensed_source" | "editor_reviewed";
  sourceUrl: string;
}
```
`intelligence` legacy data supported until regenerated.

## Analysis policy
- RSS summaries and metadata alone may not support specific claims. Generate only conditional, general implications from metadata and mark `confidence: "low"` and `evidenceType: "rss_metadata"`.
- Do **not** label this output AI-generated or editorially verified.
- Advanced LLM workflow (future phase): server-side generation from *licensed/approved inputs*, strict structured JSON validation, URL citations, a fact-check/review queue, non-republished wording, and audit logging. Require API credentials and explicit source permission review before enabling.
- If evidence is absent, show a source-linked 'read for details' state rather than fabricate a development.

## UX
1. Homepage hero: editorial headline, brand statement, abstract art placeholder.
2. Four image-led category tiles: CRM & Tech, Frontier AI, RevOps, GTM Trends; tabs remain.
3. Article cards: publisher, date, title, excerpt, visual illustration, and expandable analysis with six fields.
4. Freshness: actual `fetchedAt` timestamp and recent badges based on publisher dates.
5. Original source link appears on every article. Never imply an article was verified by AI.
6. Static made-up statistics are prohibited.

## Content quality gates
- Feed source failure must not fail site build by itself; record failed feed sources.
- Deduplicate by canonical URL/title, reject invalid publication dates.
- Analytics and trending values only from collected dataset, clearly labelled as 'within this feed'.
- Maintain license evidence for Canva assets. Image mapping will be local site assets, not publisher images.

## Release acceptance
- TypeScript/Next build passes in Cloudflare preview.
- Category filters, article links, saved story buttons, responsive page layout and new analysis work.
- Old `intelligence` and missing `analysis` do not crash UI.
- No invented certainty, freshness, user-specific ranking, payment or publisher-image rights claims.
- Merge only after successful preview build; check production deployment status.
