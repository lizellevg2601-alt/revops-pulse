import { sourceUrl } from "@/lib/feed";
import type { FeedItem } from "@/lib/types";

type Context = {
  why: string;
  action?: string;
  changed?: string;
  implication?: string;
  watch?: string;
  evidence?: string;
  sourceUrl?: string;
};

function contextFor(item: FeedItem): Context | undefined {
  if (item.analysis) {
    return {
      why: item.analysis.whyItMatters,
      action: item.analysis.recommendedAction,
      changed: item.analysis.whatChanged,
      implication: item.analysis.strategicImplication,
      watch: item.analysis.whatToWatch,
      evidence: item.analysis.evidenceType === "rss_metadata"
        ? "Based on the publisher's listing. Check the original story for details."
        : "With supporting source links. Check the original story for details.",
      sourceUrl: item.analysis.sourceUrl,
    };
  }
  if (item.intelligence) {
    return {
      why: item.intelligence.impact,
      action: item.intelligence.action,
      changed: item.intelligence.signal,
      evidence: "Based on the publisher's listing. Check the original story for details.",
    };
  }
  if (Array.isArray(item.whyItMatters) && item.whyItMatters.some(Boolean)) {
    return { why: item.whyItMatters.filter(Boolean).join(" "), evidence: "Based on the publisher's listing. Check the original story for details." };
  }
  return undefined;
}

export function StoryContext({ item, inverted = false }: { item: FeedItem; inverted?: boolean }) {
  const context = contextFor(item);
  if (!context?.why) return null;
  const original = sourceUrl(context.sourceUrl) || sourceUrl(item.sourceUrl);
  const breakdown: [string, string][] = [];
  if (context.changed) breakdown.push(["What changed", context.changed]);
  if (context.implication) breakdown.push(["Strategic implication", context.implication]);
  if (context.watch) breakdown.push(["What to watch", context.watch]);
  if (context.evidence) breakdown.push(["Source note", context.evidence]);

  return <section className={`mt-4 rounded-xl border p-4 text-xs leading-relaxed ${inverted ? "border-white/15 bg-white/5 text-white/85" : "border-[var(--coral-200)] bg-[var(--coral-50)] text-[var(--slate-700)]"}`}>
    <p className={`text-[10px] font-bold uppercase tracking-wide ${inverted ? "text-[#ffcfbf]" : "text-[var(--coral-600)]"}`}>Quick take</p>
    <p className={`mt-1 text-[11px] ${inverted ? "text-white/60" : "text-[var(--slate-500)]"}`}>Based on the publisher&apos;s listing. Open the original story for the full picture.</p>
    <p className="mt-3"><strong>Why it matters:</strong> {context.why}</p>
    {context.action && <p className="mt-2"><strong>Next step:</strong> {context.action}</p>}
    {(breakdown.length > 0 || original) && <details className={`mt-3 border-t pt-1 ${inverted ? "border-white/15" : "border-[var(--coral-200)]"}`}>
      <summary className={`flex min-h-11 cursor-pointer items-center font-semibold ${inverted ? "text-[#ffcfbf]" : "text-[var(--coral-600)]"}`}>More context +</summary>
      <div className="space-y-2 pb-1">
        {breakdown.map(([label, value]) => <p key={label}><strong>{label}:</strong> {value}</p>)}
        {original && <a href={original} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-11 items-center font-semibold underline underline-offset-4 ${inverted ? "text-[#ffcfbf]" : "text-[var(--coral-600)]"}`}>Read original source<span className="sr-only"> (opens publisher in a new tab)</span></a>}
      </div>
    </details>}
  </section>;
}
