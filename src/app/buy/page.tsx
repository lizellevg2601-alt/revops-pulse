"use client";

import { FormEvent, useState } from "react";
import { PublicShell } from "@/components/public/PublicShell";

export default function BuyPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function checkout(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/checkout/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, attemptId: crypto.randomUUID() }) });
      const body: { checkoutUrl?: string; error?: { message?: string } } = await response.json();
      if (!response.ok || !body.checkoutUrl) throw new Error(body.error?.message || "Checkout is not available.");
      window.location.assign(body.checkoutUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Checkout is not available.");
      setBusy(false);
    }
  }

  return <PublicShell eyebrow="Lifetime membership" title="One purchase. An enduring edge.">
    <div className="w-full max-w-md">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--coral-500)]">One-time hosted checkout</p>
      <h2 className="mt-2 font-editorial text-2xl font-semibold">RevOps Pulse lifetime access</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--slate-500)]">Your final price and currency will be shown in secure Stripe Checkout. No subscription and no recurring invoice.</p>
      <form onSubmit={checkout} className="mt-7 space-y-4">
        <label className="block text-sm font-semibold">Access email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal outline-none focus:ring-2 focus:ring-[var(--coral-300)]" /></label>
        <button disabled={busy} className="w-full rounded-full bg-[var(--coral-500)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Opening checkout..." : "Continue to secure checkout"}</button>
      </form>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    </div>
  </PublicShell>;
}
