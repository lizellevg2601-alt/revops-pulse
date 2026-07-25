"use client";

import { X, Sliders } from "lucide-react";
import { useState } from "react";
import { mockProfile } from "@/data/mockProfile";
import type { RelevanceProfile } from "@/lib/types";

export function RelevanceProfileDrawer() {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<RelevanceProfile>(mockProfile);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-[var(--slate-500)] hover:text-[var(--navy-900)] transition-colors"
        aria-label="Open relevance profile"
      >
        <Sliders className="w-4 h-4" />
        My Relevance Profile
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white border-l border-[var(--border)] z-50 overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-editorial font-bold text-[var(--navy-950)]">
                  My Relevance Profile
                </h2>
                <p className="text-xs text-[var(--slate-500)] mt-0.5">
                  These preferences shape the insights we surface for you.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--coral-50)]"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              <Section title="Profile">
                <Field label="Role" value={profile.role} />
                <Field label="Seniority" value={profile.seniority} />
                <Field label="Org size" value={profile.orgSize} />
                <Field label="Company stage" value={profile.companyStage} />
                <Field
                  label="Function / focus"
                  value={profile.functionFocus.join(", ")}
                />
                <Field label="Region" value={profile.region.join(", ")} />
              </Section>

              <Section title="Content preferences">
                <div className="space-y-3">
                  <Toggle
                    label="More strategic"
                    checked={profile.strategicWeight > 50}
                    onChange={(v) =>
                      setProfile({ ...profile, strategicWeight: v ? 70 : 30 })
                    }
                  />
                  <Toggle
                    label="More tactical"
                    checked={profile.tacticalWeight > 50}
                    onChange={(v) =>
                      setProfile({ ...profile, tacticalWeight: v ? 70 : 30 })
                    }
                  />
                  <Toggle
                    label="Podcast-heavy"
                    checked={profile.podcastWeight > 50}
                    onChange={(v) =>
                      setProfile({ ...profile, podcastWeight: v ? 70 : 30 })
                    }
                  />
                  <Toggle
                    label="Prefer brief summaries"
                    checked={profile.preferredDepth === "brief"}
                    onChange={(v) =>
                      setProfile({
                        ...profile,
                        preferredDepth: v ? "brief" : "balanced",
                      })
                    }
                  />
                  <Toggle
                    label="Prefer deep analysis"
                    checked={profile.preferredDepth === "deep"}
                    onChange={(v) =>
                      setProfile({
                        ...profile,
                        preferredDepth: v ? "deep" : "balanced",
                      })
                    }
                  />
                  <Toggle
                    label="Prioritise practitioner content"
                    checked={false}
                    onChange={() => {}}
                  />
                  <Toggle
                    label="Prioritise executive content"
                    checked={false}
                    onChange={() => {}}
                  />
                </div>
              </Section>

              <Section title="Topic interests">
                <div className="flex flex-wrap gap-2">
                  {profile.boostedKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="text-xs px-2.5 py-1 rounded-full bg-[var(--coral-50)] text-[var(--coral-500)] font-medium"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </Section>

              <Section title="Blocked topics">
                <div className="flex flex-wrap gap-2">
                  {profile.blockedTopics.map((t) => (
                    <span
                      key={t}
                      className="text-xs px-2.5 py-1 rounded-full bg-[var(--blue-grey-100)] text-[var(--slate-500)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </Section>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--slate-500)] mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-[var(--slate-500)]">{label}</span>
      <span className="text-sm font-medium text-[var(--navy-950)]">
        {value || "—"}
      </span>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-[var(--slate-500)]">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${
          checked ? "bg-[var(--coral-500)]" : "bg-[var(--border)]"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </button>
    </label>
  );
}
