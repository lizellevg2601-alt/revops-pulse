"use client";

import { motion } from "framer-motion";
import {
  Play,
  RotateCcw,
  Forward,
  Bookmark,
  MoreHorizontal,
} from "lucide-react";
import { TopicTag } from "../shared/TopicTag";
import type { FeedItem } from "@/lib/types";

type Props = {
  item: FeedItem;
  onSave: (id: string) => void;
};

export function PodcastCard({ item, onSave }: Props) {
  const hours = Math.floor((item.duration || 0) / 60);
  const mins = (item.duration || 0) % 60;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4"
    >
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--navy-800)] to-[var(--navy-950)] flex items-center justify-center shrink-0 shadow-sm">
          <HeadphonesIcon />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-[var(--slate-500)] mb-1">
            <span className="text-[11px] font-semibold text-[var(--navy-700)] uppercase tracking-wider">
              Podcast
            </span>
            <span>·</span>
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--coral-500)] underline underline-offset-2 decoration-[var(--slate-300)] hover:decoration-[var(--coral-400)] transition-colors"
            >
              {item.source}
            </a>
            <span>·</span>
            <span>
              {hours > 0 ? `${hours}h ` : ""}
              {mins}min
            </span>
            <button
              onClick={() => onSave(item.id)}
              className="ml-auto w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--coral-50)]"
              aria-label={item.saved ? "Unsave" : "Save"}
            >
              <Bookmark
                className={`w-3.5 h-3.5 ${
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
            className="font-medium text-sm text-[var(--navy-950)] leading-snug mb-1 hover:text-[var(--coral-500)] transition-colors block"
          >
            {item.title}
          </a>

          <p className="text-xs text-[var(--slate-700)] line-clamp-2 mb-2">
            {item.summary}
          </p>

          <div className="flex items-center gap-1 mb-2">
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--navy-900)] text-white hover:bg-[var(--navy-800)] transition-colors"
              aria-label="Play episode"
            >
              <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
            </a>
            <button
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--coral-50)] text-[var(--slate-500)]"
              aria-label="Rewind 15 seconds"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
            <button
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--coral-50)] text-[var(--slate-500)]"
              aria-label="Forward 30 seconds"
            >
              <Forward className="w-3 h-3" />
            </button>
            <button
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--coral-50)] text-[var(--slate-500)]"
              aria-label="More options"
            >
              <MoreHorizontal className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {item.tags.slice(0, 3).map((tag) => (
                <TopicTag key={tag} label={tag} />
              ))}
            </div>
            <span className="text-[10px] font-semibold text-[var(--coral-500)] bg-[var(--coral-50)] px-2 py-0.5 rounded-full border border-[var(--coral-200)]">
              AI relevance: {item.relevanceScore}%
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function HeadphonesIcon() {
  return (
    <svg
      className="w-6 h-6 text-white"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 12a9 9 0 0118 0v4.5a2.25 2.25 0 01-2.25 2.25h-1.5a2.25 2.25 0 01-2.25-2.25V15a2.25 2.25 0 012.25-2.25h1.5A2.25 2.25 0 0118 15v2.25M3 15a2.25 2.25 0 012.25-2.25h1.5A2.25 2.25 0 019 15v1.5a2.25 2.25 0 01-2.25 2.25h-1.5A2.25 2.25 0 013 16.5V15z"
      />
    </svg>
  );
}
