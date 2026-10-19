"use client";

import { motion } from "framer-motion";
import { ExternalLink, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { matchesQuery } from "../logic";
import type { ExternalJob } from "../types";
import { ago, CompanyMark } from "./bits";

/** Public list of synced remote jobs: searchable, no sign-in needed (Remotive's terms). */
export function RemotePublic({ jobs, serverNow }: { jobs: ExternalJob[]; serverNow: number }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [limit, setLimit] = useState(30);
  const cats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const j of jobs) counts.set(j.category, (counts.get(j.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [jobs]);
  const shown = jobs.filter((j) => (!cat || j.category === cat) && (!q || matchesQuery(`${j.title} ${j.company} ${j.tags.join(" ")} ${j.category}`, q)));

  return (
    <div className="space-y-5">
      <label className="glass flex items-center gap-2 rounded-2xl px-4 py-3">
        <Search className="size-4 text-muted" />
        <span className="sr-only">Search remote jobs</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search role, skill or company" className="w-full bg-transparent text-sm outline-none placeholder:text-muted" />
      </label>
      <div className="flex flex-wrap gap-2">
        {[null, ...cats.map(([c]) => c)].map((c) => (
          <button key={c ?? "all"} type="button" onClick={() => setCat(c)} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold ring-1", cat === c ? "bg-[#3d8bff]/20 ring-[#3d8bff]/60" : "text-muted ring-line hover:text-fg")}>
            {c ?? `All (${jobs.length})`}
          </button>
        ))}
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {shown.slice(0, limit).map((j, i) => (
          <motion.li key={j.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.02 }} className="glass flex flex-col rounded-[22px] p-4">
            <div className="flex gap-3">
              <CompanyMark name={j.company} logo={j.logo} size="sm" />
              <div className="min-w-0">
                <p className="line-clamp-2 font-semibold">{j.title}</p>
                <p className="truncate text-xs text-muted">
                  {j.company} · {j.location}
                </p>
              </div>
            </div>
            {j.excerpt && <p className="mt-2 line-clamp-2 text-xs text-muted">{j.excerpt}</p>}
            <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs text-muted">
              <span className="truncate">{[j.category, j.salary, ago(j.publishedAt, serverNow)].filter(Boolean).join(" · ")}</span>
              <a href={j.url} target="_blank" rel="noopener" className="flex shrink-0 items-center gap-1 rounded-lg bg-fg/[0.06] px-2.5 py-1.5 font-semibold text-fg hover:bg-fg/10">
                View on Remotive <ExternalLink className="size-3.5" />
              </a>
            </div>
          </motion.li>
        ))}
      </ul>
      {shown.length === 0 && <p className="py-8 text-center text-sm text-muted">No jobs match your search.</p>}
      {shown.length > limit && (
        <div className="text-center">
          <button type="button" onClick={() => setLimit((l) => l + 30)} className="rounded-xl px-5 py-2.5 text-sm font-semibold ring-1 ring-line hover:bg-fg/5">
            Show more
          </button>
        </div>
      )}
    </div>
  );
}
