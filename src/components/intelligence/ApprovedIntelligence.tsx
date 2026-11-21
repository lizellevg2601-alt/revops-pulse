import { ShieldCheck } from "lucide-react";
import { categoryLabel, formatDate } from "@/lib/feed";
import type { ApprovedArticle } from "@/lib/types";

export function ApprovedIntelligence({ category, articles }: { category: string; articles: ApprovedArticle[] }) {
  const filtered = articles.filter(article => category === "all" || article.category === category);
  if (!filtered.length) return null;

  return <section aria-labelledby="reviewed-title" className="mb-8">
    <h2 id="reviewed-title" className="mb-4 flex items-center gap-2 font-editorial text-xl font-semibold"><ShieldCheck aria-hidden="true" className="h-5 w-5 text-[var(--coral-600)]" />Editor-reviewed briefings</h2>
    <div className="grid gap-4 md:grid-cols-2">{filtered.map(article => <article key={article.id} className="space-y-3 rounded-2xl border bg-white p-6">
      <p className="text-xs font-semibold text-[var(--coral-600)]">{categoryLabel(article.category)} · Editor-reviewed</p>
      <h3 className="font-editorial text-xl font-semibold">{article.title}</h3>
      <p className="text-xs text-[var(--slate-500)]">Reviewed by {article.editor} · <time dateTime={article.approvedAt}>{formatDate(article.approvedAt)}</time></p>
      <p className="text-sm leading-relaxed"><strong>What changed:</strong> {article.whatChanged}</p>
      <p className="text-sm leading-relaxed"><strong>Why it matters:</strong> {article.why}</p>
      <p className="rounded-xl bg-[var(--coral-50)] p-3 text-sm leading-relaxed"><strong>Next step:</strong> {article.action}</p>
      <details className="border-t pt-2 text-sm"><summary className="flex min-h-11 cursor-pointer items-center font-semibold">Read the full perspective +</summary>
        <div className="space-y-3 py-3 leading-relaxed"><p><strong>Our perspective:</strong> {article.implications}</p><p><strong>What to watch:</strong> {article.watch}</p>
          <h4 className="font-semibold">Supporting sources</h4><ul>{article.sources.map((url, index) => <li key={`${url}-${index}`}><a className="inline-flex min-h-11 items-center break-all text-xs text-[var(--coral-600)] underline" href={url} target="_blank" rel="noopener noreferrer">{new URL(url).hostname} (opens in a new tab)</a></li>)}</ul>
        </div>
      </details>
    </article>)}</div>
  </section>;
}
