import Link from "next/link";
import type { ReactNode } from "react";
import { siteConfig, takedownMailto } from "@/lib/site-config";

export function LegalPage({
  eyebrow,
  title,
  intro,
  contactContext,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  contactContext: string;
  children: ReactNode;
}) {
  return <main className="mx-auto max-w-2xl px-5 py-12">
    <Link href="/" className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--coral-600)]">← Back to RevOps Pulse</Link>
    <p className="mt-8 text-xs font-semibold uppercase tracking-widest text-[var(--coral-600)]">{eyebrow}</p>
    <h1 className="mt-3 font-editorial text-3xl font-semibold">{title}</h1>
    <p className="mt-5 leading-relaxed text-[var(--slate-700)]">{intro}</p>
    <p className="mt-3 text-xs text-[var(--slate-500)]">Effective {siteConfig.legalEffectiveDate} · Published by {siteConfig.publisher}</p>
    <div className="mt-9 space-y-8 text-sm leading-relaxed text-[var(--slate-700)]">{children}</div>
    <section className="mt-10 rounded-2xl border bg-white p-5 text-sm leading-relaxed">
      <h2 className="font-semibold">Contact</h2>
      <p className="mt-2 text-[var(--slate-700)]">Questions about {contactContext}, or a copyright concern? Email <a href={takedownMailto} className="font-semibold text-[var(--coral-600)] underline underline-offset-4">{siteConfig.contactEmail}</a>. For copyright and takedown requests, please include the story URL, the publisher, and the reason for the request.</p>
      <p className="mt-3"><Link href="/about/" className="text-[var(--coral-600)] underline underline-offset-4">Read our sources and editorial approach</Link></p>
    </section>
  </main>;
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2 className="mb-2 text-lg font-semibold">{title}</h2><div className="space-y-3">{children}</div></section>;
}
