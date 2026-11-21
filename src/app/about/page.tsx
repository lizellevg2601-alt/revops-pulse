import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig, takedownMailto } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "About the feed | RevOps Pulse",
  description: "How RevOps Pulse gathers stories, adds context, and keeps original work separate.",
};

export default function AboutPage() {
  return <main className="mx-auto max-w-2xl px-5 py-12">
    <Link href="/" className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--coral-600)]">← Back to RevOps Pulse</Link>
    <p className="mt-8 text-xs font-semibold uppercase tracking-widest text-[var(--coral-600)]">Our approach</p>
    <h1 className="mt-3 font-editorial text-3xl font-semibold">What you&apos;re reading, and why.</h1>
    <p className="mt-5 leading-relaxed text-[var(--slate-700)]">RevOps Pulse brings together CRM, AI, revenue operations, and GTM developments. Every story links to its original publisher, and each one includes a short take to help you decide what to read next.</p>
    <div className="mt-9 space-y-8 text-sm leading-relaxed text-[var(--slate-700)]">
      <section><h2 className="mb-2 text-lg font-semibold">Source updates</h2><p>Headlines, sources, dates, and short previews come from publishers and link to the original story. Podcast entries show the episode title, publisher, date, duration, and a link to listen. We don&apos;t republish full articles, photography, or episode descriptions.</p></section>
      <section><h2 className="mb-2 text-lg font-semibold">Quick takes</h2><p>Each story includes a short take on why it may matter and a suggested next step, drawn from the original source&apos;s details. Expand a story for more context. It&apos;s a starting point for your own reading — the original source has the full picture.</p></section>
      <section><h2 className="mb-2 text-lg font-semibold">Original briefings</h2><p>When we publish our own briefings, they are clearly marked with a named reviewer, approval date, and supporting sources. They are kept separate from source updates.</p></section>
      <section><h2 className="mb-2 text-lg font-semibold">Ranking and topics</h2><p>The default order is most recent. Topic match orders stories by relevance to the topic you&apos;ve chosen. Topic counts cover the last 7 days, and changes compare this week with last week. A story can appear in more than one topic.</p></section>
      <section><h2 className="mb-2 text-lg font-semibold">Freshness</h2><p>Publication dates come from the original publisher. The refresh time on the homepage shows when we last gathered stories, and the feed updates daily.</p></section>
      <section><h2 className="mb-2 text-lg font-semibold">Saved stories</h2><p>Bookmarks are stored in your browser, without an account or cross-device sync. Only saved stories still in the current feed are shown. Clearing browser storage removes your bookmarks.</p></section>
      <section><h2 className="mb-2 text-lg font-semibold">Contact</h2><p>If you spot an error, or you are a publisher who would prefer different treatment of your feed, email <a href={takedownMailto} className="text-[var(--coral-600)] underline underline-offset-4">{siteConfig.contactEmail}</a> with the story URL and the reason for your request. Our <a href="/terms/" className="text-[var(--coral-600)] underline underline-offset-4">Terms of Use</a> and <a href="/privacy/" className="text-[var(--coral-600)] underline underline-offset-4">Privacy Policy</a> set out the rest.</p></section>
    </div>
  </main>;
}
