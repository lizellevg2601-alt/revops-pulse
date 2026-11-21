import type { TrendingTheme } from "@/lib/types";

export function TrendingThemes({ trends }: { trends: TrendingTheme[] }) {
  if (!trends.length) return null;
  return <section className="rounded-2xl border bg-white p-5">
    <h2 className="text-sm font-semibold">Topics in this feed</h2>
    <p className="mt-2 text-xs leading-relaxed text-[var(--slate-500)]">The themes appearing most across this week&apos;s stories.</p>
    <ol className="mt-4 divide-y">{trends.slice(0, 5).map(theme => <li key={theme.topic} className="py-3">
      <div className="flex items-start justify-between gap-3 text-xs"><span className="font-semibold">{theme.topic}</span><span className="shrink-0 text-[var(--slate-500)]">{theme.count} stories</span></div>
      <p className="mt-1 text-[11px] text-[var(--slate-500)]">{theme.change === null ? "New this week" : `${theme.change > 0 ? "+" : ""}${theme.change}% vs previous week`}</p>
    </li>)}</ol>
    <p className="mt-3 border-t pt-3 text-[10px] leading-relaxed text-[var(--slate-500)]">Stories can appear in more than one topic.</p>
  </section>;
}
