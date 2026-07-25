# OpenCode Build Instructions — RevOps Pulse Editorial Flow

Build the approved RevOps Pulse dashboard as a responsive React application.

## 1. Product purpose

RevOps Pulse aggregates industry intelligence from:

- Articles
- Podcasts
- LinkedIn commentary

It then uses AI to generate:

- A personalised feed
- Theme of the Week
- AI-generated overview
- “Why this matters to you” summaries
- Relevance scores
- Role-, company-size-, region-, and function-based recommendations

The experience should feel like a premium editorial intelligence product, not a dense analytics dashboard.

## 2. Required visual direction

Use the approved light editorial design.

### Colour palette

```css
:root {
  --page: #fbfaf8;
  --surface: #ffffff;

  --navy-950: #0f1b3d;
  --navy-900: #18243f;
  --navy-800: #1e3a8a;
  --navy-700: #274690;

  --coral-500: #ff6b63;
  --coral-300: #ffaaa3;
  --coral-200: #ffd7d2;
  --coral-100: #ffe9e1;
  --coral-50: #fff2f2;

  --blue-grey-300: #cfe0f4;
  --blue-grey-200: #dde6f3;
  --blue-grey-100: #e8eef7;

  --slate-700: #475569;
  --slate-500: #64748b;
  --border: #dde3ec;
}
```

### Typography

- Editorial serif for feature headlines
- Clean sans-serif for UI text, navigation, metadata, and controls
- Strong hierarchy with generous whitespace

Suggested:

```css
--font-editorial: "DM Serif Display", Georgia, serif;
--font-ui: "Inter", system-ui, sans-serif;
```

### Photography direction

Use realistic editorial lighthouse and coastal photography for:

- The main featured article
- Theme of the Week
- Article detail
- Any large editorial feature image

The imagery should communicate:

- Guidance
- Signal
- Clarity
- Direction
- Leadership
- Navigating complexity

Image style:

- Photorealistic
- Premium editorial photography
- Soft natural light
- Muted blue, navy, grey, and coral tones
- Coastal scenes
- Calm, intelligent, magazine-like composition

Do not use:

- Abstract AI spheres
- Neon cyber visuals
- Robots
- Holograms
- Futuristic circuitry
- Plastic 3D artwork
- Generic corporate stock photography

## 3. Recommended stack

Use:

- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide icons
- Framer Motion for subtle transitions
- Recharts for compact trend visuals
- CSS Grid for the dashboard shell

## 4. Main desktop layout

```text
┌───────────────┬──────────────────────────────────────┬────────────────────┐
│ Sidebar       │ Main editorial feed                  │ Intelligence rail  │
│ 220–240px     │ Flexible width                       │ 290–320px          │
└───────────────┴──────────────────────────────────────┴────────────────────┘
```

Responsive behaviour:

- Below 1180px: place intelligence rail beneath the feed
- Tablet: collapse sidebar into a drawer
- Mobile: use bottom navigation
- Make filters horizontally scrollable
- Stack cards vertically

## 5. Sidebar

Include:

- RevOps Pulse logo
- Tagline: `Intelligence for RevOps Leaders`
- Home
- Feed
- Topics
- Saved
- Podcasts
- LinkedIn
- Digest
- Settings
- User profile at the bottom

Active navigation state:

- Pale coral background
- Navy text
- Coral icon accent

## 6. Search and top bar

Search placeholder:

```text
Search insights, topics, companies, or people...
```

Also include:

- Notification icon
- Keyboard shortcut hint
- Optional profile shortcut

## 7. Personalisation bar

Place below the top bar.

Heading:

```text
Personalised for you
```

Visible controls:

- Role: RevOps Leader
- Org size: Mid-market
- Focus: GTM / Revenue Ops
- Region: North America + Europe
- Edit settings

Example:

```tsx
<PersonalisationBar
  role="RevOps Leader"
  orgSize="Mid-market"
  focus="GTM / Revenue Ops"
  region="North America + Europe"
/>
```

## 8. Feed filters

Add:

- All
- Articles
- Podcasts
- LinkedIn

Sorting options:

- Most relevant
- Most recent
- Most discussed
- Highest relevance score

## 9. Featured article card

Use a realistic lighthouse image on the left.

Content:

- Article label
- Read time
- Bookmark
- Serif headline
- Summary
- “Why this matters to you”
- Relevance score
- Topic tags

Example headline:

```text
The RevOps Mandate in 2024:
Alignment, AI, and Accountability
```

Example relevance section:

```text
WHY THIS MATTERS TO YOU

• AI-driven alignment improves forecast accuracy and GTM execution.
• Unified data and clean processes reduce cost and cycle time.
• Accountability frameworks close the loop on execution.
```

Show:

```text
AI relevance: 95% match
```

## 10. Podcast card

Include:

- Artwork
- Episode title
- Source
- Duration
- Description
- Play
- 15-second rewind
- 30-second forward
- More menu
- AI relevance score

## 11. LinkedIn insight cards

Create editorial summaries rather than copying LinkedIn’s exact UI.

Each card should include:

- Avatar
- Name
- Role
- Connection degree
- Timestamp
- Post excerpt
- Reactions
- Comments
- Reposts
- AI context panel

AI context labels:

- Recommended for your role
- Why this matters
- Customer journey insight
- Relevant to your priorities

## 12. Theme of the Week

