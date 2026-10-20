"use client";
import { useState } from "react";
import { BookmarkPlus, X } from "lucide-react";

export function BookmarkSiteButton() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<"mac" | "windows" | "ios" | "android">("windows");
  const show = () => {
    const agent = navigator.userAgent;
    setPlatform(/iPhone|iPad|iPod/.test(agent) ? "ios" : /Android/.test(agent) ? "android" : /Mac/.test(agent) ? "mac" : "windows");
    setOpen(true);
  };
  const instructions = {
    mac: "Press ⌘ + D, then confirm the bookmark in your browser.",
    windows: "Press Ctrl + D, then confirm the bookmark in your browser.",
    ios: "Open your browser's Share menu, then choose Add Bookmark (Safari) or Bookmark (Chrome).",
    android: "Open your browser menu (⋮), then tap the star or Add to bookmarks.",
  };
  return <>
    <button type="button" onClick={show} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--border)] px-3 py-2 text-xs font-semibold hover:bg-[var(--coral-50)]" aria-label="How to bookmark this website">
      <BookmarkPlus className="h-4 w-4 text-[var(--coral-500)]" /><span className="hidden sm:inline">Bookmark this feed</span>
    </button>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="bookmark-heading" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><h2 id="bookmark-heading" className="font-editorial text-xl font-semibold">Keep RevOps Pulse close</h2><button onClick={()=>setOpen(false)} aria-label="Close bookmark help"><X className="h-5 w-5"/></button></div>
        <p className="my-4 text-sm text-[var(--slate-700)]">Your browser controls bookmarks, so websites cannot save themselves automatically. Here is the quickest way:</p>
        <p className="rounded-xl bg-[var(--coral-50)] p-4 text-sm font-medium">{instructions[platform]}</p>
        <label className="mt-5 block text-xs font-semibold" htmlFor="bookmark-device">Other device or browser?</label>
        <select id="bookmark-device" className="mt-2 w-full rounded-lg border bg-white p-2 text-sm" value={platform} onChange={e=>setPlatform(e.target.value as typeof platform)}><option value="windows">Windows / Linux desktop</option><option value="mac">Mac desktop</option><option value="ios">iPhone / iPad</option><option value="android">Android</option></select>
      </section>
    </div>}
  </>;
}