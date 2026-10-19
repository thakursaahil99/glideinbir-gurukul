"use client";

import { ArrowDown, ArrowUp, ChevronDown } from "lucide-react";
import { useState } from "react";
import { moduleIcon } from "@/core/module-registry";
import type { ModuleConfig } from "@/core/site/schema";
import { cn } from "@/lib/utils";
import { AreaField, ColorField, LinesField, NumberField, TextField, Toggle } from "./fields";
import { SectionEditor } from "./section-editor";

export function ModulesEditor({ initial }: { initial: ModuleConfig[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <SectionEditor section="modules" initial={initial}>
      {(modules, set) => {
        const patch = (i: number, p: Partial<ModuleConfig>) => set(modules.map((m, j) => (j === i ? { ...m, ...p } : m)));
        const move = (i: number, dir: -1 | 1) => {
          const next = [...modules];
          [next[i], next[i + dir]] = [next[i + dir]!, next[i]!];
          set(next);
        };

        return modules.map((m, i) => {
          const Icon = moduleIcon(m.key);
          const open = openKey === m.key;
          return (
            <section key={m.key} className="glass overflow-hidden rounded-[24px]">
              <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl text-white" style={{ background: `linear-gradient(135deg, ${m.colors[0]}, ${m.colors[1]})` }}>
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-bold">{m.name}</p>
                  <p className="truncate text-xs text-muted">{m.tagline}</p>
                </div>
                <Toggle label={m.enabled ? "Enabled" : "Coming soon"} checked={m.enabled} onChange={(v) => patch(i, { enabled: v })} />
                <div className="flex items-center gap-1">
                  <IconBtn label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp className="size-4" />
                  </IconBtn>
                  <IconBtn label="Move down" disabled={i === modules.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown className="size-4" />
                  </IconBtn>
                  <IconBtn label={open ? "Collapse" : "Edit details"} onClick={() => setOpenKey(open ? null : m.key)}>
                    <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
                  </IconBtn>
                </div>
              </div>

              {open && (
                <div className="grid gap-4 border-t border-line p-4 sm:grid-cols-2 sm:p-5">
                  <TextField label="Name" value={m.name} onChange={(v) => patch(i, { name: v })} maxLength={40} />
                  <TextField label="Style label" hint="e.g. Udemy style" value={m.style} onChange={(v) => patch(i, { style: v })} maxLength={40} />
                  <TextField className="sm:col-span-2" label="Tagline" value={m.tagline} onChange={(v) => patch(i, { tagline: v })} maxLength={80} />
                  <AreaField className="sm:col-span-2" label="Description" value={m.description} onChange={(v) => patch(i, { description: v })} />
                  <LinesField className="sm:col-span-2" label="Features" value={m.features} onChange={(v) => patch(i, { features: v })} rows={4} />
                  <ColorField label="Colour 1" value={m.colors[0]} onChange={(v) => patch(i, { colors: [v, m.colors[1]] })} />
                  <ColorField label="Colour 2" value={m.colors[1]} onChange={(v) => patch(i, { colors: [m.colors[0], v] })} />
                  <NumberField label="Build phase" value={m.phase} onChange={(v) => patch(i, { phase: v })} />
                </div>
              )}
            </section>
          );
        });
      }}
    </SectionEditor>
  );
}

function IconBtn({ label, children, ...props }: { label: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" aria-label={label} title={label} className="grid size-9 place-items-center rounded-xl border border-line text-muted hover:bg-fg/5 hover:text-fg disabled:opacity-30" {...props}>
      {children}
    </button>
  );
}
