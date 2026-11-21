"use client";

import { Bookmark, Search, X, Activity } from "lucide-react";
import { useEffect, useRef } from "react";

type Props = {
  query: string;
  onQueryChange: (query: string) => void;
  savedOnly: boolean;
  savedCount: number;
  onSavedChange: () => void;
  onHome: () => void;
};

export function TopSearchBar({ query, onQueryChange, savedOnly, savedCount, onSavedChange, onHome }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header className="border-b border-[var(--border)] bg-white">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-4 px-4 py-4 lg:px-8">
        <a href="#main-content" onClick={onHome} aria-label="RevOps Pulse home" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Activity aria-hidden="true" className="h-6 w-6 text-[var(--coral-500)]" />
          RevOps <span className="text-[var(--coral-500)]">Pulse</span>
        </a>
        <div role="search" className="relative order-3 w-full md:order-none md:ml-auto md:max-w-md md:flex-1">
          <label htmlFor="story-search" className="sr-only">Search stories</label>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--slate-500)]" />
          <input
            id="story-search" ref={inputRef} type="search" value={query}
            onChange={event => onQueryChange(event.target.value)}
            onKeyDown={event => { if (event.key === "Escape") onQueryChange(""); }}
            placeholder="Search stories, publishers, or topics…"
            className="min-h-11 w-full rounded-lg border bg-[var(--page)] py-2 pl-9 pr-16 text-sm"
            aria-controls="story-results" aria-keyshortcuts="Meta+K Control+K"
          />
          {query ? <button type="button" onClick={() => { onQueryChange(""); inputRef.current?.focus(); }} aria-label="Clear search" className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center"><X aria-hidden="true" className="h-4 w-4" /></button> :
            <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--slate-500)]">⌘/Ctrl K</kbd>}
        </div>
        <button type="button" aria-pressed={savedOnly} onClick={onSavedChange} className={`ml-auto flex min-h-11 items-center gap-2 rounded-full border px-4 text-xs font-semibold md:ml-0 ${savedOnly ? "bg-[var(--navy-950)] text-white" : "hover:bg-[var(--coral-50)]"}`}>
          <Bookmark aria-hidden="true" className="h-4 w-4" /> Saved stories <span>{savedCount}</span>
        </button>
      </div>
    </header>
  );
}
