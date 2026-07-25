"use client";

import { motion } from "framer-motion";
import { Bookmark, Clock, Sparkles } from "lucide-react";
import { TopicTag } from "../shared/TopicTag";
import type { FeedItem } from "@/lib/types";

type Props = {
  item: FeedItem;
  onSave: (id: string) => void;
};

export function FeaturedArticleCard({ item, onSave }: Props) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden"
    >
      <div className="flex flex-col md:flex-row">
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="md:w-1/2 h-56 md:h-auto relative block"
        >
          <img
            src={item.imageUrl}
            alt="Editorial feature"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </a>
        <div className="p-5 md:p-6 md:w-1/2 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-xs text-[var(--slate-500)] mb-2">
            <span className="bg-[var(--navy-900)] text-white px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider">
              Article
            </span>
            <Clock className="w-3 h-3" />
            <span>{item.readTime} min read</span>
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
            className="font-editorial text-xl md:text-2xl font-bold text-[var(--navy-950)] leading-tight mb-2 hover:text-[var(--coral-500)] transition-colors block"
          >
            {item.title}
          </a>

          <p className="text-sm text-[var(--slate-700)] leading-relaxed mb-3">
            {item.summary}
          </p>

          <WhyItMatters items={item.whyItMatters} />

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
            <RelevanceBadge score={item.relevanceScore} />
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

function WhyItMatters({ items }: { items: string[] }) {
  return (
    <div className="bg-[var(--coral-50)] rounded-lg p-3 border border-[var(--coral-200)]">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Sparkles className="w-3 h-3 text-[var(--coral-500)]" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--coral-500)]">
          Why this matters to you
        </span>
      </div>
      <ul className="space-y-0.5">
        {items.map((point, i) => (
          <li
            key={i}
            className="text-xs text-[var(--slate-700)] flex items-start gap-1.5"
          >
            <span className="text-[var(--coral-300)] mt-0.5">•</span>
            {point}
          </li>
        ))}
      </ul>
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
