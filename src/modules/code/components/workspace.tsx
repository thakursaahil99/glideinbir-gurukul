"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronLeft, Clock, Cpu, FileCode2, History, Loader2, MessageSquare, Play, RotateCcw, Send, Sparkles, Trash2, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { rpc } from "@/lib/rpc";
import { cn } from "@/lib/utils";
import { DEFAULT_STARTER, LANG_INFO, overall, VERDICT_INFO } from "../logic";
import type { PublicProblem, RunCase } from "../service";
import { LANGS, type Comment, type Lang, type Submission } from "../types";
import { DifficultyBadge, GRADIENT, Markdown, VerdictBadge } from "./bits";

const CodeEditor = dynamic(() => import("./code-editor").then((m) => m.CodeEditor), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center gap-2 text-sm text-muted">
      <Loader2 className="size-4 animate-spin" /> Loading editor…
    </div>
  ),
});

type LeftTab = "description" | "submissions" | "discussion";
type Output = { kind: "run"; cases: RunCase[] } | { kind: "submit"; submission: Submission } | { kind: "error"; message: string } | null;

const storeKey = (problemId: string, lang: Lang) => `gg-code:${problemId}:${lang}`;
const saveDraft = (problemId: string, lang: Lang, v: string) => {
  try {
    localStorage.setItem(storeKey(problemId, lang), v);
  } catch {}
};
const loadDraft = (problemId: string, lang: Lang) => {
  try {
    return localStorage.getItem(storeKey(problemId, lang));
  } catch {
    return null;
  }
};

export interface WorkspaceProps {
  problem: PublicProblem;
  runnable: Lang[];
  solved: boolean;
  submissions: Submission[];
  comments: Comment[];
  userId: string;
  isAdmin: boolean;
}

