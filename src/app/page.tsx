"use client";

import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-shell/AppSidebar";
import { TopSearchBar } from "@/components/app-shell/TopSearchBar";
import { MobileNav } from "@/components/app-shell/MobileNav";
import { PersonalisationBar } from "@/components/personalisation/PersonalisationBar";
import { RelevanceProfileDrawer } from "@/components/personalisation/RelevanceProfileDrawer";
import { FeedFilters } from "@/components/feed/FeedFilters";
import { FeaturedArticleCard } from "@/components/feed/FeaturedArticleCard";
import { PodcastCard } from "@/components/feed/PodcastCard";
import { ThemeOfWeekCard } from "@/components/intelligence/ThemeOfWeekCard";
import { AIOverviewCard } from "@/components/intelligence/AIOverviewCard";
import { TrendingThemes } from "@/components/intelligence/TrendingThemes";
import type { FeedFiltersState, FeedItem } from "@/lib/types";

function filterAndSort(
  items: FeedItem[],
  filters: FeedFiltersState
): FeedItem[] {
  let filtered =
    filters.contentType === "all"
      ? items
      : items.filter((i) => i.type === filters.contentType);

  switch (filters.sort) {
    case "recent":
      filtered.sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() -
          new Date(a.publishedAt).getTime()
      );
      break;
    case "score":
      filtered.sort((a, b) => b.relevanceScore - a.relevanceScore);
      break;
    case "discussed":
      filtered.sort(
        (a, b) =>
          ((b.likes || 0) + (b.comments || 0)) -
          ((a.likes || 0) + (a.comments || 0))
      );
      break;
    case "relevant":
    default:
      break;
  }

  return filtered;
}

export default function Dashboard() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FeedFiltersState>({
    contentType: "all",
    sort: "relevant",
  });

  useEffect(() => {
    async function loadFeed() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/feed-data.json");
        if (!res.ok) throw new Error("Failed to load feed");
        const data = await res.json();
        setFeed(data.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    loadFeed();
  }, []);

  const featured = feed.find((i) => i.type === "article") || feed[0];
  const rest = feed.filter((i) => i.id !== featured?.id);
  const filtered = filterAndSort(rest, filters);

  function handleSave(id: string) {
    setFeed((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, saved: !item.saved } : item
      )
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page)]">
      <div className="flex">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
          <TopSearchBar />
          <PersonalisationBar />

          <main className="flex-1 p-4 lg:p-6">
            <div className="flex flex-col xl:flex-row gap-6">
              {/* Main feed */}
              <div className="flex-1 min-w-0 space-y-4">
                <div className="flex items-center justify-between mb-1">
                  <h1 className="font-editorial text-xl font-bold text-[var(--navy-950)]">
                    Your Feed
                  </h1>
                  <RelevanceProfileDrawer />
                </div>

                <FeedFilters filters={filters} onChange={setFilters} />

                {loading && (
                  <div className="text-center py-12 text-[var(--slate-500)]">
                    Loading feed...
                  </div>
                )}

                {error && (
                  <div className="text-center py-12 text-red-500">
                    {error}
                  </div>
                )}

                {!loading && !error && feed.length === 0 && (
                  <div className="text-center py-12 text-[var(--slate-500)]">
                    No feed items found.
                  </div>
                )}

                {!loading && featured && (
                  <FeaturedArticleCard item={featured} onSave={handleSave} />
                )}

                {!loading && (
                  <div className="space-y-3">
                    {filtered.map((item) =>
                      item.type === "podcast" ? (
                        <PodcastCard
                          key={item.id}
                          item={item}
                          onSave={handleSave}
                        />
                      ) : (
                        <FeaturedArticleCard
                          key={item.id}
                          item={item}
                          onSave={handleSave}
                        />
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Intelligence rail */}
              <aside className="xl:w-[300px] shrink-0 space-y-4">
                <ThemeOfWeekCard />
                <AIOverviewCard />
                <TrendingThemes />
              </aside>
            </div>
          </main>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
