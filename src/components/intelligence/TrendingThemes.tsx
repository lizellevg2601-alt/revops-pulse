"use client";

import {
  TrendingUp,
  TrendingDown,
  Minus,
  Newspaper,
  Headphones,
} from "lucide-react";
import type { TrendingTheme } from "@/lib/types";

type Props = {
  trends: TrendingTheme[];
};

function DirectionIcon({ direction }: { direction: TrendingTheme["direction"] }) {
  if (direction === "up") return <TrendingUp className="w-3 h-3 text-green-600" />;
  if (direction === "down") return <TrendingDown className="w-3 h-3 text-red-500" />;
  return <Minus className="w-3 h-3 text-[var(--slate-500)]" />;
}

export function TrendingThemes({ trends }: Props) {
  if (!trends.length) return null;

  const maxCount = Math.max(...trends.map((t) => t.count), 1);

  return (
    <div className="bg-white border border-[var(--border)] rounded-xl p-4">
      <h3 className="font-semibold text-sm text-[var(--navy-950)]">
        Trending Themes
      </h3>
      <p className="text-xs text-[var(--slate-500)] mb-3">
        What the RevOps community is talking about right now
      </p>
      <div className="space-y-3">
        {trends.map((theme) => (
          <div
            key={theme.topic}
            className="rounded-lg border border-[var(--blue-grey-200)] bg-[var(--blue-grey-100)]/50 p-3 group cursor-pointer hover:border-[var(--coral-200)] hover:bg-[var(--coral-50)] transition-colors"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold text-[var(--slate-500)] w-4">
                {theme.rank}
              </span>
              <span className="text-sm font-semibold text-[var(--navy-950)] flex-1 group-hover:text-[var(--coral-500)] transition-colors">
                {theme.topic}
              </span>
              <span className={`text-xs font-medium ${
                theme.direction === "up"
                  ? "text-green-600"
                  : theme.direction === "down"
                  ? "text-red-500"
                  : "text-[var(--slate-500)]"
              }`}>
                {theme.change > 0 ? "+" : ""}
                {theme.change}%
              </span>
              <DirectionIcon direction={theme.direction} />
            </div>

            <div className="flex items-center gap-3 text-[11px] text-[var(--slate-500)] mb-2">
              <span className="inline-flex items-center gap-1">
                <Newspaper className="w-3 h-3" />
                {theme.articles} articles
              </span>
              <span className="inline-flex items-center gap-1">
                <Headphones className="w-3 h-3" />
                {theme.podcasts} podcasts
              </span>
              <span className="ml-auto font-medium">{theme.count} items/mo</span>
            </div>

            <div className="h-1 rounded-full bg-[var(--blue-grey-200)] overflow-hidden mb-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--navy-800)] to-[var(--coral-500)]"
                style={{ width: `${Math.max(8, (theme.count / maxCount) * 100)}%` }}
              />
            </div>

            {theme.topItem && (
              <p className="text-xs text-[var(--slate-700)] leading-snug line-clamp-1">
                “{theme.topItem}”
              </p>
            )}
            {theme.secondItem && (
              <p className="text-[11px] text-[var(--slate-500)] leading-snug line-clamp-1 mt-0.5">
                {theme.secondItem}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}