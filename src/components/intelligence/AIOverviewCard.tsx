"use client";

import { Sparkles, ExternalLink } from "lucide-react";
import type { FeedItem } from "@/lib/types";

export function AIOverviewCard({ items, fetchedAt }: { items: FeedItem[]; fetchedAt?: string }) {
  const aiItems = items.filter(item => item.category === "ai").sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,4);
  const date = fetchedAt && Number.isFinite(Date.parse(fetchedAt)) ? new Date(fetchedAt).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"}) : null;
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[var(--coral-500)]"/>
        <h3 className="font-semibold text-sm text-[var(--navy-950)]">Frontier AI signals</h3>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-[var(--slate-500)]">Latest AI stories found in our monitored feeds, linked to their original sources.</p>
      {aiItems.length ? <div className="space-y-3">{aiItems.map(item=><a key={item.id} href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-[var(--border)] p-3 hover:border-[var(--coral-500)]">
        <span className="text-[10px] uppercase tracking-wide text-[var(--coral-500)]">{item.source}</span>
        <span className="mt-1 flex items-start gap-1 text-xs font-semibold leading-relaxed text-[var(--navy-950)]">{item.title}<ExternalLink className="mt-0.5 h-3 w-3 shrink-0"/></span>
      </a>)}</div>:<p className="text-xs text-[var(--slate-500)]">No AI stories available in the current feed.</p>}
      {date && <p className="mt-4 border-t pt-3 text-[10px] text-[var(--slate-500)]">Feed generated: {date}</p>}
    </section>
  );
}
