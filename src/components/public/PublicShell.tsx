import Link from "next/link";
import type { ReactNode } from "react";

export function PublicShell({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[var(--page)] px-5 py-8 sm:py-14">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-[32px] border bg-white shadow-[0_24px_80px_rgba(18,19,21,0.09)] md:grid md:grid-cols-[0.9fr_1.1fr]">
        <section className="relative flex min-h-64 flex-col justify-between overflow-hidden bg-[var(--navy-950)] p-8 text-white sm:p-12">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full border-[48px] border-[var(--coral-500)] opacity-90" />
          <Link href="/login/" className="relative font-editorial text-lg font-semibold">RevOps Pulse<span className="text-[var(--coral-500)]">.</span></Link>
          <div className="relative mt-20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ffb9a9]">{eyebrow}</p>
            <h1 className="mt-3 font-editorial text-3xl font-semibold leading-tight sm:text-4xl">{title}</h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[#e9ded8]">Curated RevOps intelligence shaped around the work, systems and signals that matter to you.</p>
          </div>
        </section>
        <section className="flex min-h-[430px] items-center p-7 sm:p-12">{children}</section>
      </div>
    </main>
  );
}
