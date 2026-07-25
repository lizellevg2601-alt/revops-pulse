"use client";

import {
  LayoutDashboard,
  Rss,
  Tags,
  Bookmark,
  Headphones,
  Newspaper,
  Settings,
  ChevronLeft,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { icon: LayoutDashboard, label: "Home", active: true },
  { icon: Rss, label: "Feed" },
  { icon: Tags, label: "Topics" },
  { icon: Bookmark, label: "Saved" },
  { icon: Headphones, label: "Podcasts" },
  { icon: Newspaper, label: "Digest" },
  { icon: Settings, label: "Settings" },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-56"
      } shrink-0 bg-white border-r border-[var(--border)] flex flex-col transition-all duration-200 hidden lg:flex`}
    >
      <div className="px-4 pt-6 pb-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--navy-900)] flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-bold">RP</span>
          </div>
          {!collapsed && (
            <div>
              <div className="font-bold text-sm text-[var(--navy-950)]">
                RevOps Pulse
              </div>
              <div className="text-[10px] text-[var(--slate-500)] leading-tight">
                Intelligence for RevOps Leaders
              </div>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              item.active
                ? "bg-[var(--coral-100)] text-[var(--navy-900)]"
                : "text-[var(--slate-500)] hover:bg-[var(--coral-50)] hover:text-[var(--navy-900)]"
            }`}
          >
            <item.icon
              className={`w-4 h-4 shrink-0 ${
                item.active ? "text-[var(--coral-500)]" : ""
              }`}
            />
            {!collapsed && <span className="font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--blue-grey-200)] flex items-center justify-center text-xs font-semibold text-[var(--navy-900)] shrink-0">
            LB
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-medium text-[var(--navy-900)] truncate">
                Lizelle B.
              </div>
              <div className="text-[11px] text-[var(--slate-500)]">
                RevOps Leader
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex items-center justify-center h-8 border-t border-[var(--border)] text-[var(--slate-500)] hover:text-[var(--navy-900)] transition-colors"
      >
        <ChevronLeft
          className={`w-4 h-4 transition-transform ${
            collapsed ? "rotate-180" : ""
          }`}
        />
      </button>
    </aside>
  );
}