export function Workspace(p: WorkspaceProps) {
  const { problem } = p;
  const starter = useCallback((l: Lang) => problem.starter[l] || DEFAULT_STARTER[l], [problem.starter]);
  const [lang, setLang] = useState<Lang>(p.runnable[0] ?? "javascript");
  const [code, setCode] = useState(() => starter(p.runnable[0] ?? "javascript"));
  const [left, setLeft] = useState<LeftTab>("description");
  const [busy, setBusy] = useState<"run" | "submit" | null>(null);
  const [output, setOutput] = useState<Output>(null);
  const [consoleTab, setConsoleTab] = useState<"tests" | "result">("tests");
  const [custom, setCustom] = useState<string | null>(null);
  const [activeCase, setActiveCase] = useState(0);
  const [subs, setSubs] = useState(p.submissions);
  const [solved, setSolved] = useState(p.solved);
  const [celebrate, setCelebrate] = useState(false);

  // Restore this browser's draft for the language after hydration.
  useEffect(() => {
    const saved = loadDraft(problem.id, lang);
    if (saved !== null) setCode(saved);
  }, [problem.id, lang]);

  const edit = (v: string) => {
    setCode(v);
    saveDraft(problem.id, lang, v);
  };

  const switchLang = (l: Lang) => {
    setLang(l);
    setCode(loadDraft(problem.id, l) ?? starter(l));
  };

  const run = async () => {
    if (busy) return;
    setBusy("run");
    setConsoleTab("result");
    try {
      const res = await rpc("code.run", problem.id, { lang, code, customInput: custom });
      setOutput(res.ok ? { kind: "run", cases: res.cases } : { kind: "error", message: res.error });
      setActiveCase(0);
    } catch (e) {
      setOutput({ kind: "error", message: e instanceof Error ? e.message : "Something went wrong" });
    }
    setBusy(null);
  };

  const submit = async () => {
    if (busy) return;
    setBusy("submit");
    setConsoleTab("result");
    try {
      const res = await rpc("code.submit", problem.id, { lang, code });
      if (res.ok) {
        setOutput({ kind: "submit", submission: res.submission });
        setSubs((s) => [res.submission, ...s]);
        if (res.submission.verdict === "accepted") {
          setSolved(true);
          setCelebrate(true);
          setTimeout(() => setCelebrate(false), 2600);
        }
      } else setOutput({ kind: "error", message: res.error });
    } catch (e) {
      setOutput({ kind: "error", message: e instanceof Error ? e.message : "Something went wrong" });
    }
    setBusy(null);
  };

  const canRun = p.runnable.includes(lang);

  return (
    <div className="grid gap-4 xl:h-[calc(100svh-7.5rem)] xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Left: problem */}
      <section className="glass flex min-h-0 flex-col overflow-hidden rounded-[24px]">
        <div className="flex items-center gap-1 border-b border-line px-3 py-2">
          <Link href="/code" aria-label="All problems" className="mr-1 grid size-8 place-items-center rounded-lg text-muted hover:bg-fg/5 hover:text-fg">
            <ChevronLeft className="size-4" />
          </Link>
          {(
            [
              ["description", "Description", FileCode2],
              ["submissions", `Submissions${subs.length ? ` (${subs.length})` : ""}`, History],
              ["discussion", "Discussion", MessageSquare],
            ] as const
          ).map(([k, label, Icon]) => (
            <button key={k} type="button" onClick={() => setLeft(k)} className={cn("relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold", left === k ? "text-fg" : "text-muted hover:text-fg")}>
              {left === k && <motion.span layoutId="left-tab" className="absolute inset-0 rounded-lg bg-fg/[0.08]" />}
              <Icon className="relative size-4" /> <span className="relative">{label}</span>
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {left === "description" && (
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-2xl font-bold tracking-tight">{problem.title}</h1>
                {solved && (
                  <span className="flex items-center gap-1 text-sm font-semibold text-teal">
                    <CheckCircle2 className="size-4" /> Solved
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <DifficultyBadge d={problem.difficulty} className="rounded-full bg-fg/[0.06] px-2.5 py-0.5" />
                {problem.tags.map((t) => (
                  <span key={t} className="rounded-full bg-fg/[0.06] px-2.5 py-0.5 text-muted">
                    {t}
                  </span>
                ))}
                <span className="flex items-center gap-1 text-muted">
                  <Clock className="size-3.5" /> {problem.timeLimitMs / 1000}s
                </span>
                <span className="flex items-center gap-1 text-muted">
                  <Cpu className="size-3.5" /> {problem.memoryLimitMb} MB
                </span>
              </div>
              <Markdown source={problem.statement} className="mt-4" />
              {problem.samples.map((s, i) => (
                <div key={i} className="mt-5">
                  <p className="mb-2 text-sm font-bold">Example {i + 1}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <IO label="Input" text={s.input} />
                    <IO label="Output" text={s.output} />
                  </div>
                  {s.explanation && <p className="mt-2 text-sm text-muted">{s.explanation}</p>}
                </div>
              ))}
            </div>
          )}
          {left === "submissions" && (
            <Submissions
              subs={subs}
              onLoad={(s) => {
                // Save under the submission's language first: the language switch restores that draft.
                saveDraft(problem.id, s.lang, s.code);
                setLang(s.lang);
                setCode(s.code);
                setLeft("description");
              }}
            />
          )}
          {left === "discussion" && <Discussion problemId={problem.id} initial={p.comments} userId={p.userId} isAdmin={p.isAdmin} solved={solved} />}
        </div>
      </section>

      {/* Right: editor + console */}
      <section className="flex min-h-0 flex-col gap-4">
        <div className="glass relative flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-[24px]">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
            <label className="flex items-center gap-2 rounded-lg bg-fg/[0.05] px-2 ring-1 ring-line">
              <span className="sr-only">Language</span>
              <select value={lang} onChange={(e) => switchLang(e.target.value as Lang)} className="bg-transparent py-1.5 text-sm font-semibold outline-none">
                {LANGS.map((l) => (
                  <option key={l} value={l}>
                    {LANG_INFO[l].label}
                    {p.runnable.includes(l) ? "" : " (needs Judge0)"}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Reset to the starter code? Your changes for this language will be lost.")) edit(starter(lang));
              }}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted hover:bg-fg/5 hover:text-fg"
            >
              <RotateCcw className="size-3.5" /> Reset
            </button>
            <span className="ml-auto hidden text-[11px] text-muted md:inline">Ctrl+Enter run · Ctrl+Shift+Enter submit</span>
          </div>
          <div className="min-h-0 flex-1">
            <CodeEditor value={code} onChange={edit} language={LANG_INFO[lang].monaco} onRun={run} onSubmit={submit} />
          </div>
          <AnimatePresence>{celebrate && <Celebration />}</AnimatePresence>
        </div>

        <div className="glass flex max-h-[45svh] min-h-[220px] flex-col overflow-hidden rounded-[24px] xl:h-[38%] xl:max-h-none">
          <div className="flex items-center gap-1 border-b border-line px-3 py-2">
            {(
              [
                ["tests", "Testcases"],
                ["result", "Result"],
              ] as const
            ).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setConsoleTab(k)} className={cn("relative rounded-lg px-3 py-1.5 text-sm font-semibold", consoleTab === k ? "text-fg" : "text-muted hover:text-fg")}>
                {consoleTab === k && <motion.span layoutId="console-tab" className="absolute inset-0 rounded-lg bg-fg/[0.08]" />}
                <span className="relative">{label}</span>
              </button>
            ))}
            <div className="ml-auto flex gap-2">
              <button type="button" disabled={!!busy || !canRun} onClick={run} className="flex items-center gap-1.5 rounded-xl bg-fg/[0.08] px-4 py-2 text-sm font-semibold hover:bg-fg/[0.12] disabled:opacity-50">
                {busy === "run" ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Run
              </button>
              <button type="button" disabled={!!busy || !canRun} onClick={submit} className={cn("flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#5b47ff]/25 disabled:opacity-50", GRADIENT)}>
                {busy === "submit" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Submit
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {!canRun && <p className="mb-3 rounded-xl bg-saffron/10 p-3 text-sm">{LANG_INFO[lang].label} needs the Judge0 runner, which isn&apos;t set up on this server. Switch to {p.runnable.map((l) => LANG_INFO[l].label).join(", ") || "another language"} to run code.</p>}
            {consoleTab === "tests" ? (
              <TestsPanel samples={problem.samples} custom={custom} setCustom={setCustom} />
            ) : busy ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-6 text-sm text-muted">
                <motion.div className={cn("size-10 rounded-xl", GRADIENT)} animate={{ rotate: [0, 90, 180, 270, 360], borderRadius: ["12px", "50%", "12px"] }} transition={{ duration: 1.4, repeat: Infinity }} />
                {busy === "run" ? "Running your code…" : "Judging against all test cases…"}
              </div>
            ) : (
              <ResultPanel output={output} active={activeCase} setActive={setActiveCase} />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function IO({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</p>
      <pre className="max-h-48 overflow-auto rounded-xl bg-fg/[0.06] p-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap">{text || " "}</pre>
    </div>
  );
}

function TestsPanel({ samples, custom, setCustom }: { samples: PublicProblem["samples"]; custom: string | null; setCustom: (v: string | null) => void }) {
  const [i, setI] = useState(0);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {samples.map((_, j) => (
          <button key={j} type="button" disabled={custom !== null} onClick={() => setI(j)} className={cn("rounded-lg px-3 py-1 text-xs font-semibold", custom === null && i === j ? "bg-fg/[0.1]" : "text-muted hover:text-fg", "disabled:opacity-40")}>
            Case {j + 1}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-xs font-semibold">
          <input type="checkbox" checked={custom !== null} onChange={(e) => setCustom(e.target.checked ? (samples[0]?.input ?? "") : null)} className="accent-[#5b47ff]" /> Custom input
        </label>
      </div>
      {custom !== null ? (
        <textarea value={custom} onChange={(e) => setCustom(e.target.value)} rows={5} aria-label="Custom input" className="w-full rounded-xl bg-fg/[0.06] p-3 font-mono text-[13px] outline-none ring-1 ring-line focus:ring-[#5b47ff]/60" />
      ) : samples[i] ? (
        <IO label="Input" text={samples[i].input} />
      ) : (
        <p className="text-sm text-muted">This problem has no sample tests.</p>
      )}
    </div>
  );
}

function ResultPanel({ output, active, setActive }: { output: Output; active: number; setActive: (i: number) => void }) {
  if (!output) return <p className="py-6 text-center text-sm text-muted">Run your code to see the output here.</p>;
  if (output.kind === "error") return <p className="rounded-xl bg-rose/10 p-3 text-sm text-rose">{output.message}</p>;
  if (output.kind === "submit") return <SubmitResult s={output.submission} />;
  const { cases } = output;
  const sum = overall(cases.map((c) => c.result));
  const custom = cases.length === 1 && cases[0]!.expected === null;
  const c = cases[active] ?? cases[0]!;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className={cn("font-display text-xl font-bold", sum.verdict === "accepted" ? "text-teal" : VERDICT_INFO[sum.verdict].tone === "warn" ? "text-saffron" : "text-rose")}>{custom && sum.verdict === "accepted" ? "Finished" : VERDICT_INFO[sum.verdict].label}</p>
        {!custom && (
          <span className="text-sm text-muted">
            {sum.passed}/{cases.length} sample tests passed
          </span>
        )}
      </div>
      {cases.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {cases.map((x, j) => (
            <button key={j} type="button" onClick={() => setActive(j)} className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold", j === active ? "bg-fg/[0.1]" : "text-muted")}>
              <span className={cn("size-1.5 rounded-full", x.result.verdict === "accepted" ? "bg-teal" : "bg-rose")} /> Case {j + 1}
            </button>
          ))}
        </div>
      )}
      {c.result.verdict === "compile_error" ? (
        <IO label="Compiler" text={c.result.stderr} />
      ) : (
        <>
          <IO label="Input" text={c.input} />
          <div className={cn("grid gap-2", c.expected !== null && "sm:grid-cols-2")}>
            <IO label={`Your output · ${c.result.timeMs} ms`} text={c.result.stdout} />
            {c.expected !== null && <IO label="Expected" text={c.expected} />}
          </div>
          {c.result.stderr && <IO label="Errors" text={c.result.stderr} />}
        </>
      )}
    </motion.div>
  );
}

function SubmitResult({ s }: { s: Submission }) {
  const ok = s.verdict === "accepted";
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
      <div className={cn("flex flex-wrap items-center gap-4 rounded-2xl p-4", ok ? "bg-teal/10 ring-1 ring-teal/40" : "bg-rose/[0.07] ring-1 ring-rose/30")}>
        <div className="flex-1">
          <p className={cn("font-display text-2xl font-bold", ok ? "text-teal" : VERDICT_INFO[s.verdict].tone === "warn" ? "text-saffron" : "text-rose")}>{VERDICT_INFO[s.verdict].label}</p>
          <p className="text-sm text-muted">
            {s.passed}/{s.total} test cases passed{ok ? ` · slowest ${s.timeMs} ms` : ""}
          </p>
        </div>
        <div className="h-2 w-40 overflow-hidden rounded-full bg-fg/10">
          <motion.div className={cn("h-full", ok ? "bg-teal" : "bg-rose")} initial={{ width: 0 }} animate={{ width: `${(s.passed / Math.max(1, s.total)) * 100}%` }} transition={{ duration: 0.8 }} />
        </div>
      </div>
      {s.failed && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">
            Failed on test {s.failed.index}
            {s.failed.sample ? " (a sample)" : " (hidden test)"}
          </p>
          {s.failed.message && <IO label={s.verdict === "compile_error" ? "Compiler" : "Errors"} text={s.failed.message} />}
          {s.failed.sample && s.failed.input !== undefined && (
            <>
              <IO label="Input" text={s.failed.input} />
              <div className="grid gap-2 sm:grid-cols-2">
                <IO label="Your output" text={s.failed.got ?? ""} />
                <IO label="Expected" text={s.failed.expected ?? ""} />
              </div>
            </>
          )}
          {!s.failed.sample && !s.failed.message && <p className="text-sm text-muted">Hidden tests stay hidden. Think about edge cases: empty-ish inputs, large values, duplicates, performance.</p>}
        </div>
      )}
    </motion.div>
  );
}

function Celebration() {
  const bits = Array.from({ length: 28 });
  return (
    <motion.div className="pointer-events-none absolute inset-0 z-10 grid place-items-center overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {bits.map((_, i) => (
        <motion.span
          key={i}
          className="absolute size-2 rounded-sm"
          style={{ background: ["#2ee6c5", "#5b47ff", "#ffb800", "#ff4d6d"][i % 4] }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={{ x: Math.cos((i / bits.length) * Math.PI * 2) * (140 + (i % 3) * 60), y: Math.sin((i / bits.length) * Math.PI * 2) * (110 + (i % 4) * 40), rotate: 360, opacity: 0 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      ))}
      <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }} className="flex items-center gap-2 rounded-2xl bg-teal px-5 py-3 font-display text-xl font-bold text-black shadow-2xl">
        <Sparkles className="size-5" /> Accepted!
      </motion.div>
    </motion.div>
  );
}

function Submissions({ subs, onLoad }: { subs: Submission[]; onLoad: (s: Submission) => void }) {
  const [open, setOpen] = useState<Submission | null>(null);
  if (!subs.length) return <p className="py-8 text-center text-sm text-muted">No submissions yet. Submit your solution to see it here.</p>;
  return (
    <>
      <ul className="divide-y divide-line">
        {subs.map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => setOpen(s)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-fg/[0.03]">
              <VerdictBadge v={s.verdict} />
              <span className="text-sm text-muted">{LANG_INFO[s.lang].label}</span>
              <span className="text-xs text-muted tabular-nums">
                {s.passed}/{s.total}
              </span>
              <span className="ml-auto text-xs text-muted">{new Date(s.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
            </button>
          </li>
        ))}
      </ul>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)}>
            <motion.div role="dialog" aria-modal="true" aria-label="Submission" initial={{ y: 20, scale: 0.97 }} animate={{ y: 0, scale: 1 }} onClick={(e) => e.stopPropagation()} className="flex max-h-[85svh] w-full max-w-2xl flex-col rounded-[24px] bg-card-solid ring-1 ring-line">
              <div className="flex items-center gap-3 border-b border-line p-4">
                <VerdictBadge v={open.verdict} />
                <span className="text-sm text-muted">
                  {LANG_INFO[open.lang].label} · {open.passed}/{open.total}
                </span>
                <button type="button" onClick={() => setOpen(null)} aria-label="Close" className="ml-auto grid size-8 place-items-center rounded-full hover:bg-fg/5">
                  <X className="size-4" />
                </button>
              </div>
              <pre className="min-h-0 flex-1 overflow-auto p-4 font-mono text-[13px]">{open.code}</pre>
              <div className="border-t border-line p-3 text-right">
                <button
                  type="button"
                  onClick={() => {
                    onLoad(open);
                    setOpen(null);
                  }}
                  className={cn("rounded-xl px-4 py-2 text-sm font-semibold text-white", GRADIENT)}
                >
                  Load into editor
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Discussion({ problemId, initial, userId, isAdmin, solved }: { problemId: string; initial: Comment[]; userId: string; isAdmin: boolean; solved: boolean }) {
  const [comments, setComments] = useState(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      {!solved && <p className="rounded-xl bg-[#5b47ff]/10 p-3 text-xs text-muted">Heads up: comments may contain hints or full solutions.</p>}
      <div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={2000} placeholder="Ask a question or share an approach (no full solutions please)…" aria-label="Your comment" className="w-full rounded-xl bg-fg/[0.05] p-3 text-sm outline-none ring-1 ring-line focus:ring-[#5b47ff]/60" />
        {err && <p className="mt-1 text-sm text-rose">{err}</p>}
        <button
          type="button"
          disabled={busy || text.trim().length < 2}
          onClick={async () => {
            setBusy(true);
            setErr(null);
            try {
              const res = await rpc("code.comment", problemId, text);
              if (res.ok) {
                setComments((c) => [...c, { id: res.id, problemId, userId, userName: "You", text: text.trim(), createdAt: new Date().toISOString() }]);
                setText("");
              } else setErr(res.error);
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Something went wrong");
            }
            setBusy(false);
          }}
          className={cn("mt-2 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50", GRADIENT)}
        >
          {busy && <Loader2 className="size-4 animate-spin" />} Post
        </button>
      </div>
      {comments.length === 0 ? (
        <p className="text-sm text-muted">No discussion yet. Start one!</p>
      ) : (
        <ul className="space-y-3">
          {[...comments].reverse().map((c) => (
            <li key={c.id} className="rounded-2xl bg-fg/[0.04] p-3">
              <div className="flex items-center gap-2 text-xs">
                <b>{c.userName}</b>
                <span className="text-muted">{new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                {(c.userId === userId || isAdmin) && (
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await rpc("code.deleteComment", c.id);
                      if (res.ok) setComments((all) => all.filter((x) => x.id !== c.id));
                    }}
                    aria-label="Delete comment"
                    className="ml-auto text-muted hover:text-rose"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm whitespace-pre-wrap">{c.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
