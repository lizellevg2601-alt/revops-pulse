"use client";

import { useEffect, useState } from "react";
import { TopSearchBar } from "@/components/app-shell/TopSearchBar";
import { FeedFilters } from "@/components/feed/FeedFilters";
import { FeaturedArticleCard } from "@/components/feed/FeaturedArticleCard";
import { PodcastCard } from "@/components/feed/PodcastCard";
import { AIOverviewCard } from "@/components/intelligence/AIOverviewCard";
import { TrendingThemes } from "@/components/intelligence/TrendingThemes";
import type { FeedFiltersState, FeedItem, FeedPayload, TrendingTheme } from "@/lib/types";

function filterAndSort(items: FeedItem[], filters: FeedFiltersState): FeedItem[] {
  const filtered = items.filter(item =>
    filters.contentType === "all" || item.type === filters.contentType
  );
  switch (filters.sort) {
    case "recent":
      return filtered.sort((a,b)=>new Date(b.publishedAt).getTime()-new Date(a.publishedAt).getTime());
    case "discussed":
      return filtered.sort((a,b)=>((b.likes||0)+(b.comments||0))-((a.likes||0)+(a.comments||0)));
    case "score":
    case "relevant":
    default:
      return filtered.sort((a,b)=>b.relevanceScore-a.relevanceScore);
  }
}

export default function Dashboard() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [savedIds,setSavedIds] = useState<string[]>([]);
  const [category,setCategory] = useState("all");
  useEffect(()=>{try{const value=JSON.parse(localStorage.getItem("revops-pulse-saved-v1")||"[]");setSavedIds(Array.isArray(value)?value:[])}catch{setSavedIds([])}},[]);
  const [trends, setTrends] = useState<TrendingTheme[]>([]);
  const [fetchedAt,setFetchedAt] = useState<string | undefined>();
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
        setFetchedAt(data.fetchedAt);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    loadFeed();
  }, []);

  const filtered = filterAndSort(feed.filter(i=>category==="all" || i.category===category),filters).map(i=>({...i,saved:savedIds.includes(i.id)}));
  const featured = filters.contentType==="podcast" ? undefined : filtered.find(i=>i.type==="article");
  const rest = filtered.filter(i=>i.id!==featured?.id);

  function handleSave(id: string) {
    setSavedIds(prev=>{const next=prev.includes(id)?prev.filter(x=>x!==id):[...prev,id];try{localStorage.setItem("revops-pulse-saved-v1",JSON.stringify(next))}catch{}return next});
  }

  return (
    <div className="min-h-screen bg-[var(--page)]">
      <div>
        <TopSearchBar />

          <main className="mx-auto max-w-[1440px] flex-1 p-4 lg:px-8 lg:py-8">
            <section className="mb-8 rounded-[28px] bg-[var(--navy-950)] px-6 py-8 text-white md:px-10 md:py-10 overflow-hidden relative">
              <div className="pointer-events-none absolute -right-20 -top-36 h-80 w-80 rounded-full border-[65px] border-[var(--coral-500)] opacity-80" />
              <div className="relative max-w-2xl">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#ffb9a9]">Your GTM and RevOps news</p>
                <h1 className="font-editorial text-3xl font-semibold tracking-tight md:text-5xl md:leading-tight">Stay ahead of what matters<span className="text-[var(--coral-500)]">.</span></h1>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#e9ded8] md:text-base">Industry news, trends and practical perspectives from across RevOps, AI and GTM systems.</p>
              </div>
            </section>
            <section className="mb-8">
              <div className="mb-4 flex items-baseline justify-between gap-4"><h2 className="font-editorial text-2xl font-semibold text-[var(--navy-950)]">Explore the signals</h2><p className="text-xs text-[var(--slate-500)]">Curated from monitored publications</p></div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  {id:"crm",title:"CRM & Tech",description:"Platforms, ecosystems and enterprise software",bg:"from-[#162c3e] via-[#3f6570] to-[#e39b80]",accent:"●"},
                  {id:"ai",title:"Frontier AI",description:"Models, agents and emerging intelligence",bg:"from-[#17122a] via-[#4d376e] to-[#ef947a]",accent:"✦"},
                  {id:"revops",title:"Revenue Operations",description:"Revenue systems and execution",bg:"from-[#263b38] via-[#657d69] to-[#e9b990]",accent:"◈"},
                  {id:"gtm",title:"GTM Trends",description:"Growth strategies and market shifts",bg:"from-[#43302c] via-[#a66360] to-[#efbb83]",accent:"↗"}
                ].map(tile=><button key={tile.id} type="button" onClick={()=>setCategory(tile.id)} className={`group relative min-h-44 overflow-hidden rounded-2xl bg-gradient-to-br ${tile.bg} p-4 text-left text-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl ${category===tile.id?"ring-2 ring-[var(--coral-500)] ring-offset-2":""}`}>
                  <span aria-hidden="true" className="absolute -right-8 -top-10 text-[160px] leading-none text-white/10 transition-transform group-hover:scale-110">{tile.accent}</span>
                  <span className="relative text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80">Industry intelligence</span>
                  <div className="relative mt-9"><h3 className="font-editorial text-lg font-semibold">{tile.title}</h3><p className="mt-1 max-w-48 text-xs leading-relaxed text-white/85">{tile.description}</p><span className="mt-3 inline-block text-[10px] font-semibold">{feed.filter(i=>i.category===tile.id).length} stories in feed →</span></div>
                </button>)}
              </div>
            </section>
            <div className="flex flex-col xl:flex-row gap-7">
              {/* Main feed */}
              <div className="flex-1 min-w-0 space-y-4">
                <div className="flex items-center justify-between mb-1">
                  <h1 className="font-editorial text-xl font-bold text-[var(--navy-950)]">
                    Latest intelligence
                  </h1>

                </div>

                <div className="flex flex-wrap gap-2" aria-label="Industry categories">{[["all","All news"],["crm","CRM & Tech"],["ai","Frontier AI"],["revops","RevOps"],["gtm","GTM Trends"]].map(([value,label])=><button key={value} type="button" aria-pressed={category===value} onClick={()=>setCategory(value)} className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${category===value?"border-[var(--coral-500)] bg-[var(--coral-500)] text-white":"border-[var(--border)] bg-white text-[var(--slate-700)] hover:bg-[var(--coral-50)]"}`}>{label}</button>)}</div>
                <FeedFilters filters={filters} onChange={setFilters} />
                {fetchedAt && <p className="text-xs text-[var(--slate-500)]">Feed last generated {new Date(fetchedAt).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"})} · <span className="font-medium">{filtered.length} stories in this view</span></p>}

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

                {!loading && !error && filtered.length===0 && feed.length>0 && <p className="rounded-xl bg-white p-8 text-center text-sm text-[var(--slate-500)]">No stories match these filters yet. Try All news or another category.</p>}
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
                <AIOverviewCard items={feed} fetchedAt={fetchedAt} />
                <TrendingThemes trends={trends} />
              </aside>
            </div>
          </main>
        </div>
    </div>
  );
}
