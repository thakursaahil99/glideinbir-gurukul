"use client";

import { animate, motion } from "framer-motion";
import { ArrowLeft, Check, Clock, Medal, Percent, Target, TimerOff, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { AttemptResult, Question, QuestionOutcome } from "../types";

export interface ResultProps {
  testTitle: string;
  slug: string;
  result: AttemptResult;
  rank: number;
  percentile: number;
  candidates: number;
  timedOut: boolean;
  /** Full questions with answers: only sent after submission. */
  questions: (Question & { section: string; mine: { selected: string[]; value: number | null } | null })[];
}

const fmt = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`);

function useCount(to: number, decimals = 0) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const c = animate(0, to, { duration: 1.4, ease: [0.22, 1, 0.36, 1], onUpdate: (x) => setV(x) });
    return () => c.stop();
  }, [to]);
  return v.toFixed(decimals);
}

export function ResultView(p: ResultProps) {
  const r = p.result;
  const pct = r.maxScore > 0 ? Math.max(0, r.score) / r.maxScore : 0;
  const score = useCount(r.score, Number.isInteger(r.score) ? 0 : 2);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <Link href={`/tests/${p.slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> {p.testTitle}
      </Link>

      {p.timedOut && (
        <p className="flex items-center gap-2 rounded-2xl border border-saffron/40 bg-saffron/10 p-3 text-sm">
          <TimerOff className="size-4 text-saffron" /> Time ran out, so the test was submitted automatically with your saved answers.
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="glass grid h-fit place-items-center rounded-[28px] p-8 lg:sticky lg:top-24">
          <div className="relative size-52">
            <svg viewBox="0 0 120 120" className="size-full -rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" strokeWidth="10" />
              <motion.circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="url(#score-grad)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 52}
                initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - pct) }}
                transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
              />
              <defs>
                <linearGradient id="score-grad" x1="0" x2="1">
                  <stop offset="0" style={{ stopColor: "var(--primary)" }} />
                  <stop offset="1" style={{ stopColor: "var(--teal)" }} />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="font-display text-5xl font-extrabold tabular-nums">{score}</p>
                <p className="text-sm text-muted">out of {r.maxScore}</p>
              </div>
            </div>
          </div>
          <p className="mt-4 font-display text-xl font-bold">{pct >= 0.8 ? "Outstanding! 🚀" : pct >= 0.6 ? "Great work! ✨" : pct >= 0.4 ? "Good effort 💪" : "Keep practising 🌱"}</p>
        </motion.div>

        <div className="grid content-start gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile icon={Medal} label={`Rank of ${p.candidates}`} value={`#${p.rank}`} tint="text-saffron" />
            <Tile icon={Percent} label="Percentile" value={String(p.percentile)} tint="text-primary" />
            <Tile icon={Target} label="Accuracy" value={`${r.accuracy}%`} tint="text-teal" />
            <Tile icon={Clock} label="Time taken" value={fmt(r.timeTakenSec)} tint="text-rose" />
          </div>
          <div className="glass rounded-[24px] p-5">
            <p className="text-sm font-semibold">Breakdown</p>
            <div className="mt-3 flex h-4 overflow-hidden rounded-full bg-fg/10">
              {(
                [
                  ["correct", r.correct, "bg-teal"],
                  ["wrong", r.wrong, "bg-rose"],
                  ["skipped", r.skipped, "bg-fg/25"],
                ] as const
              ).map(([k, n, c], i) => (
                <motion.span key={k} className={c} initial={{ width: 0 }} animate={{ width: `${(n / (r.correct + r.wrong + r.skipped || 1)) * 100}%` }} transition={{ duration: 1, delay: 0.3 + i * 0.1 }} />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-teal" /> {r.correct} correct</span>
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-rose" /> {r.wrong} wrong</span>
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-fg/25" /> {r.skipped} skipped</span>
            </div>
          </div>
          <div className="glass rounded-[24px] p-5">
            <p className="text-sm font-semibold">Topic analysis</p>
            <ul className="mt-3 space-y-3">
              {r.topics.map((t, i) => {
                const share = t.max ? Math.max(0, t.score) / t.max : 0;
                const untouched = t.correct + t.wrong === 0;
                return (
                  <li key={t.topic}>
                    <div className="flex justify-between text-sm">
                      <span>
                        {t.topic}
                        <span className={cn("ml-2 text-xs font-semibold", untouched ? "text-muted" : share >= 0.7 ? "text-teal" : share < 0.4 ? "text-rose" : "text-saffron")}>
                          {untouched ? "Not attempted" : share >= 0.7 ? "Strong" : share < 0.4 ? "Needs work" : "Okay"}
                        </span>
                      </span>
                      <span className="text-muted tabular-nums">
                        {t.score}/{t.max}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-fg/10">
                      <motion.div
                        className={cn("h-full rounded-full", share >= 0.7 ? "bg-teal" : share < 0.4 ? "bg-rose" : "bg-saffron")}
                        initial={{ width: 0 }}
                        animate={{ width: `${share * 100}%` }}
                        transition={{ duration: 0.9, delay: 0.4 + i * 0.06 }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      <Solutions p={p} />
    </div>
  );
}

function Tile({ icon: Icon, label, value, tint }: { icon: typeof Clock; label: string; value: string; tint: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-4">
      <Icon className={cn("size-5", tint)} />
      <p className="mt-2 font-display text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </motion.div>
  );
}

const OUTCOME_STYLE: Record<QuestionOutcome, string> = { correct: "bg-teal/15 text-teal", wrong: "bg-rose/15 text-rose", skipped: "bg-fg/10 text-muted" };

function Solutions({ p }: { p: ResultProps }) {
  const [filter, setFilter] = useState<"all" | QuestionOutcome>("all");
  const byId = new Map(p.result.questions.map((x) => [x.questionId, x]));
  const shown = p.questions.filter((q) => filter === "all" || byId.get(q.id)?.outcome === filter);
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">Solutions</h2>
        <div className="glass inline-flex rounded-xl p-1 text-sm">
          {(["all", "correct", "wrong", "skipped"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={cn("rounded-lg px-3 py-1.5 font-semibold capitalize", filter === f ? "bg-fg text-bg" : "text-muted")}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <ul className="mt-4 space-y-3">
        {shown.map((q) => {
          const res = byId.get(q.id)!;
          const n = p.questions.indexOf(q) + 1;
          return (
            <li key={q.id} className="glass rounded-[22px] p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-display text-base font-bold">Q{n}</span>
                <span className="text-muted">
                  {q.section} · {q.topic}
                </span>
                <span className={cn("ml-auto rounded-full px-2.5 py-0.5 font-bold capitalize", OUTCOME_STYLE[res.outcome])}>
                  {res.outcome} {res.marks > 0 ? `+${res.marks}` : res.marks < 0 ? res.marks : ""}
                </span>
                <span className="text-muted">{fmt(res.timeSec)}</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap">{q.text}</p>
              {q.type === "numeric" ? (
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  <span className="rounded-xl bg-fg/[0.04] px-3 py-2">
                    Your answer: <b>{q.mine?.value ?? "—"}</b>
                  </span>
                  <span className="rounded-xl bg-teal/10 px-3 py-2 text-teal">
                    Correct: <b>{q.numeric?.value}</b>
                    {q.numeric && q.numeric.tolerance > 0 ? ` (±${q.numeric.tolerance})` : ""}
                  </span>
                </div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {q.options.map((o, i) => {
                    const right = q.correct.includes(o.id);
                    const picked = q.mine?.selected.includes(o.id) ?? false;
                    return (
                      <li
                        key={o.id}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border px-3 py-2 text-sm",
                          right ? "border-teal/50 bg-teal/10" : picked ? "border-rose/50 bg-rose/10" : "border-line",
                        )}
                      >
                        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-fg/5 text-xs font-bold">{String.fromCharCode(65 + i)}</span>
                        <span className="flex-1">{o.text}</span>
                        {right && <Check className="size-4 text-teal" aria-label="Correct answer" />}
                        {picked && !right && <X className="size-4 text-rose" aria-label="Your answer" />}
                        {picked && <span className="text-[11px] text-muted">your pick</span>}
                      </li>
                    );
                  })}
                </ul>
              )}
              {q.explanation && <p className="mt-3 rounded-xl bg-primary/10 p-3 text-sm"><b>Explanation:</b> {q.explanation}</p>}
            </li>
          );
        })}
        {!shown.length && <li className="py-6 text-center text-sm text-muted">No questions in this filter.</li>}
      </ul>
    </section>
  );
}
