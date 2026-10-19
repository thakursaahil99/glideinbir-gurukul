"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Check, ChevronLeft, ChevronRight, CircleAlert, Clock, Eraser, Loader2, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { rpc } from "@/lib/rpc";
import { cn } from "@/lib/utils";
import { formatClock, type PublicQuestion } from "../logic";
import type { Answer } from "../types";

export interface AttemptProps {
  attemptId: string;
  title: string;
  sections: { id: string; title: string; questions: PublicQuestion[] }[];
  answers: Record<string, Answer>;
  marked: string[];
  deadline: string;
  serverNow: number;
}

type Status = "notVisited" | "notAnswered" | "answered" | "marked" | "answeredMarked";

const STATUS_STYLE: Record<Status, string> = {
  notVisited: "bg-fg/5 text-muted ring-1 ring-line",
  notAnswered: "bg-rose/90 text-white",
  answered: "bg-teal text-black",
  marked: "bg-[#8b5cf6] text-white",
  answeredMarked: "bg-[#8b5cf6] text-white ring-2 ring-teal ring-offset-2 ring-offset-bg",
};
const STATUS_LABEL: Record<Status, string> = {
  notVisited: "Not visited",
  notAnswered: "Not answered",
  answered: "Answered",
  marked: "Marked for review",
  answeredMarked: "Answered & marked",
};

const empty: Answer = { selected: [], value: null };
const hasAnswer = (q: PublicQuestion, a: Answer | undefined) => !!a && (q.type === "numeric" ? a.value !== null && Number.isFinite(a.value) : a.selected.length > 0);

