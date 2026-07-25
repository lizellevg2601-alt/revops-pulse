"use client";

import { Settings } from "lucide-react";
import { mockProfile } from "@/data/mockProfile";

export function PersonalisationBar() {
  const p = mockProfile;

  return (
    <div className="bg-white border-b border-[var(--border)]">
      <div className="px-4 lg:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--slate-500)] uppercase tracking-wider">
              Personalised for you
            </span>
          </div>
          <button
            className="text-xs text-[var(--slate-500)] hover:text-[var(--navy-900)] flex items-center gap-1 transition-colors"
            aria-label="Edit settings"
          >
            <Settings className="w-3 h-3" />
            Edit settings
          </button>
        </div>
        <div className="flex items-center gap-2 mt-1.5 overflow-x-auto pb-1">
          <Pill label={p.role} />
          <Pill label={p.orgSize} />
          <Pill label={p.functionFocus[0]} />
          <Pill label={`${p.region.join(" + ")}`} />
        </div>
      </div>
    </div>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <span className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-[var(--coral-50)] text-[var(--coral-500)] font-medium whitespace-nowrap">
      {label}
    </span>
  );
}
