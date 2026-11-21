import { ExternalLink, Headphones } from "lucide-react";
import { categoryLabel, formatDate, sourceUrl } from "@/lib/feed";
import type { FeedItem } from "@/lib/types";
import { SaveStoryButton } from "./SaveStoryButton";
import { StoryContext } from "./StoryContext";

export function StoryCard({ item, onSave, featured = false }: { item: FeedItem; onSave: (id: string) => void; featured?: boolean }) {
  const url = sourceUrl(item.sourceUrl);
  const titleClass = `font-editorial font-semibold leading-snug ${featured ? "text-2xl md:text-3xl" : "text-base md:text-lg"}`;
  return <article className={`min-w-0 rounded-2xl border border-[var(--border)] ${featured ? "relative overflow-hidden bg-[var(--navy-950)] p-6 text-white md:p-8" : "bg-white p-5"}`}>
    {featured && <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border-[40px] border-white/5" />}
    <div className="relative">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className={`flex flex-wrap items-center gap-2 text-[11px] ${featured ? "text-[#ffcfbf]" : "text-[var(--slate-500)]"}`}>
          <span className="font-semibold uppercase tracking-wide">{categoryLabel(item.category)}</span><span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">{item.type === "podcast" && <Headphones aria-hidden="true" className="h-3 w-3" />}{item.type === "podcast" ? "Podcast" : "Source update"}</span>
        </div>
        <SaveStoryButton item={item} onSave={onSave} inverted={featured} />
      </div>
      <h3 className={titleClass}>{url ? <a href={url} target="_blank" rel="noopener noreferrer" className={featured ? "hover:underline" : "hover:text-[var(--coral-600)]"}>{item.title}<span className="sr-only"> (opens publisher in a new tab)</span></a> : item.title}</h3>
      <div className={`mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ${featured ? "text-white/75" : "text-[var(--slate-500)]"}`}>
        <span className="font-medium">{item.source}</span><span aria-hidden="true">·</span><time dateTime={item.publishedAt}>{formatDate(item.publishedAt)}</time>
        {item.type === "podcast" && !!item.duration && <span>· {item.duration} min</span>}
      </div>
      <p className={`mt-3 line-clamp-3 text-sm leading-relaxed ${featured ? "text-white/85" : "text-[var(--slate-700)]"}`}>{item.summary || "Open the original source for the full story."}</p>
      {url && <a href={url} target="_blank" rel="noopener noreferrer" className={`mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-semibold ${featured ? "text-[#ffcfbf] hover:text-white" : "text-[var(--coral-600)] hover:underline"}`}>
        {item.type === "podcast" ? "Listen at publisher" : "Read original source"}<ExternalLink aria-hidden="true" className="h-3 w-3" />
      </a>}
      <StoryContext item={item} inverted={featured} />
    </div>
  </article>;
}
