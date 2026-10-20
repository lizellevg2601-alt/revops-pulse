"use client";

import Link from "next/link";
import { FormEvent, useEffect, useEffectEvent, useState } from "react";
import { PublicShell } from "@/components/public/PublicShell";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const consumeMagicLink = useEffectEvent(async (token: string) => {
    setBusy(true);
    try {
      const response = await fetch("/api/auth/consume", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      if (!response.ok) throw new Error("This sign-in link is invalid or has expired.");
      window.location.replace("/");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Could not sign in.");
      setBusy(false);
    }
  });

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
    if (!token) return;
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    queueMicrotask(() => void consumeMagicLink(token));
  }, []);

  async function requestLink(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/request-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      if (!response.ok) throw new Error("Could not request a sign-in link.");
      const body: { message: string } = await response.json();
      setMessage(body.message);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Could not request a sign-in link.");
    } finally { setBusy(false); }
  }

  return <PublicShell eyebrow="Member access" title="Welcome back to the signal.">
    <div className="w-full max-w-md">
      <h2 className="font-editorial text-2xl font-semibold">Sign in with email</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--slate-500)]">We’ll send a secure, one-time link to members with active lifetime access.</p>
      <form onSubmit={requestLink} className="mt-7 space-y-4">
        <label className="block text-sm font-semibold">Email address<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border bg-white px-4 py-3 font-normal outline-none focus:ring-2 focus:ring-[var(--coral-300)]" /></label>
        <button disabled={busy} className="w-full rounded-full bg-[var(--coral-500)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Please wait..." : "Email me a sign-in link"}</button>
      </form>
      {message && <p role="status" className="mt-4 rounded-xl bg-[var(--coral-50)] p-4 text-sm leading-6">{message}</p>}
      <p className="mt-7 text-sm text-[var(--slate-500)]">Need lifetime access? <Link href="/buy/" className="font-semibold text-[var(--coral-500)]">View the one-time purchase</Link></p>
    </div>
  </PublicShell>;
}
