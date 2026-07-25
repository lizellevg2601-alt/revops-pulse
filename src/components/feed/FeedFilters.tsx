"use client";

import { FeedFiltersState, ContentType } from "@/lib/types";

type Props = {
  filters: FeedFiltersState;
  onChange: (f: FeedFiltersState) => void;
};

const types: { label: string; value: ContentType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Articles", value: "article" },
  { label: "Podcasts", value: "podcast" },
];

const sortOptions: { label: string; value: FeedFiltersState["sort"] }[] = [
  { label: "Most relevant", value: "relevant" },
  { label: "Most recent", value: "recent" },
  { label: "Most discussed", value: "discussed" },
  { label: "Highest score", value: "score" },
];

export function FeedFilters({ filters, onChange }: Props) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-1 overflow-x-auto">
        {types.map((t) => (
          <button
            key={t.value}
            onClick={() => onChange({ ...filters, contentType: t.value })}
            className={`text-sm px-3 py-1.5 rounded-full transition-colors whitespace-nowrap ${
              filters.contentType === t.value
                ? "bg-[var(--navy-900)] text-white"
                : "text-[var(--slate-500)] hover:text-[var(--navy-900)] hover:bg-[var(--coral-50)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <select
        value={filters.sort}
        onChange={(e) =>
          onChange({
            ...filters,
            sort: e.target.value as FeedFiltersState["sort"],
          })
        }
        className="text-xs text-[var(--slate-500)] bg-transparent border border-[var(--border)] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--coral-300)] cursor-pointer"
      >
        {sortOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
