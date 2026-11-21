"use client";

import { useState } from "react";
import { ArrowDown, ArrowUpRight, Bookmark } from "lucide-react";
import { TopSearchBar } from "@/components/app-shell/TopSearchBar";
import { ApprovedIntelligence } from "@/components/intelligence/ApprovedIntelligence";
import { TrendingThemes } from "@/components/intelligence/TrendingThemes";
import { categories, filterFeed, formatDate, type Category } from "@/lib/feed";
import { useSavedStories } from "@/lib/use-saved-stories";
import type { ApprovedArticle, FeedFiltersState, FeedPayload } from "@/lib/types";
import { FeedFilters } from "./FeedFilters";
import { FeaturedArticleCard } from "./FeaturedArticleCard";
import { StoryCard } from "./StoryCard";

const pageSize = 12;

export function FeedDashboard({ initialFeed, approvedArticles }: { initialFeed: FeedPayload; approvedArticles: ApprovedArticle[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [savedOnly, setSavedOnly] = useState(false);
  const [limit, setLimit] = useState(pageSize);
  const [filters, setFilters] = useState<FeedFiltersState>({ contentType: "all", sort: "recent" });
  const { savedIds, toggleSave } = useSavedStories();
  const filtered = filterFeed(initialFeed.items, { query, category, filters, savedOnly, savedIds });
  const visible = filtered.slice(0, limit);
  const showBrief = initialFeed.items.length > 0 && !savedOnly && !query.trim() && category === "all" && filters.contentType === "all" && filters.sort === "recent";
  const brief = showBrief ? visible.slice(0, 3) : [];
  const rest = showBrief ? visible.slice(3) : visible;
  // The count remains meaningful even if a saved story drops out of the current feed.
  const savedCount = Math.max(savedIds.length, initialFeed.items.filter(item => savedIds.includes(item.id)).length);
  const failedSources = initialFeed.sources?.filter(source => source.status === "failed") || [];

  function reset() {
    setQuery(""); setCategory("all"); setSavedOnly(false); setLimit(pageSize);
    setFilters({ contentType: "all", sort: "recent" });
  }

  return <div className="min-h-screen bg-[var(--page)]">
    <a href="#main-content" className="sr-only z-50 rounded bg-white p-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
    <TopSearchBar query={query} onQueryChange={value => { setQuery(value); setLimit(pageSize); }}
      savedOnly={savedOnly} savedCount={savedCount} onSavedChange={() => { setSavedOnly(!savedOnly); setLimit(pageSize); }} onHome={reset} />
    <main id="main-content" className="mx-auto max-w-[1440px] px-4 py-7 lg:px-8 lg:py-9">
      <section className="mb-7 flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-7 md:flex-row md:items-end">
        <div className="max-w-2xl">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--coral-600)]">The revenue operator&apos;s reading list</p>
          <h1 className="font-editorial text-3xl font-semibold tracking-tight md:text-4xl">The signals shaping your revenue stack<span className="text-[var(--coral-500)]">.</span></h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--slate-500)]">CRM, AI, and go-to-market developments in one place. Source updates, clearly labelled context, and a practical lens for revenue teams.</p>
        </div>
        <a href="/about/" className="inline-flex min-h-11 shrink-0 items-center gap-1 text-xs font-semibold underline underline-offset-4">How this feed works <ArrowUpRight aria-hidden="true" className="h-3 w-3" /></a>
      </section>

      <nav aria-label="Industry categories" className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {categories.map(entry => <button key={entry.id} type="button" aria-pressed={category === entry.id}
          onClick={() => { setCategory(entry.id); setLimit(pageSize); }}
          className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-semibold ${category === entry.id ? "border-[var(--navy-950)] bg-[var(--navy-950)] text-white" : "bg-white hover:border-[var(--coral-500)]"}`}>
          {entry.label}<span className={category === entry.id ? "text-white/70" : "text-[var(--slate-500)]"}>{entry.id === "all" ? initialFeed.items.length : initialFeed.items.filter(item => item.category === entry.id).length}</span>
        </button>)}
      </nav>

      {!savedOnly && !query.trim() && <ApprovedIntelligence category={category} articles={approvedArticles} />}

      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section id="story-results" aria-labelledby="results-title" className="min-w-0">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="results-title" className="font-editorial text-xl font-semibold">{savedOnly ? "Saved stories" : query.trim() ? "Search results" : showBrief ? "The source briefing" : "Source updates"}</h2>
              <p role="status" className="mt-1 text-xs text-[var(--slate-500)]">{filtered.length} {filtered.length === 1 ? "story" : "stories"}{query.trim() ? ` matching “${query.trim()}”` : " in this view"}</p>
            </div>
            {initialFeed.fetchedAt && <p className="text-[11px] text-[var(--slate-500)]">Feed refreshed <time dateTime={initialFeed.fetchedAt}>{formatDate(initialFeed.fetchedAt, true)}</time></p>}
          </div>
          <FeedFilters filters={filters} onChange={value => { setFilters(value); setLimit(pageSize); }} />
          {filters.sort === "score" && <p className="mt-2 text-xs text-[var(--slate-500)]">Topic match uses keywords and publisher dates. It is not personalised or a quality rating.</p>}
          {savedOnly && <p className="mt-3 text-xs text-[var(--slate-500)]">Saved in this browser, without an account. Only stories still in the current feed appear here.</p>}

          <div className="mt-5 space-y-4">
            {filtered.length === 0 && <div className="rounded-2xl border border-dashed bg-white px-6 py-12 text-center">
              {savedOnly && <Bookmark aria-hidden="true" className="mx-auto mb-3 h-6 w-6 text-[var(--coral-600)]" />}
              <h3 className="font-semibold">{savedOnly && savedIds.length === 0 ? "Your reading list starts here" : "No stories match this view"}</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--slate-500)]">{initialFeed.items.length === 0 ? "Source updates are temporarily unavailable. Please check back after the next feed refresh." : savedOnly && savedIds.length === 0 ? "Save a story using its bookmark button, then return here to read it later." : savedOnly ? "Saved stories whose publishers are no longer in the current feed are hidden. Browse all news or clear saved mode." : "Try another topic, clear your search, or browse all source updates."}</p>
              <button type="button" onClick={reset} className="mt-5 min-h-11 rounded-full bg-[var(--navy-950)] px-5 text-xs font-semibold text-white">Browse all news</button>
            </div>}
            {brief.length > 0 && <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
              <FeaturedArticleCard item={brief[0]} onSave={toggleSave} />
              {brief.length > 1 && <div className="space-y-4">{brief.slice(1).map(item => <StoryCard key={item.id} item={item} onSave={toggleSave} />)}</div>}
            </div>}
            {showBrief && rest.length > 0 && <h2 className="pt-4 font-editorial text-lg font-semibold">More source updates</h2>}
            {rest.map(item => <StoryCard key={item.id} item={item} onSave={toggleSave} />)}
            {filtered.length > visible.length && <button type="button" onClick={() => setLimit(value => value + pageSize)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border bg-white text-sm font-semibold hover:bg-[var(--coral-50)]">Load more stories <ArrowDown aria-hidden="true" className="h-4 w-4" /></button>}
            {visible.length > 0 && <p className="text-center text-xs text-[var(--slate-500)]">Showing {visible.length} of {filtered.length} stories</p>}
          </div>
        </section>

        <aside aria-label="About this feed" className="space-y-5">
          <TrendingThemes trends={initialFeed.trends} />
          <section className="rounded-2xl border bg-white p-5">
            <h2 className="text-sm font-semibold">Know what you&apos;re reading</h2>
            <dl className="mt-4 space-y-4 text-xs leading-relaxed">
              <div><dt className="font-semibold">Source update</dt><dd className="mt-1 text-[var(--slate-500)]">A publisher&apos;s headline, attribution, date, and link, plus a short RSS excerpt of up to 180 characters. Not independently verified by RevOps Pulse.</dd></div>
              <div><dt className="font-semibold">Podcast entries</dt><dd className="mt-1 text-[var(--slate-500)]">Title, publisher, date, duration, and a link only. We do not republish episode descriptions.</dd></div>
              <div><dt className="font-semibold">Automated context</dt><dd className="mt-1 text-[var(--slate-500)]">Optional keyword-based prompts, not a reviewed assessment of the article.</dd></div>
              <div><dt className="font-semibold">Editor-reviewed briefing</dt><dd className="mt-1 text-[var(--slate-500)]">A separate perspective with a named reviewer, review date, and linked sources.{approvedArticles.length === 0 ? " No reviewed briefings have been published yet." : ""}</dd></div>
            </dl>
            <a href="/about/" className="mt-4 inline-flex min-h-11 items-center text-xs font-semibold text-[var(--coral-600)] underline underline-offset-4">Read our methodology</a>
          </section>
          {failedSources.length > 0 && <details className="rounded-2xl border p-5 text-xs leading-relaxed text-[var(--slate-500)]">
            <summary className="cursor-pointer font-semibold text-[var(--navy-950)]">Feed coverage: {failedSources.length} sources unavailable</summary>
            <p className="mt-3">Some publishers could not be refreshed. Previously collected stories may be retained with their original publication dates.</p>
            <ul className="mt-2 list-inside list-disc">{failedSources.map((source, index) => <li key={source.id || `${source.source}-${index}`}>{source.source}</li>)}</ul>
            {initialFeed.attemptedAt && <p className="mt-2">Last attempt: {formatDate(initialFeed.attemptedAt, true)}</p>}
          </details>}
        </aside>
      </div>
    </main>
    <footer className="mx-auto mt-8 flex max-w-[1440px] flex-wrap justify-between gap-3 border-t px-4 py-6 text-xs text-[var(--slate-500)] lg:px-8">
      <p>RevOps Pulse · A GTM Automation Academy publication</p><a href="/about/" className="underline underline-offset-4">Sources & editorial approach</a>
    </footer>
  </div>;
}
