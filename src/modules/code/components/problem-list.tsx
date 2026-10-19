"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Circle, CircleDashed, Code2, Flame, Search, Trophy } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { istDate } from "../logic";
import { DIFFICULTIES, type Difficulty } from "../types";
import { DIFF_STYLE, DifficultyBadge, GRADIENT } from "./bits";

export interface ProblemRow {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  acceptance: number | null;
  solvers: number;
  state: "solved" | "attempted" | "todo";
}

export interface Progress {
  counts: Record<Difficulty, { solved: number; total: number }>;
  streak: number;
  best: number;
  days: string[];
}

const RING: Record<Difficulty, string> = { easy: "#2ee6c5", medium: "#ffb800", hard: "#ff4d6d" };

export function ProblemList({ problems, progress, serverNow }: { problems: ProblemRow[]; progress: Progress; serverNow: number }) {
  const [q, setQ] = useState("");
  const [diff, setDiff] = useState<Difficulty | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [state, setState] = useState<ProblemRow["state"] | null>(null);
  const tags = useMemo(() => [...new Set(problems.flatMap((p) => p.tags))].sort(), [problems]);
  const shown = problems.filter((p) => (!diff || p.difficulty === diff) && (!tag || p.tags.includes(tag)) && (!state || p.state === state) && (!q || p.title.toLowerCase().includes(q.toLowerCase())));
  const solved = DIFFICULTIES.reduce((s, d) => s + progress.counts[d].solved, 0);
  const total = DIFFICULTIES.reduce((s, d) => s + progress.counts[d].total, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="glass flex flex-1 items-center gap-2 rounded-2xl px-4 py-3">
            <Search className="size-4 text-muted" />
            <span className="sr-only">Search problems</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search problems…" className="w-full bg-transparent text-sm outline-none placeholder:text-muted" />
          </label>
          <div className="glass flex rounded-2xl p-1">
            {[null, ...DIFFICULTIES].map((d) => (
              <button key={d ?? "all"} type="button" onClick={() => setDiff(d)} className={cn("relative rounded-xl px-3 py-2 text-xs font-bold capitalize", diff === d ? "text-white" : d ? DIFF_STYLE[d] : "text-muted")}>
                {diff === d && <motion.span layoutId="diff-pill" className={cn("absolute inset-0 rounded-xl", GRADIENT)} />}
                <span className="relative">{d ?? "All"}</span>
              </button>
            ))}
          </div>
          <label className="glass flex items-center rounded-2xl px-3">
            <span className="sr-only">Status</span>
            <select value={state ?? ""} onChange={(e) => setState((e.target.value || null) as ProblemRow["state"] | null)} className="bg-transparent py-2.5 text-sm font-semibold outline-none">
              <option value="">Any status</option>
              <option value="todo">To do</option>
              <option value="attempted">Attempted</option>
              <option value="solved">Solved</option>
            </select>
          </label>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <button key={t} type="button" onClick={() => setTag(tag === t ? null : t)} className={cn("rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors", tag === t ? "bg-[#5b47ff]/20 text-fg ring-[#5b47ff]/60" : "text-muted ring-line hover:text-fg")}>
                {t}
              </button>
            ))}
          </div>
        )}

        {problems.length === 0 ? (
          <div className="glass rounded-[28px] p-12 text-center">
            <span className={cn("mx-auto grid size-16 place-items-center rounded-3xl text-white", GRADIENT)}>
              <Code2 className="size-7" />
            </span>
            <p className="mt-4 font-display text-xl font-bold">No problems yet</p>
            <p className="mt-1 text-sm text-muted">Instructors are writing the first challenges. Check back soon.</p>
          </div>
        ) : (
          <div className="glass overflow-hidden rounded-[24px]">
            <ul className="divide-y divide-line">
              <AnimatePresence initial={false}>
                {shown.map((p, i) => (
                  <motion.li key={p.id} layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ delay: Math.min(i, 12) * 0.02 }}>
                    <Link href={`/code/${p.slug}`} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-fg/[0.04]">
                      {p.state === "solved" ? <CheckCircle2 className="size-5 shrink-0 text-teal" aria-label="Solved" /> : p.state === "attempted" ? <CircleDashed className="size-5 shrink-0 text-saffron" aria-label="Attempted" /> : <Circle className="size-5 shrink-0 text-fg/20" aria-label="Not tried" />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold group-hover:text-[#2ee6c5]">{p.title}</p>
                        <p className="mt-0.5 truncate text-xs text-muted">{p.tags.join(" · ")}</p>
                      </div>
                      <span className="hidden w-24 text-right text-xs text-muted tabular-nums sm:block">{p.acceptance === null ? "—" : `${p.acceptance}% acc.`}</span>
                      <DifficultyBadge d={p.difficulty} className="w-16 text-right" />
                    </Link>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            {shown.length === 0 && <p className="p-8 text-center text-sm text-muted">No problems match these filters.</p>}
          </div>
        )}
      </div>

      <aside className="space-y-4">
        <section className="glass rounded-[26px] p-5">
          <div className="flex items-center gap-5">
            <Rings counts={progress.counts} />
            <div>
              <p className="font-display text-3xl font-bold tabular-nums">
                {solved}
                <span className="text-lg text-muted">/{total}</span>
              </p>
              <p className="text-sm text-muted">solved</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {DIFFICULTIES.map((d) => (
              <div key={d}>
                <div className="flex justify-between text-xs">
                  <span className={cn("font-bold capitalize", DIFF_STYLE[d])}>{d}</span>
                  <span className="text-muted tabular-nums">
                    {progress.counts[d].solved}/{progress.counts[d].total}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-fg/10">
                  <motion.div className="h-full rounded-full" style={{ background: RING[d] }} initial={{ width: 0 }} animate={{ width: `${progress.counts[d].total ? (progress.counts[d].solved / progress.counts[d].total) * 100 : 0}%` }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass rounded-[26px] p-5">
          <div className="flex items-center gap-3">
            <motion.span animate={progress.streak ? { scale: [1, 1.15, 1], rotate: [0, -6, 6, 0] } : {}} transition={{ duration: 1.8, repeat: Infinity }} className={cn("grid size-12 place-items-center rounded-2xl", progress.streak ? "bg-gradient-to-br from-[#ffb800] to-[#ff4d6d] text-white" : "bg-fg/10 text-muted")}>
              <Flame className="size-6" />
            </motion.span>
            <div>
              <p className="font-display text-2xl font-bold">
                {progress.streak} day{progress.streak === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-muted">
                Current streak · best {progress.best}
              </p>
            </div>
          </div>
          <Heatmap days={progress.days} now={serverNow} />
          <p className="mt-2 text-xs text-muted">Solve at least one problem a day (IST) to keep the flame alive.</p>
        </section>

        <Link href="/code/leaderboard" className="glass flex items-center gap-3 rounded-[22px] p-4 font-semibold hover:bg-fg/[0.04]">
          <Trophy className="size-5 text-saffron" /> See the leaderboard
        </Link>
      </aside>
    </div>
  );
}

function Rings({ counts }: { counts: Progress["counts"] }) {
  return (
    <svg viewBox="0 0 100 100" className="size-24 -rotate-90" aria-hidden>
      {DIFFICULTIES.map((d, i) => {
        const r = 42 - i * 11;
        const c = 2 * Math.PI * r;
        const pct = counts[d].total ? counts[d].solved / counts[d].total : 0;
        return (
          <g key={d}>
            <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeOpacity={0.08} strokeWidth="8" />
            <motion.circle cx="50" cy="50" r={r} fill="none" stroke={RING[d]} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct) }} transition={{ duration: 1.2, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }} />
          </g>
        );
      })}
    </svg>
  );
}

/** Last 15 weeks, one square per IST day. */
function Heatmap({ days, now }: { days: string[]; now: number }) {
  const active = new Set(days);
  const today = Date.parse(`${istDate(now)}T00:00:00Z`);
  const weekday = new Date(today).getUTCDay();
  const start = today - (14 * 7 + weekday) * 86_400_000;
  const cells = Array.from({ length: 15 * 7 }, (_, i) => new Date(start + i * 86_400_000).toISOString().slice(0, 10)).filter((d) => d <= istDate(now));
  return (
    <div className="mt-4 grid grid-flow-col grid-rows-7 gap-[3px]" role="img" aria-label={`${days.length} active days`}>
      {cells.map((d) => (
        <span key={d} title={d} className={cn("size-[11px] rounded-[3px]", active.has(d) ? "bg-[#2ee6c5]" : "bg-fg/[0.07]")} />
      ))}
    </div>
  );
}
