# RevOps Pulse — OpenAI API setup

Create an OpenAI API project named RevOps Pulse at https://platform.openai.com/ and configure separate API billing, a modest usage budget and alerts.

## Security
Create a project-scoped API key. Never paste it into chats or GitHub, commit it to the repository, or expose it using NEXT_PUBLIC_. Store it in a private secret available only to the backend enrichment job (for example GitHub Actions repository secrets or a Cloudflare Worker secret).

## Intended rollout
1. Gather permitted RSS metadata and licensed source content only.
2. Deduplicate by canonical URL; enrich each new story once, not on every visitor page load.
3. Generate structured whatChanged, whyItMatters, strategicImplication, whatToWatch, recommendedAction and evidence-based confidence fields.
4. Verify claims against available permitted inputs; mark insufficient evidence clearly and queue uncertain outputs for review.
5. Cache approved results and track token usage, requests and cost, with a daily request limit.
6. Preserve external $5 lifetime checkout and current link delivery without changes.

Do not activate API calls until private credentials, source rights and staging tests have been confirmed.