export function AttemptView(p: AttemptProps) {
  const router = useRouter();
  const flat = useMemo(() => p.sections.flatMap((s, si) => s.questions.map((q, qi) => ({ q, si, qi }))), [p.sections]);
  const [pos, setPos] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>(p.answers);
  const [marked, setMarked] = useState<Set<string>>(() => new Set(p.marked));
  const [visited, setVisited] = useState<Set<string>>(() => new Set([...Object.keys(p.answers), ...p.marked, flat[0]?.q.id ?? ""]));
  const [numericText, setNumericText] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(p.answers).flatMap(([id, a]) => (a.value !== null ? [[id, String(a.value)]] : []))),
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Server-authoritative clock, corrected for the device's clock skew.
  const skew = useRef(p.serverNow - Date.now());
  const deadlineMs = Date.parse(p.deadline);
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((deadlineMs - (Date.now() + skew.current)) / 1000)));

  const current = flat[pos]!;
  const q = current.q;
  const activeSince = useRef(Date.now());
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const finished = useRef(false);

  const statusOf = useCallback(
    (qq: PublicQuestion): Status => {
      const ans = hasAnswer(qq, answers[qq.id]);
      if (marked.has(qq.id)) return ans ? "answeredMarked" : "marked";
      if (ans) return "answered";
      return visited.has(qq.id) ? "notAnswered" : "notVisited";
    },
    [answers, marked, visited],
  );

  const goResult = useCallback((url: string) => {
    finished.current = true;
    router.push(url);
  }, [router]);

  /** Saves one question (sequentially; each save carries the full state, so retries are safe). */
  const save = useCallback(
    (qq: PublicQuestion, ans: Answer, isMarked: boolean, timeDelta: number) => {
      chain.current = chain.current.then(async () => {
        if (finished.current) return;
        try {
          const res = await rpc("tests.answer", { attemptId: p.attemptId, questionId: qq.id, selected: ans.selected, value: ans.value, marked: isMarked, timeDelta: Math.min(3600, timeDelta) });
          if (!res.ok && "expired" in res) goResult(res.resultUrl);
          else if (!res.ok) setSaveError(res.error);
          else setSaveError(null);
        } catch {
          setSaveError("Connection problem: your answer will be saved when you move on.");
        }
      });
      return chain.current;
    },
    [p.attemptId, goResult],
  );

  /** Leave the current question: record its answer and the time spent on it, then go to `next`. */
  const leaveTo = (next: number, opts: { mark?: boolean } = {}) => {
    const isMarked = opts.mark ?? marked.has(q.id);
    if (opts.mark !== undefined)
      setMarked((m) => {
        const n = new Set(m);
        if (opts.mark) n.add(q.id);
        else n.delete(q.id);
        return n;
      });
    const spent = (Date.now() - activeSince.current) / 1000;
    void save(q, answers[q.id] ?? empty, isMarked, spent);
    activeSince.current = Date.now();
    const target = Math.max(0, Math.min(flat.length - 1, next));
    setVisited((v) => new Set(v).add(flat[target]!.q.id));
    setPos(target);
  };

  const submit = useCallback(
    async (reason: "manual" | "timeout") => {
      if (finished.current || submitting) return;
      setSubmitting(true);
      // Flush the question on screen first.
      const spent = (Date.now() - activeSince.current) / 1000;
      await save(q, answers[q.id] ?? empty, marked.has(q.id), spent);
      try {
        const res = await rpc("tests.submit", p.attemptId);
        if (res.ok) goResult(res.url);
        else {
          setSaveError(res.error);
          setSubmitting(false);
        }
      } catch {
        setSaveError(reason === "timeout" ? "Time's up. Reconnecting to submit…" : "Couldn't submit. Check your connection and try again.");
        setSubmitting(false);
      }
    },
    [answers, goResult, marked, p.attemptId, q, save, submitting],
  );

  // Countdown; auto-submit at zero.
  const submitRef = useRef(submit);
  submitRef.current = submit;
  useEffect(() => {
    const t = setInterval(() => {
      const s = Math.max(0, Math.ceil((deadlineMs - (Date.now() + skew.current)) / 1000));
      setLeft(s);
      if (s === 0) void submitRef.current("timeout");
    }, 1000);
    return () => clearInterval(t);
  }, [deadlineMs]);

  // Warn before closing the tab mid-test (the timer keeps running on the server).
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (!finished.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const setAnswer = (a: Answer) => setAnswers((all) => ({ ...all, [q.id]: a }));
  const ans = answers[q.id] ?? empty;
  const toggle = (optionId: string) => {
    if (q.type === "single") setAnswer({ selected: ans.selected[0] === optionId ? [] : [optionId], value: null });
    else setAnswer({ selected: ans.selected.includes(optionId) ? ans.selected.filter((x) => x !== optionId) : [...ans.selected, optionId], value: null });
  };

  const counts = flat.reduce<Record<Status, number>>(
    (c, f) => {
      c[statusOf(f.q)]++;
      return c;
    },
    { notVisited: 0, notAnswered: 0, answered: 0, marked: 0, answeredMarked: 0 },
  );
  const low = left <= 60;

  return (
    <div className="mx-auto max-w-7xl">
      {/* Top bar */}
      <div className="glass sticky top-24 z-20 mb-5 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3">
        <h1 className="min-w-0 flex-1 truncate font-display text-lg font-bold">{p.title}</h1>
        <motion.div
          animate={low ? { scale: [1, 1.06, 1] } : {}}
          transition={{ duration: 1, repeat: low ? Infinity : 0 }}
          className={cn("flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-lg font-bold tabular-nums", low ? "bg-rose/20 text-rose" : "bg-fg/5")}
          role="timer"
          aria-label={`Time left ${formatClock(left)}`}
        >
          <Clock className="size-5" /> {formatClock(left)}
        </motion.div>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={submitting}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#00c2ff] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Submit test
        </button>
      </div>

      {/* Section tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {p.sections.map((s, si) => {
          const first = flat.findIndex((f) => f.si === si);
          const on = current.si === si;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => !on && leaveTo(first)}
              className={cn("relative shrink-0 rounded-xl px-4 py-2 text-sm font-semibold", on ? "text-white" : "glass text-muted hover:text-fg")}
            >
              {on && <motion.span layoutId="section-tab" className="absolute inset-0 rounded-xl bg-fg" />}
              <span className={cn("relative", on && "text-bg")}>
                {s.title} <span className="opacity-60">({s.questions.length})</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        {/* Question */}
        <div className="glass min-w-0 rounded-[24px] p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-display text-lg font-bold">Question {pos + 1}</span>
            <span className="text-muted">of {flat.length}</span>
            <span className="ml-auto rounded-full bg-teal/15 px-2.5 py-0.5 text-xs font-bold text-teal">+{q.marks}</span>
            {q.negative > 0 && <span className="rounded-full bg-rose/15 px-2.5 py-0.5 text-xs font-bold text-rose">−{q.negative}</span>}
            <span className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">{q.type === "single" ? "Single correct" : q.type === "multiple" ? "One or more correct" : "Numeric answer"}</span>
          </div>

          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={q.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
              <p className="mt-5 text-lg leading-relaxed whitespace-pre-wrap">{q.text}</p>
              {q.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={q.image} alt="" className="mt-4 max-h-72 rounded-xl ring-1 ring-line" />
              )}

              {q.type === "numeric" ? (
                <div className="mt-6 max-w-xs">
                  <label htmlFor={`num-${q.id}`} className="text-sm font-semibold">
                    Your answer
                  </label>
                  <input
                    id={`num-${q.id}`}
                    inputMode="decimal"
                    value={numericText[q.id] ?? ""}
                    onChange={(e) => {
                      const text = e.target.value.replace(/[^\d.\-]/g, "").slice(0, 20);
                      setNumericText((t) => ({ ...t, [q.id]: text }));
                      const n = text === "" || text === "-" || text === "." ? null : Number(text);
                      setAnswer({ selected: [], value: n !== null && Number.isFinite(n) ? n : null });
                    }}
                    placeholder="Type a number"
                    className="mt-1.5 w-full rounded-xl border border-line bg-card px-4 py-3 font-mono text-lg outline-none focus:border-primary"
                  />
                </div>
              ) : (
                <ul className="mt-6 space-y-3" role={q.type === "single" ? "radiogroup" : "group"} aria-label="Options">
                  {q.options.map((o, i) => {
                    const on = ans.selected.includes(o.id);
                    return (
                      <li key={o.id}>
                        <button
                          type="button"
                          role={q.type === "single" ? "radio" : "checkbox"}
                          aria-checked={on}
                          onClick={() => toggle(o.id)}
                          className={cn(
                            "flex w-full items-center gap-4 rounded-2xl border px-4 py-3.5 text-left transition-all",
                            on ? "border-primary bg-primary/10 shadow-[0_8px_30px_-12px_var(--glow)]" : "border-line hover:border-primary/50 hover:bg-fg/[0.03]",
                          )}
                        >
                          <span className={cn("grid size-8 shrink-0 place-items-center font-bold", q.type === "single" ? "rounded-full" : "rounded-lg", on ? "bg-primary text-white" : "bg-fg/5 text-muted")}>
                            {on ? <Check className="size-4" /> : String.fromCharCode(65 + i)}
                          </span>
                          <span>{o.text}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </motion.div>
          </AnimatePresence>

          {saveError && (
            <p role="status" className="mt-5 flex items-center gap-2 rounded-xl border border-saffron/40 bg-saffron/10 p-3 text-sm">
              <CircleAlert className="size-4 shrink-0 text-saffron" /> {saveError}
            </p>
          )}

          <div className="mt-7 flex flex-wrap gap-2 border-t border-line pt-5">
            <button type="button" onClick={() => leaveTo(pos + 1, { mark: true })} className="flex items-center gap-1.5 rounded-xl bg-[#8b5cf6]/15 px-4 py-2.5 text-sm font-semibold text-[#a78bfa]">
              <Bookmark className="size-4" /> Mark for review & next
            </button>
            <button
              type="button"
              onClick={() => {
                setAnswer(empty);
                setNumericText((t) => ({ ...t, [q.id]: "" }));
              }}
              className="flex items-center gap-1.5 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold hover:bg-fg/5"
            >
              <Eraser className="size-4" /> Clear
            </button>
            <div className="ml-auto flex gap-2">
              <button type="button" disabled={pos === 0} onClick={() => leaveTo(pos - 1)} className="flex items-center gap-1 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold disabled:opacity-30">
                <ChevronLeft className="size-4" /> Previous
              </button>
              <button
                type="button"
                onClick={() => (pos === flat.length - 1 ? (leaveTo(pos, { mark: false }), setConfirmOpen(true)) : leaveTo(pos + 1, { mark: false }))}
                className="flex items-center gap-1 rounded-xl bg-fg px-4 py-2.5 text-sm font-semibold text-bg"
              >
                {pos === flat.length - 1 ? "Save & finish" : "Save & next"} <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Palette */}
        <aside className="glass h-fit rounded-[24px] p-5 lg:sticky lg:top-44">
          {p.sections.map((s, si) => (
            <div key={s.id} className="mb-4">
              <p className="mb-2 text-xs font-bold tracking-wider text-muted uppercase">{s.title}</p>
              <div className="grid grid-cols-5 gap-2">
                {flat.map((f, i) =>
                  f.si !== si ? null : (
                    <motion.button
                      key={f.q.id}
                      type="button"
                      layout
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => i !== pos && leaveTo(i)}
                      aria-label={`Question ${i + 1}: ${STATUS_LABEL[statusOf(f.q)]}`}
                      aria-current={i === pos ? "step" : undefined}
                      className={cn("grid aspect-square place-items-center rounded-xl text-sm font-bold transition-colors", STATUS_STYLE[statusOf(f.q)], i === pos && "outline-2 outline-offset-2 outline-primary")}
                    >
                      {i + 1}
                    </motion.button>
                  ),
                )}
              </div>
            </div>
          ))}
          <ul className="mt-4 space-y-1.5 border-t border-line pt-4 text-xs">
            {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
              <li key={s} className="flex items-center gap-2">
                <span className={cn("grid size-5 place-items-center rounded-md text-[10px] font-bold", STATUS_STYLE[s])}>{counts[s]}</span>
                <span className="text-muted">{STATUS_LABEL[s]}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <AnimatePresence>
        {confirmOpen && (
          <motion.div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="Submit test">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="relative w-full max-w-md rounded-[28px] bg-card-solid p-7 ring-1 ring-line">
              <button type="button" onClick={() => setConfirmOpen(false)} className="absolute top-4 right-4 text-muted hover:text-fg" aria-label="Close">
                <X className="size-5" />
              </button>
              <h2 className="font-display text-2xl font-bold">Submit your test?</h2>
              <p className="mt-1 text-sm text-muted">You can&apos;t change answers after submitting. {formatClock(left)} left on the clock.</p>
              <ul className="mt-5 grid grid-cols-2 gap-2 text-sm">
                {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                  <li key={s} className="flex items-center gap-2 rounded-xl bg-fg/[0.04] p-2.5">
                    <span className={cn("grid size-7 place-items-center rounded-lg text-xs font-bold", STATUS_STYLE[s])}>{counts[s]}</span>
                    <span className="text-xs">{STATUS_LABEL[s]}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex gap-2">
                <button type="button" onClick={() => setConfirmOpen(false)} className="flex-1 rounded-xl border border-line py-3 text-sm font-semibold">
                  Keep going
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void submit("manual")}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#00c2ff] py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Submit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
