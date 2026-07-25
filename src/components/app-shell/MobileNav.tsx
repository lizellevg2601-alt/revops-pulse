"use client";

import {
  LayoutDashboard,
  Rss,
  Bookmark,
  Headphones,
  Settings,
} from "lucide-react";

const items = [
  { icon: LayoutDashboard, label: "Home", active: true },
  { icon: Rss, label: "Feed" },
  { icon: Bookmark, label: "Saved" },
  { icon: Headphones, label: "Podcasts" },
  { icon: Settings, label: "Settings" },
];

export function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--border)] z-50">
      <div className="flex items-center justify-around h-14 px-2">
        {items.map((item) => (
          <button
            key={item.label}
            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
              item.active
                ? "text-[var(--coral-500)]"
                : "text-[var(--slate-500)]"
            }`}
          >
            <item.icon className="w-4 h-4" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
