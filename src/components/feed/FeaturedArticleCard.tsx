"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Bookmark, Clock, Sparkles, ChevronDown, ExternalLink } from "lucide-react";
import { TopicTag } from "../shared/TopicTag";
import { placeholderArt } from "@/lib/placeholder";
import type { FeedItem } from "@/lib/types";

type Props = {
  item: FeedItem;
  onSave: (id: string) => void;
};

export function FeaturedArticleCard({ item, onSave }: Props) {
  const [expanded,setExpanded] = useState(false);
  const publishedRecently = Date.now()-Date.parse(item.publishedAt) < 2*86400000 && Date.now()>=Date.parse(item.publishedAt);
  const publishedDate = Number.isFinite(Date.parse(item.publishedAt)) ? new Date(item.publishedAt).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}) : "";
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex flex-col md:flex-row">
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="md:w-1/2 h-56 md:h-auto relative block"
        >
          <img
            src={item.imageUrl || placeholderArt(item.title)}
            alt="Abstract editorial illustration"
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </a>
        <div className="p-5 md:p-6 md:w-1/2 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-xs text-[var(--slate-500)] mb-2">
            <span className="bg-[var(--coral-500)] text-white px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider">
              {item.category==="ai"?"Frontier AI":item.category==="crm"?"CRM & Tech":item.category==="gtm"?"GTM Trends":"RevOps"}
            </span>
            {publishedRecently && <span className="text-[10px] font-semibold text-[var(--coral-500)]">NEW</span>}
            <Clock className="w-3 h-3" />
            <span>{publishedDate}</span>
            {item.readTime ? <span>· {item.readTime} min read</span> : null}
            <button
              onClick={() => onSave(item.id)}
              className="ml-auto w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--coral-50)] transition-colors"
              aria-label={item.saved ? "Unsave" : "Save"}
            >
              <Bookmark
                className={`w-4 h-4 ${
                  item.saved
                    ? "fill-[var(--coral-500)] text-[var(--coral-500)]"
                    : "text-[var(--slate-500)]"
                }`}
              />
            </button>
          </div>

          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-editorial text-xl md:text-2xl font-semibold text-[var(--navy-950)] leading-tight mb-2 hover:text-[var(--coral-500)] transition-colors block"
          >
            {item.title}
          </a>

          <p className="text-sm text-[var(--slate-700)] leading-relaxed mb-3 line-clamp-3">
            {item.summary}
          </p>

          {item.analysis ? <section className="rounded-xl border border-[var(--coral-200)] bg-[var(--coral-50)] p-4">
  <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--coral-500)]"><Sparkles className="h-4 w-4"/> RevOps Pulse perspective</span><span className="text-[10px] text-[var(--slate-500)]">RSS-based · Low confidence</span></div>
  <p className="mt-3 text-sm text-[var(--slate-700)]"><strong>Why it matters:</strong> {item.analysis.whyItMatters}</p>
  <p className="mt-2 text-sm text-[var(--slate-700)]"><strong>What to consider:</strong> {item.analysis.recommendedAction}</p>
  <button type="button" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)} className="mt-3 flex items-center gap-1 text-xs font-semibold text-[var(--coral-500)]">{expanded?"Less analysis":"Explore intelligence"}<ChevronDown className={`h-4 w-4 transition-transform ${expanded?"rotate-180":""}`}/></button>
  {expanded && <div className="mt-3 space-y-3 border-t border-[var(--coral-200)] pt-3 text-xs leading-relaxed text-[var(--slate-700)]">
    <p><strong>What changed:</strong> {item.analysis.whatChanged}</p>
    <p><strong>Strategic implication:</strong> {item.analysis.strategicImplication}</p>
    <p><strong>What to watch:</strong> {item.analysis.whatToWatch}</p>
    <p><strong>Evidence:</strong> {item.analysis.evidenceType==="rss_metadata"?"Publisher RSS metadata only; verify specifics with the source.":"Source-supported review"}</p>
    {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-[var(--coral-500)]">Read original source<ExternalLink className="h-3 w-3"/></a>}
  </div>}
</section> : <WhyItMatters items={item.whyItMatters} intelligence={item.intelligence} />}

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2 text-xs text-[var(--slate-500)]">
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--coral-500)] underline underline-offset-2 decoration-[var(--slate-300)] hover:decoration-[var(--coral-400)] transition-colors"
              >
                {item.source}
              </a>
              <span>·</span>
              <span>{item.author}</span>
            </div>

          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {item.tags.map((tag) => (
              <TopicTag key={tag} label={tag} />
            ))}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function WhyItMatters({ items, intelligence }: { items: string[]; intelligence?: FeedItem["intelligence"] }) {
  return (
    <div className="bg-[var(--coral-50)] rounded-lg p-3 border border-[var(--coral-200)]">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Sparkles className="w-3 h-3 text-[var(--coral-500)]" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--coral-500)]">
          Business intelligence
        </span>
      </div>
      {intelligence && <p className="mb-2 text-xs font-medium text-[var(--slate-700)]">{intelligence.signal}</p>}
      {intelligence ? <div className="space-y-2 text-xs text-[var(--slate-700)]"><p><strong>Why it matters:</strong> {intelligence.impact}</p><p><strong>What to consider:</strong> {intelligence.action}</p></div> : <ul className="space-y-0.5">
        {items.map((point, i) => (
          <li
            key={i}
            className="text-xs text-[var(--slate-700)] flex items-start gap-1.5"
          >
            <span className="text-[var(--coral-300)] mt-0.5">•</span>
            {point}
          </li>
        ))}
      </ul>}
      <p className="mt-2 text-[10px] text-[var(--slate-500)]">Editorial perspective based on feed metadata. Verify details with the original publisher.</p>
    </div>
  );
}

function RelevanceBadge({ score }: { score: number }) {
  const color =
    score >= 90
      ? "text-green-600 bg-green-50 border-green-200"
      : score >= 80
      ? "text-[var(--coral-500)] bg-[var(--coral-50)] border-[var(--coral-200)]"
      : "text-[var(--slate-500)] bg-[var(--blue-grey-100)] border-[var(--blue-grey-300)]";

  return (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${color}`}
    >
      AI relevance: {score}% match
    </span>
  );
}
