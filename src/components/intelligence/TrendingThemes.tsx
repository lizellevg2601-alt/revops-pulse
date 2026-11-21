import type { TrendingTheme } from "@/lib/types";

export function TrendingThemes({ trends }: { trends: TrendingTheme[] }) {
  if (!trends.length) return null;
  return <section className="rounded-2xl border bg-white p-5">
    <h2 className="text-sm font-semibold">Topics in this feed</h2>
    <p className="mt-2 text-xs leading-relaxed text-[var(--slate-500)]">Keyword matches in collected stories from the last 7 days—not a measure of community discussion.</p>
    <ol className="mt-4 divide-y">{trends.slice(0, 5).map(theme => <li key={theme.topic} className="py-3">
      <div className="flex items-start justify-between gap-3 text-xs"><span className="font-semibold">{theme.topic}</span><span className="shrink-0 text-[var(--slate-500)]">{theme.count} stories</span></div>
      <p className="mt-1 text-[11px] text-[var(--slate-500)]">{theme.change === null ? "No comparable previous-week baseline" : `${theme.change > 0 ? "+" : ""}${theme.change}% in share vs previous 7 days`}</p>
    </li>)}</ol>
    <p className="mt-3 border-t pt-3 text-[10px] leading-relaxed text-[var(--slate-500)]">Coverage depends on available publishers. Stories can match more than one topic. Changes compare equal 7-day windows within this feed.</p>
  </section>;
}
