"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowLeft, ArrowUp, Check, ChevronDown, CircleAlert, Download, Eye, FileUp, Loader2, Plus, Rocket, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AreaField, ColorField, LinesField, Select, TextField } from "@/components/admin/fields";
import { rpc } from "@/lib/rpc";
import { cn, formatPaise } from "@/lib/utils";
import { CSV_TEMPLATE, importQuestionsCsv, questionProblems } from "../logic";
import type { TestDraft } from "../schema";
import { EXAMS, QUESTION_TYPES, type Question, type QuestionType, type TestSection, type TestStatus } from "../types";
import { TestCover } from "./bits";

export interface AttemptRow {
  id: string;
  name: string;
  status: "in_progress" | "submitted";
  score: number | null;
  maxScore: number;
  startedAt: string;
}

export interface TestEditorProps {
  id: string;
  slug: string;
  status: TestStatus;
  initial: TestDraft;
  attempts: AttemptRow[];
}

const PALETTES: [string, string][] = [
  ["#5b47ff", "#00c2ff"],
  ["#c04dff", "#ff4da6"],
  ["#ff8a00", "#ff4d6d"],
  ["#00b89c", "#7ddc5a"],
  ["#ffb800", "#ff5e3a"],
  ["#15132b", "#5b47ff"],
];

type Tab = "details" | "questions" | "attempts";
type Msg = { ok: boolean; text: string; problems?: string[] } | null;
type SectionsUpdate = (fn: (all: TestSection[]) => TestSection[]) => void;

