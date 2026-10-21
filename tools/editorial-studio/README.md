# RevOps Pulse Editorial Studio (local review tool)

Open `tools/editorial-studio/index.html` in a browser on your own computer. It is intentionally **outside** `public/` and `src/app/`, so it is not served by the RevOps Pulse customer website.

## Simple daily workflow
1. Load or paste a draft from your trusted research workflow. Import a previously saved JSON draft when editing an existing piece.
2. Open each original supporting URL. Update the headline and factual record with evidence and sources. Add your own assessment in the editorial recommendation field.
3. Tick six independent review confirmations. Edits automatically uncheck all boxes so an old approval cannot cover changed text.
4. Save locally or export a draft JSON to back up your work.
5. When all fields and checks are complete, export an approved JSON record. **This does not publish** and must pass separate source-rights and deployment checks.

## Safety boundaries
- This is a local prototype, not an authenticated cloud dashboard. Never upload draft JSON containing secrets.
- Browser localStorage is not encrypted and is device/browser-specific. Prefer manually exporting to secure storage.
- Do not upload reviewer drafts or approved JSON to a public repository if they contain non-public licensed content or personal data.
- Publishing automation, editorial history across devices, audited user identity and legal review are separate planned capabilities. The site currently still displays its legacy RSS feed.
- Copyright compliance cannot be automated by six ticks: assess the publisher terms and actual use rights, particularly for images and text ingested by the AI model.