Place at the top of the intelligence rail.

Use realistic lighthouse/coastal photography.

Heading:

```text
Theme of the Week
```

Example:

```text
AI Copilots for Revenue Teams

How leading teams use AI copilots to automate work,
improve decisions and accelerate GTM impact.
```

Button:

```text
Explore theme
```

## 13. AI Overview

Place below Theme of the Week.

Heading:

```text
AI Overview
```

Show `Updated just now`.

Example insights:

- AI tools for RevOps are moving from experiments to scaled impact.
- Forecast accuracy improves 15–25% with AI-driven signal detection.
- Revenue organisations are investing in data quality and workflow automation.
- Accountability and change management are leading drivers of success.

Footer:

```text
Synthesised from 28 articles, 12 podcasts and 46 LinkedIn posts
```

Add source icons.

Create an expanded drawer or modal containing:

- Full overview
- Top signals for you
- Source breakdown
- Explore all insights button

## 14. Trending themes

Include:

- AI in RevOps
- Revenue Forecasting
- GTM Alignment
- Data Quality
- RevOps Operations

Each item should show:

- Rank
- Topic
- Percentage change
- Trend direction

## 15. Relevance profile panel

Create a side drawer titled:

```text
My Relevance Profile
```

Subtitle:

```text
These preferences shape the insights we surface for you.
```

Sections:

- Profile
- Content preferences
- Topic interests
- Keyword boosts
- Blocked topics

Profile fields:

- Role
- Seniority
- Org size
- Company stage
- Function / focus
- Region
- Industry
- Revenue model
- Sales motion
- Tech stack

AI tuning controls:

- More strategic
- More tactical
- Podcast-heavy
- Prefer brief summaries
- Prefer deep analysis
- Prioritise practitioner content
- Prioritise executive content

## 16. Suggested TypeScript models

```ts
type ContentType = "article" | "podcast" | "linkedin";

interface RelevanceProfile {
  role: string;
  seniority?: string;
  orgSize: string;
  companyStage?: string;
  functionFocus: string[];
  region: string[];
  industry?: string[];
  revenueModel?: string[];
  salesMotion?: string[];
  techStack?: string[];
  preferredDepth: "brief" | "balanced" | "deep";
  strategicWeight: number;
  tacticalWeight: number;
  podcastWeight: number;
  boostedKeywords: string[];
  blockedTopics: string[];
}

interface FeedItem {
  id: string;
  type: ContentType;
  title: string;
  source: string;
  author?: string;
  publishedAt: string;
  readTime?: number;
  duration?: number;
  summary: string;
  imageUrl?: string;
  tags: string[];
  relevanceScore: number;
  whyItMatters: string[];
  saved: boolean;
}
```

## 17. Suggested component structure

```text
src/
  components/
    app-shell/
      AppSidebar.tsx
      TopSearchBar.tsx
      MobileNav.tsx

    personalisation/
      PersonalisationBar.tsx
      RelevanceProfileDrawer.tsx
      AITuningControls.tsx

    feed/
      FeedFilters.tsx
      FeaturedArticleCard.tsx
      PodcastCard.tsx
      LinkedInInsightCard.tsx
      RelevanceBadge.tsx
      WhyItMatters.tsx

    intelligence/
      ThemeOfWeekCard.tsx
      AIOverviewCard.tsx
      AIOverviewExpanded.tsx
      TrendingThemes.tsx

    shared/
      EditorialImage.tsx
      TopicTag.tsx
      LoadingSkeleton.tsx
      EmptyState.tsx

  pages/
    Dashboard.tsx
    Digest.tsx
    Topics.tsx
    Saved.tsx
    Settings.tsx

  data/
    mockFeed.ts
    mockProfile.ts
```

## 18. Required interactions

Implement:

- Filter by content type
- Sort feed
- Save and unsave content
- Open article detail
- Play and pause podcast
- Open Theme of the Week
- Open expanded AI Overview
- Open Personalisation Settings
- Update profile settings
- Toggle AI tuning options
- Recalculate mock relevance scores
- Collapse sidebar

Use optimistic UI for save actions.

## 19. Accessibility

Ensure:

- WCAG AA contrast
- Visible keyboard focus
- Semantic navigation
- Correct heading hierarchy
- Alt text for lighthouse images
- 44px mobile tap targets
- Reduced-motion support
- `aria-label` on icon-only controls

## 20. Build order

1. Create design tokens and typography.
2. Build responsive app shell.
3. Add sidebar and search.
4. Build personalisation bar.
5. Build feed filters.
6. Build featured article card with realistic lighthouse image.
7. Build podcast and LinkedIn cards.
8. Add Theme of the Week with realistic lighthouse image.
9. Add AI Overview and Trending Themes.
10. Build Relevance Profile drawer.
11. Add mock data and interactions.
12. Add responsive states.
13. Polish spacing, hover states, focus states and shadows.

## 21. Acceptance criteria

The build is complete when:

- It matches the approved Editorial Flow design.
- Navy and light coral are used consistently.
- The main article and Theme of the Week use realistic lighthouse/coastal photography.
- Personalisation is visible without opening settings.
- AI Overview states which sources were synthesised.
- Each feed item can display a relevance score.
- The relevance profile can be edited.
- The layout works across desktop, tablet and mobile.
- The product feels editorial, intelligent, calm and premium.
