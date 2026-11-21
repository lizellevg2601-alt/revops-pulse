import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig, takedownMailto } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Sources & editorial approach | RevOps Pulse",
  description: "How RevOps Pulse collects source updates, labels automated context, and separates editor-reviewed briefings.",
};

export default function AboutPage() {
  return <main className="mx-auto max-w-2xl px-5 py-12">
    <Link href="/" className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--coral-600)]">← Back to RevOps Pulse</Link>
    <p className="mt-8 text-xs font-semibold uppercase tracking-widest text-[var(--coral-600)]">Our approach</p>
    <h1 className="mt-3 font-editorial text-3xl font-semibold">Clear sources. Clear boundaries.</h1>
    <p className="mt-5 leading-relaxed text-[var(--slate-700)]">RevOps Pulse brings together CRM, AI, revenue operations, and GTM developments. We distinguish external reporting from automated prompts and our own reviewed perspectives.</p>
    <div className="mt-9 space-y-8 text-sm leading-relaxed text-[var(--slate-700)]">
      <section><h2 className="mb-2 text-lg font-semibold">Source updates</h2><p>Headlines, attribution, dates, and short excerpts of up to 180 characters come from publisher RSS feeds. Each story links to its original publisher. Inclusion does not mean we have independently verified the story or endorsed the publisher. Podcast entries show only the title, publisher, date, duration, and link; we do not republish episode descriptions. We do not republish full articles or publisher photography.</p></section>
      <section><h2 className="mb-2 text-lg font-semibold">Automated context</h2><p>Expandable context uses keyword rules applied to RSS titles, tags, and descriptions. It is not a full-article analysis, an AI fact-check, or an editor-reviewed recommendation. These low-confidence prompts are intended to help you decide what to investigate, not establish what happened.</p></section>
      <section><h2 className="mb-2 text-lg font-semibold">Editor-reviewed briefings</h2><p>Reviewed briefings are a separate collection. Each must name its reviewer, state when it was approved, and link to supporting sources. They explain what changed, why it matters, the operational implications, and a practical next step. Automated source updates never inherit this review status.</p></section>
      <section><h2 className="mb-2 text-lg font-semibold">Ranking and topics</h2><p>The default order is most recently published. Optional topic match uses keyword coverage, practical-format signals, and recency; it is not personalised and does not rate accuracy. Topic counts cover the latest 7 days in the collected feed. Percentage changes compare topic share across two equal 7-day windows; without a comparable baseline, no percentage is shown. Publisher coverage and the feed size limit affect these counts.</p></section>
      <section><h2 className="mb-2 text-lg font-semibold">Freshness and outages</h2><p>Publication dates belong to the original publisher; the feed refresh timestamp records collection. If a publisher is unavailable, we may retain previously collected stories with their original dates. If a refresh produces no usable stories, the last useful feed is preserved. Coverage notices identify unavailable publishers.</p></section>
      <section><h2 className="mb-2 text-lg font-semibold">Saved stories</h2><p>Bookmarks are stored locally in your browser, without an account or cross-device sync. Only saved stories still present in the current feed are displayed. Clearing browser storage removes your bookmarks; if storage is blocked, saving may last only for the current tab.</p></section>
      <section><h2 className="mb-2 text-lg font-semibold">Contact and corrections</h2><p>If you spot an error, or you are a publisher who would prefer different treatment of your feed, email <a href={takedownMailto} className="text-[var(--coral-600)] underline underline-offset-4">{siteConfig.contactEmail}</a> with the story URL and the reason for your request. Our <a href="/terms/" className="text-[var(--coral-600)] underline underline-offset-4">Terms of Use</a> and <a href="/privacy/" className="text-[var(--coral-600)] underline underline-offset-4">Privacy Policy</a> set out the rest.</p></section>
    </div>
  </main>;
}
