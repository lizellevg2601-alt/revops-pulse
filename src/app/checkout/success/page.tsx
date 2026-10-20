"use client";

import { useEffect, useEffectEvent, useState } from "react";
import Link from "next/link";
import { PublicShell } from "@/components/public/PublicShell";

export default function CheckoutSuccessPage() {
  const [sessionId, setSessionId] = useState("");
  const [status, setStatus] = useState("Confirming your payment securely...");
  const [busy, setBusy] = useState(true);
  const [linkSent, setLinkSent] = useState(false);

  async function complete(id: string) {
    setBusy(true);
    try {
      const response = await fetch("/api/checkout/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: id }) });
      const body: { pending?: boolean } = await response.json();
      if (response.ok && !body.pending) {
        setStatus("Your access is ready. Check the purchase email for a secure sign-in link. You can also request another link from the sign-in page.");
        setLinkSent(true);
      }
      else if (response.status === 202 && body.pending) setStatus("Stripe is still confirming your payment. Wait a moment, then retry.");
      else setStatus("We could not confirm this checkout. Contact support if the payment completed.");
    } catch { setStatus("We could not reach the confirmation service. Please retry."); }
    setBusy(false);
  }

  const beginCompletion = useEffectEvent((id: string) => {
    setSessionId(id);
    if (id) void complete(id);
    else { setStatus("No checkout session was provided."); setBusy(false); }
  });

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("session_id") || "";
    history.replaceState(null, "", window.location.pathname);
    queueMicrotask(() => beginCompletion(id));
  }, []);

  return <PublicShell eyebrow="Payment received" title="Your access is almost ready.">
    <div className="w-full max-w-md">
      <h2 className="font-editorial text-2xl font-semibold">Finalising membership</h2>
      <p role="status" className="mt-4 text-sm leading-6 text-[var(--slate-500)]">{status}</p>
      {linkSent ? (
        <Link href="/login/" className="mt-7 block w-full rounded-full bg-[var(--coral-500)] px-5 py-3 text-center text-sm font-semibold text-white">Go to sign in</Link>
      ) : (
        <button disabled={busy || !sessionId} onClick={() => complete(sessionId)} className="mt-7 w-full rounded-full bg-[var(--coral-500)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Checking..." : "Check payment status"}</button>
      )}
    </div>
  </PublicShell>;
}