const move = <T,>(arr: T[], i: number, dir: -1 | 1) => {
  const j = i + dir;
  if (i < 0 || j < 0 || j >= arr.length) return arr;
  const copy = arr.slice();
  [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  return copy;
};

const newQuestion = (type: QuestionType = "single"): Question => {
  const options = type === "numeric" ? [] : ["", "", "", ""].map(() => ({ id: crypto.randomUUID(), text: "" }));
  return { id: crypto.randomUUID(), type, text: "", image: null, options, correct: [], numeric: type === "numeric" ? { value: 0, tolerance: 0 } : null, marks: 4, negative: type === "numeric" ? 0 : 1, topic: "", explanation: "" };
};

export function TestEditor({ id, slug, status: initialStatus, initial, attempts }: TestEditorProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [draft, setDraft] = useState<TestDraft>(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [tab, setTab] = useState<Tab>("details");
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(draft) !== saved;
  const total = draft.sections.reduce((s, x) => s + x.questions.length, 0);

  const patch = (p: Partial<TestDraft>) => setDraft((d) => ({ ...d, ...p }));
  const updateSections: SectionsUpdate = (fn) => setDraft((d) => ({ ...d, sections: fn(d.sections) }));

  const run = async (job: () => Promise<void>) => {
    setBusy(true);
    try {
      await job();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong" });
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    const snapshot = draft;
    const res = await rpc("testsTeach.save", id, snapshot);
    if (!res.ok) {
      setMsg({ ok: false, text: res.error ?? "Couldn't save", problems: res.problems });
      return false;
    }
    setSaved(JSON.stringify(snapshot));
    return true;
  };

  const onSave = () => run(async () => void ((await save()) && setMsg({ ok: true, text: "Saved" })));
  const onStatus = (next: "published" | "draft") =>
    run(async () => {
      if (dirty && !(await save())) return;
      const res = await rpc("testsTeach.status", id, next);
      setMsg(res.ok ? { ok: true, text: next === "published" ? "Published! It's live in Test Series." : "Unpublished." } : { ok: false, text: res.error ?? "Failed", problems: res.problems });
      if (res.ok) setStatus(next);
    });
  const onDelete = () => {
    if (!confirm("Delete this test? This can't be undone.")) return;
    void run(async () => {
      const res = await rpc("testsTeach.delete", id);
      if (res.ok) router.push("/tests/teach");
      else setMsg({ ok: false, text: res.error ?? "Couldn't delete" });
    });
  };

  return (
    <div className="mx-auto max-w-5xl pb-28">
      <Link href="/tests/teach" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> All my tests
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="min-w-0 flex-1 truncate font-display text-3xl font-bold tracking-tight sm:text-4xl">{draft.title || "Untitled test"}</h1>
        <span className={cn("rounded-full px-3 py-1 text-xs font-bold capitalize", status === "published" ? "bg-teal/15 text-teal" : "bg-saffron/15 text-saffron")}>{status}</span>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="glass inline-flex rounded-2xl p-1">
          {(["details", "questions", "attempts"] as Tab[]).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={cn("relative rounded-xl px-4 py-2 text-sm font-semibold capitalize", tab === t ? "text-bg" : "text-muted hover:text-fg")}>
              {tab === t && <motion.span layoutId="test-editor-tab" className="absolute inset-0 rounded-xl bg-fg" />}
              <span className="relative">
                {t}
                {t === "questions" && ` (${total})`}
                {t === "attempts" && ` (${attempts.length})`}
              </span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Link href={`/tests/${slug}`} className="glass flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold">
            <Eye className="size-4" /> Preview
          </Link>
          <button type="button" onClick={onDelete} className="flex items-center gap-1.5 rounded-xl border border-rose/40 px-3.5 py-2 text-sm font-semibold text-rose hover:bg-rose/10">
            <Trash2 className="size-4" /> Delete
          </button>
        </div>
      </div>

      <AnimatePresence>
        {msg && (
          <motion.div role="status" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={cn("mt-5 rounded-2xl border p-4 text-sm", msg.ok ? "border-teal/40 bg-teal/10" : "border-rose/40 bg-rose/10")}>
            <p className="flex items-center gap-2 font-semibold">
              {msg.ok ? <Check className="size-4 text-teal" /> : <CircleAlert className="size-4 text-rose" />} {msg.text}
            </p>
            {msg.problems && (
              <ul className="mt-2 list-disc space-y-0.5 pl-10">
                {msg.problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6">
        {tab === "details" && <Details draft={draft} patch={patch} />}
        {tab === "questions" && <Questions sections={draft.sections} update={updateSections} onImported={(n, errs) => setMsg(errs.length ? { ok: n > 0, text: `Imported ${n} question${n === 1 ? "" : "s"}; ${errs.length} line${errs.length === 1 ? "" : "s"} skipped`, problems: errs.slice(0, 10) } : { ok: true, text: `Imported ${n} question${n === 1 ? "" : "s"}. Review and save.` })} />}
        {tab === "attempts" && <Attempts rows={attempts} slug={slug} />}
      </div>

      <div className="fixed inset-x-3 bottom-3 z-40 lg:left-[300px]">
        <div className="mx-auto flex max-w-5xl items-center gap-3 rounded-2xl border border-line bg-card-solid/95 p-3 shadow-2xl backdrop-blur">
          <p className="flex-1 text-sm text-muted">{dirty ? "You have unsaved changes" : "All changes saved"}</p>
          {dirty && (
            <button type="button" onClick={() => setDraft(JSON.parse(saved))} className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:text-fg">
              <Undo2 className="size-4" /> Discard
            </button>
          )}
          <button type="button" onClick={onSave} disabled={busy || !dirty} className="flex items-center gap-1.5 rounded-xl bg-fg px-4 py-2.5 text-sm font-semibold text-bg disabled:opacity-40">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Save
          </button>
          {status === "published" ? (
            <button type="button" onClick={() => onStatus("draft")} disabled={busy} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold hover:bg-fg/5">
              Unpublish
            </button>
          ) : (
            <button type="button" onClick={() => onStatus("published")} disabled={busy} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-[#00c2ff] px-4 py-2.5 text-sm font-semibold text-white">
              <Rocket className="size-4" /> Publish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Details ---------------- */

function Details({ draft, patch }: { draft: TestDraft; patch: (p: Partial<TestDraft>) => void }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <div className="glass grid gap-4 rounded-[24px] p-5 sm:p-6">
        <TextField label="Title" value={draft.title} onChange={(title) => patch({ title })} maxLength={120} />
        <AreaField label="Description" rows={3} value={draft.description} onChange={(description) => patch({ description })} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Exam" value={draft.exam} options={EXAMS} onChange={(exam) => patch({ exam })} />
          <TextField label="Duration (minutes)" type="number" min={1} max={600} value={String(draft.durationMin)} onChange={(v) => patch({ durationMin: Math.max(1, Math.floor(Number(v) || 1)) })} />
          <TextField label="Price (₹)" hint="0 = free" type="number" min={0} value={String(draft.priceRupees)} onChange={(v) => patch({ priceRupees: Math.max(0, Math.floor(Number(v) || 0)) })} />
        </div>
        <LinesField label="Instructions" hint="One per line, shown before the test starts" value={draft.instructions} onChange={(instructions) => patch({ instructions: instructions.slice(0, 15) })} />
      </div>
      <div className="space-y-4">
        <div className="glass overflow-hidden rounded-[24px]">
          <TestCover colors={draft.colors} exam={draft.exam} big className="aspect-video" />
          <div className="p-4">
            <p className="line-clamp-2 font-display font-bold">{draft.title || "Untitled test"}</p>
            <p className="mt-1 text-sm text-muted">
              {draft.durationMin} min · {draft.priceRupees ? formatPaise(draft.priceRupees * 100) : "Free"}
            </p>
          </div>
        </div>
        <div className="glass grid gap-3 rounded-[24px] p-5">
          <p className="text-sm font-semibold">Cover colours</p>
          <div className="flex flex-wrap gap-2">
            {PALETTES.map((p) => (
              <button
                key={p.join()}
                type="button"
                aria-label={`Use ${p.join(" and ")}`}
                onClick={() => patch({ colors: p })}
                className={cn("size-9 rounded-xl ring-offset-2 ring-offset-bg transition-transform hover:scale-110", draft.colors.join() === p.join() && "ring-2 ring-fg")}
                style={{ background: `linear-gradient(135deg, ${p[0]}, ${p[1]})` }}
              />
            ))}
          </div>
          <ColorField label="From" value={draft.colors[0]} onChange={(v) => patch({ colors: [v, draft.colors[1]] })} />
          <ColorField label="To" value={draft.colors[1]} onChange={(v) => patch({ colors: [draft.colors[0], v] })} />
        </div>
      </div>
    </div>
  );
}

/* ---------------- Questions ---------------- */

function Questions({ sections, update, onImported }: { sections: TestSection[]; update: SectionsUpdate; onImported: (count: number, errors: string[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const editSection = (sid: string, fn: (s: TestSection) => TestSection) => update((all) => all.map((s) => (s.id === sid ? fn(s) : s)));
  const editQuestions = (sid: string, fn: (qs: Question[]) => Question[]) => editSection(sid, (s) => ({ ...s, questions: fn(s.questions) }));

  const importText = (text: string) => {
    const res = importQuestionsCsv(text, () => crypto.randomUUID());
    const count = res.sections.reduce((n, s) => n + s.questions.length, 0);
    if (count) {
      // Ids for new sections are made outside the updater so a re-run (Strict Mode) stays identical.
      const newIds = res.sections.map(() => crypto.randomUUID());
      update((all) => {
        // Pure: never mutate `all` (React may call this updater twice).
        let next = [...all];
        res.sections.forEach((imp, i) => {
          const at = next.findIndex((s) => s.title.trim().toLowerCase() === imp.title.trim().toLowerCase());
          if (at >= 0) next = next.map((s, j) => (j === at ? { ...s, questions: [...s.questions, ...imp.questions] } : s));
          else next = [...next, { id: newIds[i]!, title: imp.title.slice(0, 80), questions: imp.questions }];
        });
        // Drop empty sections (like the default "Section 1" of a new test).
        return next.filter((s) => s.questions.length > 0);
      });
    }
    onImported(count, res.errors);
  };

  return (
    <div className="space-y-4">
      <div className="glass flex flex-wrap items-center gap-3 rounded-[24px] p-4">
        <FileUp className="size-5 text-primary" />
        <p className="flex-1 text-sm">
          <b>Bulk import:</b> upload a CSV with columns section, type, question, option_a–d, correct, marks, negative, topic, explanation.
        </p>
        <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`} download="glideinbir-test-template.csv" className="flex items-center gap-1.5 rounded-xl border border-line px-3.5 py-2 text-sm font-semibold hover:bg-fg/5">
          <Download className="size-4" /> Template
        </a>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) importText(await f.text());
          }}
        />
        <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-xl bg-fg px-3.5 py-2 text-sm font-semibold text-bg">
          <FileUp className="size-4" /> Import CSV
        </button>
      </div>

      {sections.map((s, si) => (
        <motion.div key={s.id} layout className="glass rounded-[24px] p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted">Section {si + 1}</span>
            <label className="sr-only" htmlFor={`tsec-${s.id}`}>
              Section title
            </label>
            <input
              id={`tsec-${s.id}`}
              value={s.title}
              onChange={(e) => {
                const title = e.target.value;
                editSection(s.id, (x) => ({ ...x, title }));
              }}
              maxLength={80}
              className="min-w-0 flex-1 rounded-xl border border-transparent bg-transparent px-2 py-1.5 font-display text-lg font-bold outline-none hover:border-line focus:border-primary"
            />
            <span className="text-xs text-muted">{s.questions.reduce((n, q) => n + q.marks, 0)} marks</span>
            <IconBtn label="Move section up" disabled={si === 0} onClick={() => update((all) => move(all, all.findIndex((x) => x.id === s.id), -1))}>
              <ArrowUp className="size-4" />
            </IconBtn>
            <IconBtn label="Move section down" disabled={si === sections.length - 1} onClick={() => update((all) => move(all, all.findIndex((x) => x.id === s.id), 1))}>
              <ArrowDown className="size-4" />
            </IconBtn>
            <IconBtn label="Delete section" danger onClick={() => (!s.questions.length || confirm(`Delete "${s.title}" and its ${s.questions.length} questions?`)) && update((all) => all.filter((x) => x.id !== s.id))}>
              <Trash2 className="size-4" />
            </IconBtn>
          </div>
          <ul className="mt-3 space-y-2">
            {s.questions.map((q, qi) => (
              <QuestionRow
                key={q.id}
                q={q}
                index={qi}
                count={s.questions.length}
                onPatch={(p) => editQuestions(s.id, (qs) => qs.map((x) => (x.id === q.id ? { ...x, ...p } : x)))}
                onMove={(dir) => editQuestions(s.id, (qs) => move(qs, qs.findIndex((x) => x.id === q.id), dir))}
                onDelete={() => editQuestions(s.id, (qs) => qs.filter((x) => x.id !== q.id))}
              />
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            {QUESTION_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => editQuestions(s.id, (qs) => [...qs, newQuestion(t)])}
                className="flex items-center gap-1.5 rounded-xl border border-dashed border-line px-3.5 py-2 text-sm font-semibold text-muted hover:border-primary hover:text-fg"
              >
                <Plus className="size-4" /> {t === "single" ? "Single choice" : t === "multiple" ? "Multiple choice" : "Numeric"}
              </button>
            ))}
          </div>
        </motion.div>
      ))}
      <button
        type="button"
        onClick={() => update((all) => [...all, { id: crypto.randomUUID(), title: `Section ${all.length + 1}`, questions: [] }])}
        className="flex w-full items-center justify-center gap-2 rounded-[24px] border-2 border-dashed border-line py-5 font-semibold text-muted hover:border-primary hover:text-fg"
      >
        <Plus className="size-5" /> Add section
      </button>
    </div>
  );
}

function QuestionRow({ q, index, count, onPatch, onMove, onDelete }: { q: Question; index: number; count: number; onPatch: (p: Partial<Question>) => void; onMove: (d: -1 | 1) => void; onDelete: () => void }) {
  const [open, setOpen] = useState(!q.text);
  const problem = questionProblems(q);
  const toggleCorrect = (oid: string) => onPatch({ correct: q.type === "single" ? [oid] : q.correct.includes(oid) ? q.correct.filter((x) => x !== oid) : [...q.correct, oid] });

  return (
    <li className="rounded-2xl border border-line bg-card">
      <div className="flex items-center gap-2 p-2.5">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Edit question" className="grid size-8 place-items-center rounded-lg hover:bg-fg/5">
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>
        <span className="text-xs text-muted tabular-nums">Q{index + 1}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{q.text || <span className="text-muted">New question</span>}</span>
        {problem ? (
          <span className="hidden rounded-full bg-rose/15 px-2 py-0.5 text-[10px] font-bold text-rose sm:inline" title={problem}>
            Incomplete
          </span>
        ) : (
          <span className="hidden rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-bold text-teal sm:inline">+{q.marks}{q.negative ? ` / −${q.negative}` : ""}</span>
        )}
        <IconBtn label="Move up" disabled={index === 0} onClick={() => onMove(-1)}>
          <ArrowUp className="size-3.5" />
        </IconBtn>
        <IconBtn label="Move down" disabled={index === count - 1} onClick={() => onMove(1)}>
          <ArrowDown className="size-3.5" />
        </IconBtn>
        <IconBtn label="Delete question" danger onClick={onDelete}>
          <Trash2 className="size-3.5" />
        </IconBtn>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="grid gap-4 border-t border-line p-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                <AreaField label="Question" rows={3} value={q.text} onChange={(text) => onPatch({ text })} />
                <Select
                  label="Type"
                  value={q.type}
                  options={QUESTION_TYPES}
                  onChange={(type) =>
                    onPatch(
                      type === "numeric"
                        ? { type, options: [], correct: [], numeric: q.numeric ?? { value: 0, tolerance: 0 } }
                        : { type, numeric: null, options: q.options.length ? q.options : newQuestion(type).options, correct: type === "single" ? q.correct.slice(0, 1) : q.correct },
                    )
                  }
                />
              </div>

              {q.type === "numeric" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField label="Correct value" type="number" value={String(q.numeric?.value ?? 0)} onChange={(v) => onPatch({ numeric: { value: Number(v) || 0, tolerance: q.numeric?.tolerance ?? 0 } })} />
                  <TextField label="Tolerance (±)" hint="0 = exact" type="number" min={0} value={String(q.numeric?.tolerance ?? 0)} onChange={(v) => onPatch({ numeric: { value: q.numeric?.value ?? 0, tolerance: Math.max(0, Number(v) || 0) } })} />
                </div>
              ) : (
                <div>
                  <p className="mb-1.5 text-sm font-semibold">Options <span className="font-normal text-muted">(tick the correct {q.type === "single" ? "one" : "ones"})</span></p>
                  <ul className="space-y-2">
                    {q.options.map((o, i) => {
                      const on = q.correct.includes(o.id);
                      return (
                        <li key={o.id} className="flex items-center gap-2">
                          <button
                            type="button"
                            role={q.type === "single" ? "radio" : "checkbox"}
                            aria-checked={on}
                            aria-label={`Mark option ${String.fromCharCode(65 + i)} correct`}
                            onClick={() => toggleCorrect(o.id)}
                            className={cn("grid size-9 shrink-0 place-items-center font-bold", q.type === "single" ? "rounded-full" : "rounded-lg", on ? "bg-teal text-black" : "bg-fg/5 text-muted")}
                          >
                            {on ? <Check className="size-4" /> : String.fromCharCode(65 + i)}
                          </button>
                          <input
                            aria-label={`Option ${String.fromCharCode(65 + i)}`}
                            value={o.text}
                            onChange={(e) => {
                              const text = e.target.value;
                              onPatch({ options: q.options.map((x) => (x.id === o.id ? { ...x, text } : x)) });
                            }}
                            maxLength={500}
                            className="min-w-0 flex-1 rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                          />
                          <IconBtn label="Remove option" danger disabled={q.options.length <= 2} onClick={() => onPatch({ options: q.options.filter((x) => x.id !== o.id), correct: q.correct.filter((x) => x !== o.id) })}>
                            <Trash2 className="size-3.5" />
                          </IconBtn>
                        </li>
                      );
                    })}
                  </ul>
                  {q.options.length < 8 && (
                    <button type="button" onClick={() => onPatch({ options: [...q.options, { id: crypto.randomUUID(), text: "" }] })} className="mt-2 text-sm font-semibold text-primary hover:underline">
                      + Add option
                    </button>
                  )}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-3">
                <TextField label="Marks" type="number" min={0} value={String(q.marks)} onChange={(v) => onPatch({ marks: Math.max(0, Number(v) || 0) })} />
                <TextField label="Negative" hint="for a wrong answer" type="number" min={0} value={String(q.negative)} onChange={(v) => onPatch({ negative: Math.max(0, Number(v) || 0) })} />
                <TextField label="Topic" value={q.topic} onChange={(topic) => onPatch({ topic })} maxLength={60} />
              </div>
              <TextField label="Image URL" hint="Optional, https" value={q.image ?? ""} onChange={(v) => onPatch({ image: v.trim() ? v.trim() : null })} />
              <AreaField label="Explanation" rows={2} value={q.explanation} onChange={(explanation) => onPatch({ explanation })} />
              {problem && <p className="text-xs text-rose">This question {problem}.</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function Attempts({ rows, slug }: { rows: AttemptRow[]; slug: string }) {
  if (!rows.length)
    return (
      <div className="glass rounded-[24px] px-6 py-14 text-center">
        <p className="font-display text-xl font-bold">No attempts yet</p>
        <p className="mt-1 text-sm text-muted">Publish the test and share its link.</p>
      </div>
    );
  return (
    <div className="glass overflow-x-auto rounded-[24px] p-5">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="text-xs text-muted uppercase">
          <tr>
            <th className="pb-3 font-semibold">Learner</th>
            <th className="pb-3 font-semibold">Started</th>
            <th className="pb-3 font-semibold">Score</th>
            <th className="pb-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {[...rows]
            .sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity))
            .map((r) => (
              <tr key={r.id}>
                <td className="py-3 font-semibold">{r.name}</td>
                <td className="py-3 text-muted">{new Date(r.startedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</td>
                <td className="py-3 tabular-nums">{r.status === "submitted" ? `${r.score}/${r.maxScore}` : <span className="text-saffron">In progress</span>}</td>
                <td className="py-3 text-right">
                  {r.status === "submitted" && (
                    <Link href={`/tests/${slug}/result/${r.id}`} className="text-sm font-semibold text-primary hover:underline">
                      View
                    </Link>
                  )}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function IconBtn({ label, danger, children, ...props }: { label: string; danger?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn("grid size-8 shrink-0 place-items-center rounded-lg text-muted disabled:opacity-25", danger ? "hover:bg-rose/10 hover:text-rose" : "hover:bg-fg/5 hover:text-fg")}
      {...props}
    >
      {children}
    </button>
  );
}
