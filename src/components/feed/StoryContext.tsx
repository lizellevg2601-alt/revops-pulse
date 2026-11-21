import type { FeedItem } from "@/lib/types";

export function StoryContext({ item, inverted = false }: { item: FeedItem; inverted?: boolean }) {
  const context = item.analysis || (item.intelligence ? {
    whyItMatters: item.intelligence.impact,
    recommendedAction: item.intelligence.action,
  } : undefined);

  if (!context) return null;
  return <details className="mt-4 border-t border-[var(--border)] pt-2 text-xs">
    <summary className={`flex min-h-11 cursor-pointer items-center font-semibold ${inverted ? "text-[#ffcfbf]" : "text-[var(--coral-600)]"}`}>Automated context +</summary>
    <div className="space-y-3 rounded-xl bg-[var(--coral-50)] p-4 leading-relaxed text-[var(--slate-700)]">
      <p className="text-[11px] text-[var(--slate-500)]">Keyword-based guidance from RSS metadata. Low confidence; not editor-reviewed. Confirm details with the publisher.</p>
      <p><strong>Why consider it:</strong> {context.whyItMatters}</p>
      <p><strong>Possible next step:</strong> {context.recommendedAction}</p>
    </div>
  </details>;
}
