"use client";

import { useEffect, useState } from "react";
import { mockProfile } from "@/data/mockProfile";
import { PROFILE_KEY, loadProfile, personalisedScore, isBlocked } from "@/lib/personalisation";
import type { RelevanceProfile } from "@/lib/types";
import { TopSearchBar } from "@/components/app-shell/TopSearchBar";
import { PersonalisationBar } from "@/components/personalisation/PersonalisationBar";
import { RelevanceProfileDrawer } from "@/components/personalisation/RelevanceProfileDrawer";
import { FeedFilters } from "@/components/feed/FeedFilters";
import { FeaturedArticleCard } from "@/components/feed/FeaturedArticleCard";
import { PodcastCard } from "@/components/feed/PodcastCard";
import { ThemeOfWeekCard } from "@/components/intelligence/ThemeOfWeekCard";
import { AIOverviewCard } from "@/components/intelligence/AIOverviewCard";
import { TrendingThemes } from "@/components/intelligence/TrendingThemes";
import type { FeedFiltersState, FeedItem, FeedPayload, TrendingTheme } from "@/lib/types";

function filterAndSort(
  items: FeedItem[],
  filters: FeedFiltersState,
  profile: RelevanceProfile
): FeedItem[] {
  const filtered = items.filter(i => (filters.contentType === "all" || i.type === filters.contentType) && !isBlocked(i,profile));

  switch (filters.sort) {
    case "recent":
      filtered.sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() -
          new Date(a.publishedAt).getTime()
      );
      break;
    case "score":
      filtered.sort((a, b) => personalisedScore(b,profile) - personalisedScore(a,profile));
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
      filtered.sort((a,b)=>personalisedScore(b,profile)-personalisedScore(a,profile));
      break;
  }

  return filtered;
}

export default function Dashboard() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [profile,setProfile] = useState<RelevanceProfile>(mockProfile);
  const [settingsOpen,setSettingsOpen] = useState(false);
  const [savedIds,setSavedIds] = useState<string[]>([]);
  useEffect(()=>{setProfile(loadProfile());try{setSavedIds(JSON.parse(localStorage.getItem("revops-pulse-saved-v1")||"[]"))}catch{setSavedIds([])}},[]);
  function saveProfile(next:RelevanceProfile){setProfile(next);try{localStorage.setItem(PROFILE_KEY,JSON.stringify(next))}catch{}setSettingsOpen(false)}
  const [trends, setTrends] = useState<TrendingTheme[]>([]);
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
        const data: FeedPayload = await res.json();
        setFeed(data.items);
        setTrends(data.trends || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    loadFeed();
  }, []);

  const filtered = filterAndSort(feed,filters,profile).map(i=>({...i,saved:savedIds.includes(i.id)}));
  const featured = filters.contentType==="podcast" ? undefined : filtered.find(i=>i.type==="article");
  const rest = filtered.filter(i=>i.id!==featured?.id);

  function handleSave(id: string) {
    setSavedIds(prev=>{const next=prev.includes(id)?prev.filter(x=>x!==id):[...prev,id];try{localStorage.setItem("revops-pulse-saved-v1",JSON.stringify(next))}catch{}return next});
  }

  return (
    <div className="min-h-screen bg-[var(--page)]">
      <div>
        <TopSearchBar />
          <PersonalisationBar profile={profile} onEdit={()=>setSettingsOpen(true)}/>

          <main className="mx-auto max-w-[1440px] flex-1 p-4 lg:px-8 lg:py-8">
            <section className="mb-8 rounded-[28px] bg-[var(--navy-950)] px-6 py-8 text-white md:px-10 md:py-10 overflow-hidden relative">
              <div className="pointer-events-none absolute -right-20 -top-36 h-80 w-80 rounded-full border-[65px] border-[var(--coral-500)] opacity-80" />
              <div className="relative max-w-2xl">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#ffb9a9]">Your industry intelligence, made relevant</p>
                <h1 className="font-editorial text-3xl font-semibold tracking-tight md:text-5xl md:leading-tight">Stay ahead of what matters<span className="text-[var(--coral-500)]">.</span></h1>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#e9ded8] md:text-base">The latest in RevOps, AI and GTM systems — curated to help you turn industry change into practical decisions.</p>
              </div>
            </section>
            <div className="flex flex-col xl:flex-row gap-7">
              {/* Main feed */}
              <div className="flex-1 min-w-0 space-y-4">
                <div className="flex items-center justify-between mb-1">
                  <h1 className="font-editorial text-xl font-bold text-[var(--navy-950)]">
                    Latest intelligence
                  </h1>
                  <RelevanceProfileDrawer profile={profile} open={settingsOpen} onOpen={()=>setSettingsOpen(true)} onClose={()=>setSettingsOpen(false)} onSave={saveProfile} />
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

                {!loading && !error && filtered.length===0 && feed.length>0 && <p className="rounded-xl bg-white p-8 text-center text-sm text-[var(--slate-500)]">No stories match your preferences. Try broadening your interests or removing blocked topics.</p>}
                {!loading && featured && (
                  <FeaturedArticleCard item={featured} onSave={handleSave} />
                )}

                {!loading && (
                  <div className="space-y-3">
                    {rest.map((item) =>
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
              <aside className="xl:w-[320px] shrink-0 space-y-4">
                <ThemeOfWeekCard />
                <AIOverviewCard />
                <TrendingThemes trends={trends} />
              </aside>
            </div>
          </main>
        </div>
    </div>
  );
}
