"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import type { SiteContent } from "@/core/site/schema";
import { cn } from "@/lib/utils";
import { AreaField, Button, Card, LinesField, NumberField, TextField } from "./fields";
import { SectionEditor } from "./section-editor";

const TABS = [
  { key: "hero", label: "Hero" },
  { key: "marquee", label: "Marquee" },
  { key: "modulesSection", label: "Modules heading" },
  { key: "stats", label: "Stats" },
  { key: "journey", label: "Journey" },
  { key: "personas", label: "Roles" },
  { key: "cta", label: "Call to action" },
  { key: "dashboard", label: "Dashboard" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const BOLD_HINT = "Wrap words in **double stars** for bold";

export function ContentEditor({ site }: { site: SiteContent }) {
  const [tab, setTab] = useState<Tab>("hero");

  return (
    <>
      <div role="tablist" className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
              tab === t.key ? "border-transparent bg-fg text-bg" : "border-line text-muted hover:text-fg",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "hero" && (
        <SectionEditor key="hero" section="hero" initial={site.hero}>
          {(v, set) => (
            <Card title="Hero" description="The first screen visitors see.">
              <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
                <TextField label="Badge tag" value={v.badgeTag} onChange={(x) => set({ ...v, badgeTag: x })} maxLength={12} />
                <TextField label="Badge text" value={v.badge} onChange={(x) => set({ ...v, badge: x })} maxLength={80} />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {v.words.map((w, i) => (
                  <TextField
                    key={i}
                    label={`Headline word ${i + 1}`}
                    value={w}
                    maxLength={20}
                    onChange={(x) => {
                      const words = [...v.words] as typeof v.words;
                      words[i] = x;
                      set({ ...v, words });
                    }}
                  />
                ))}
              </div>
              <AreaField label="Intro paragraph" hint={BOLD_HINT} value={v.intro} onChange={(x) => set({ ...v, intro: x })} rows={4} />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Main button" value={v.primaryCta} onChange={(x) => set({ ...v, primaryCta: x })} maxLength={40} />
                <TextField label="Second button" value={v.secondaryCta} onChange={(x) => set({ ...v, secondaryCta: x })} maxLength={40} />
              </div>
              <TextField label="Small line under buttons" hint={BOLD_HINT} value={v.footnote} onChange={(x) => set({ ...v, footnote: x })} maxLength={160} />
            </Card>
          )}
        </SectionEditor>
      )}

      {tab === "marquee" && (
        <SectionEditor key="marquee" section="marquee" initial={site.marquee}>
          {(v, set) => (
            <Card title="Scrolling marquee" description="Two rows of exams and skills that scroll across the page. Leave a row empty to hide it.">
              <div className="grid gap-4 sm:grid-cols-2">
                <LinesField label="Row 1 (exams)" value={v.rowA} onChange={(x) => set({ ...v, rowA: x })} rows={10} />
                <LinesField label="Row 2 (skills)" value={v.rowB} onChange={(x) => set({ ...v, rowB: x })} rows={10} />
              </div>
            </Card>
          )}
        </SectionEditor>
      )}

      {tab === "modulesSection" && (
        <SectionEditor key="modulesSection" section="modulesSection" initial={site.modulesSection}>
          {(v, set) => (
            <Card title="Modules section heading" description="Text above the module cards on the landing page. Edit the cards themselves under Modules.">
              <HeadingFields v={v} set={set} />
            </Card>
          )}
        </SectionEditor>
      )}

      {tab === "stats" && (
        <SectionEditor key="stats" section="stats" initial={site.stats}>
          {(v, set) => (
            <Card title="Stats strip" description="Animated counters, 1 to 4 items.">
              {v.map((s, i) => (
                <div key={i} className="grid items-end gap-3 rounded-2xl border border-line p-4 sm:grid-cols-[80px_120px_80px_1fr_auto]">
                  <TextField label="Prefix" value={s.prefix} maxLength={4} onChange={(x) => set(v.map((o, j) => (j === i ? { ...o, prefix: x } : o)))} />
                  <NumberField label="Number" value={s.value} onChange={(x) => set(v.map((o, j) => (j === i ? { ...o, value: x } : o)))} />
                  <TextField label="Suffix" value={s.suffix} maxLength={4} onChange={(x) => set(v.map((o, j) => (j === i ? { ...o, suffix: x } : o)))} />
                  <TextField label="Label" value={s.label} maxLength={60} onChange={(x) => set(v.map((o, j) => (j === i ? { ...o, label: x } : o)))} />
                  <Button variant="danger" aria-label="Remove stat" disabled={v.length <= 1} onClick={() => set(v.filter((_, j) => j !== i))}>
                    <Minus className="size-4" />
                  </Button>
                </div>
              ))}
              {v.length < 4 && (
                <Button variant="ghost" className="w-fit" onClick={() => set([...v, { value: 0, prefix: "", suffix: "", label: "New stat" }])}>
                  <Plus className="size-4" /> Add stat
                </Button>
              )}
            </Card>
          )}
        </SectionEditor>
      )}

      {tab === "journey" && (
        <SectionEditor key="journey" section="journey" initial={site.journey}>
          {(v, set) => (
            <>
              <Card title="Journey heading">
                <HeadingFields v={v} set={(h) => set({ ...v, ...h })} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField label="Sanskrit / Hindi quote" value={v.quote} onChange={(x) => set({ ...v, quote: x })} maxLength={80} />
                  <TextField label="Quote meaning" value={v.quoteMeaning} onChange={(x) => set({ ...v, quoteMeaning: x })} maxLength={120} />
                </div>
              </Card>
              {v.steps.map((s, i) => (
                <Card key={i} title={`Step ${i + 1}`}>
                  <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
                    <TextField label="Kicker" value={s.kicker} maxLength={30} onChange={(x) => set({ ...v, steps: v.steps.map((o, j) => (j === i ? { ...o, kicker: x } : o)) })} />
                    <TextField label="Title" value={s.title} maxLength={80} onChange={(x) => set({ ...v, steps: v.steps.map((o, j) => (j === i ? { ...o, title: x } : o)) })} />
                  </div>
                  <AreaField label="Body" value={s.body} onChange={(x) => set({ ...v, steps: v.steps.map((o, j) => (j === i ? { ...o, body: x } : o)) })} />
                </Card>
              ))}
            </>
          )}
        </SectionEditor>
      )}

      {tab === "personas" && (
        <SectionEditor key="personas" section="personas" initial={site.personas}>
          {(v, set) => (
            <>
              <Card title="Roles heading">
                <HeadingFields v={v} set={(h) => set({ ...v, ...h })} />
              </Card>
              <div className="grid gap-5 lg:grid-cols-2">
                {v.roles.map((r, i) => {
                  const patch = (p: Partial<typeof r>) => set({ ...v, roles: v.roles.map((o, j) => (j === i ? { ...o, ...p } : o)) });
                  return (
                    <Card key={i} title={`Role ${i + 1}`}>
                      <TextField label="Role name" value={r.role} maxLength={30} onChange={(x) => patch({ role: x })} />
                      <TextField label="Headline" value={r.line} maxLength={80} onChange={(x) => patch({ line: x })} />
                      <LinesField label="Perks" hint="Up to 4, one per line" value={r.perks} onChange={(x) => patch({ perks: x })} rows={4} />
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </SectionEditor>
      )}

      {tab === "cta" && (
        <SectionEditor key="cta" section="cta" initial={site.cta}>
          {(v, set) => (
            <Card title="Call to action" description="The big sign-up block near the bottom of the landing page.">
              <TextField label="Kicker (Hindi line)" value={v.kicker} onChange={(x) => set({ ...v, kicker: x })} maxLength={40} />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Title" value={v.title} onChange={(x) => set({ ...v, title: x })} maxLength={80} />
                <TextField label="Highlighted words" value={v.highlight} onChange={(x) => set({ ...v, highlight: x })} maxLength={40} />
              </div>
              <AreaField label="Body" value={v.body} onChange={(x) => set({ ...v, body: x })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Main button" value={v.primary} onChange={(x) => set({ ...v, primary: x })} maxLength={40} />
                <TextField label="Second button" value={v.secondary} onChange={(x) => set({ ...v, secondary: x })} maxLength={40} />
              </div>
            </Card>
          )}
        </SectionEditor>
      )}

      {tab === "dashboard" && (
        <SectionEditor key="dashboard" section="dashboard" initial={site.dashboard}>
          {(v, set) => (
            <Card title="Student dashboard" description="Shown to every signed-in user.">
              <TextField label="Fallback name" hint="Used when a user has no name" value={v.greetingName} onChange={(x) => set({ ...v, greetingName: x })} maxLength={30} />
              <TextField label="Tagline pill" value={v.tagline} onChange={(x) => set({ ...v, tagline: x })} maxLength={80} />
            </Card>
          )}
        </SectionEditor>
      )}
    </>
  );
}

interface Heading {
  eyebrow: string;
  title: string;
  sub: string;
}

function HeadingFields<T extends Heading>({ v, set }: { v: T; set: (next: T) => void }) {
  return (
    <>
      <TextField label="Eyebrow" value={v.eyebrow} onChange={(x) => set({ ...v, eyebrow: x })} maxLength={60} />
      <TextField label="Title" value={v.title} onChange={(x) => set({ ...v, title: x })} maxLength={120} />
      <AreaField label="Subtitle" value={v.sub} onChange={(x) => set({ ...v, sub: x })} />
    </>
  );
}
