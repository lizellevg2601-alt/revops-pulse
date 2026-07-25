"use client";

import { Search, Bell, Command } from "lucide-react";
import { useState } from "react";
import { AppSidebar } from "./AppSidebar";

export function TopSearchBar() {
  const [query, setQuery] = useState("");

  return (
    <header className="bg-white border-b border-[var(--border)]">
      <div className="flex items-center gap-4 px-4 lg:px-6 h-14">
        {/* Mobile hamburger — triggers sidebar drawer */}
        <button
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--coral-50)] -ml-1"
          aria-label="Open menu"
        >
          <svg
            className="w-5 h-5 text-[var(--navy-900)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--slate-500)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search insights, topics, companies, or people..."
            className="w-full pl-9 pr-10 py-2 bg-[var(--page)] border border-[var(--border)] rounded-lg text-sm text-[var(--navy-950)] placeholder:text-[var(--slate-500)] focus:outline-none focus:ring-2 focus:ring-[var(--coral-300)] focus:border-transparent transition-all"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-[var(--slate-500)] bg-white border border-[var(--border)] rounded px-1.5 py-0.5">
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </div>
        </div>

        <button
          className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--coral-50)] transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4 text-[var(--slate-500)]" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--coral-500)] rounded-full" />
        </button>
      </div>
    </header>
  );
}
