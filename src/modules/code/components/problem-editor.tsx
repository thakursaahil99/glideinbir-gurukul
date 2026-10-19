"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Beaker, Check, ExternalLink, EyeOff, FileUp, Loader2, Plus, Rocket, Trash2, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { rpc } from "@/lib/rpc";
import { cn } from "@/lib/utils";
import { DEFAULT_STARTER, LANG_INFO, MAX_TEST_BYTES } from "../logic";
import { DIFFICULTIES, LANGS, type Difficulty, type Lang, type Problem, type TestCase } from "../types";
import { GRADIENT, Markdown } from "./bits";

const CodeEditor = dynamic(() => import("./code-editor").then((m) => m.CodeEditor), { ssr: false, loading: () => <div className="h-full animate-pulse bg-fg/[0.04]" /> });

const INPUT = "w-full rounded-xl bg-fg/[0.05] px-3 py-2.5 text-sm ring-1 ring-line outline-none placeholder:text-muted focus:ring-[#5b47ff]/60";
const MONO = "w-full rounded-xl bg-fg/[0.05] p-3 font-mono text-[13px] ring-1 ring-line outline-none focus:ring-[#5b47ff]/60";
/** Bigger tests aren't edited inline (a huge textarea freezes the page); replace them from a file. */
const INLINE_LIMIT = 20_000;

type Draft = Pick<TestCase, "input" | "output" | "sample" | "explanation"> & { key: string };
type Msg = { ok: boolean; text: string } | null;
type Check = { sample: boolean; pass: boolean; verdict: string; got: string; expected: string; timeMs: number };

export function ProblemEditor({ initial, initialTests, runnable }: { initial: Problem; initialTests: TestCase[]; runnable: Lang[] }) {
  const router = useRouter();
  const [p, setP] = useState(initial);
  const [tagText, setTagText] = useState(initial.tags.join(", "));
  const [tests, setTests] = useState<Draft[]>(() => initialTests.sort((a, b) => Number(b.sample) - Number(a.sample)).map((t) => ({ key: t.id, input: t.input, output: t.output, sample: t.sample, explanation: t.explanation })));
  const [preview, setPreview] = useState(false);
  const [starterLang, setStarterLang] = useState<Lang>("javascript");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [refLang, setRefLang] = useState<Lang>(runnable[0] ?? "javascript");
  const [refCode, setRefCode] = useState(DEFAULT_STARTER[runnable[0] ?? "javascript"]);
  const [checks, setChecks] = useState<Check[] | null>(null);

  const set = (patch: Partial<Problem>) => setP((x) => ({ ...x, ...patch }));
  const setTest = (key: string, patch: Partial<Draft>) => setTests((all) => all.map((t) => (t.key === key ? { ...t, ...patch } : t)));

  const payload = () => ({
    title: p.title,
    statement: p.statement,
    difficulty: p.difficulty,
    tags: tagText
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length >= 2)
      .slice(0, 8),
    starter: Object.fromEntries(Object.entries(p.starter).filter(([, v]) => v && v.trim())),
    timeLimitMs: p.timeLimitMs,
    memoryLimitMb: p.memoryLimitMb,
    tests: tests.map(({ input, output, sample, explanation }) => ({ input, output, sample, explanation: sample ? explanation || undefined : undefined })),
  });

  async function run(key: string, job: () => Promise<{ ok: boolean; error?: string }>, okText: string) {
    setBusy(key);
    setMsg(null);
    try {
      const res = await job();
      setMsg(res.ok ? { ok: true, text: okText } : { ok: false, text: res.error ?? "Something went wrong" });
      return res.ok;
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong" });
      return false;
    } finally {
      setBusy(null);
    }
  }

  const save = () =>
    run(
      "save",
      async () => {
        const res = await rpc("codeAuthor.save", p.id, payload());
        if (res.ok) set({ slug: res.slug });
        return res;
      },
      "Saved",
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/code/manage" className="flex items-center gap-2 text-sm font-semibold text-muted hover:text-fg">
          <ArrowLeft className="size-4" /> My problems
        </Link>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", p.status === "published" ? "bg-teal/15 text-teal" : "bg-fg/10")}>{p.status === "published" ? "Live" : "Draft"}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          {p.status === "published" && (
            <Link href={`/code/${p.slug}`} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-[#8f80ff] hover:bg-fg/5">
              Open <ExternalLink className="size-3.5" />
            </Link>
          )}
          <button type="button" disabled={!!busy} onClick={save} className="flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:bg-fg/5 disabled:opacity-50">
            {busy === "save" && <Loader2 className="size-4 animate-spin" />} Save
          </button>
          {p.status === "published" ? (
            <button type="button" disabled={!!busy} onClick={async () => (await run("status", () => rpc("codeAuthor.status", p.id, "draft"), "Unpublished")) && set({ status: "draft" })} className="flex items-center gap-2 rounded-xl bg-fg/10 px-4 py-2 text-sm font-semibold disabled:opacity-50">
              <EyeOff className="size-4" /> Unpublish
            </button>
          ) : (
            <button
              type="button"
              disabled={!!busy}
              onClick={async () => {
                const ok = await run(
                  "status",
                  async () => {
                    const saved = await rpc("codeAuthor.save", p.id, payload());
                    if (!saved.ok) return saved;
                    set({ slug: saved.slug });
                    return rpc("codeAuthor.status", p.id, "published");
                  },
                  "Published! Learners can solve it now.",
                );
                if (ok) set({ status: "published" });
              }}
              className={cn("flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50", GRADIENT)}
            >
              {busy === "status" ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />} Publish
            </button>
          )}
          <button
            type="button"
            disabled={!!busy}
            onClick={async () => {
              if (window.confirm("Delete this problem and its tests?") && (await run("del", () => rpc("codeAuthor.delete", p.id), "Deleted"))) router.push("/code/manage");
            }}
            aria-label="Delete problem"
            className="grid size-9 place-items-center rounded-xl text-rose hover:bg-rose/10"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {msg && (
          <motion.p role="status" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={cn("rounded-2xl border p-3 text-sm", msg.ok ? "border-teal/40 bg-teal/10" : "border-rose/40 bg-rose/10")}>
            {msg.text}
          </motion.p>
        )}
      </AnimatePresence>

      <section className="glass grid gap-4 rounded-[26px] p-5 sm:grid-cols-2 sm:p-6">
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-sm font-semibold">Title</span>
          <input value={p.title} onChange={(e) => set({ title: e.target.value })} maxLength={80} className={INPUT} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Difficulty</span>
          <select value={p.difficulty} onChange={(e) => set({ difficulty: e.target.value as Difficulty })} className={INPUT}>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d[0]!.toUpperCase() + d.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Tags (comma separated)</span>
          <input value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="Arrays, Hash map" className={INPUT} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Time limit (ms)</span>
          <input type="number" min={500} max={10000} step={100} value={p.timeLimitMs} onChange={(e) => set({ timeLimitMs: Number(e.target.value) })} className={INPUT} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Memory limit (MB)</span>
          <input type="number" min={32} max={512} value={p.memoryLimitMb} onChange={(e) => set({ memoryLimitMb: Number(e.target.value) })} className={INPUT} />
        </label>
      </section>

      <section className="glass rounded-[26px] p-5 sm:p-6">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="font-display text-lg font-bold">Statement</h2>
          <div className="ml-auto flex rounded-xl bg-fg/[0.05] p-1 text-xs font-semibold">
            {(["Write", "Preview"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setPreview(t === "Preview")} className={cn("rounded-lg px-3 py-1", preview === (t === "Preview") ? "bg-fg/10" : "text-muted")}>
                {t}
              </button>
            ))}
          </div>
        </div>
        {preview ? (
          <div className="min-h-48 rounded-xl bg-fg/[0.03] p-4">{p.statement.trim() ? <Markdown source={p.statement} /> : <p className="text-sm text-muted">Nothing to preview yet.</p>}</div>
        ) : (
          <textarea value={p.statement} onChange={(e) => set({ statement: e.target.value })} rows={14} aria-label="Statement (markdown)" placeholder={"Describe the task.\n\n### Input\n- Line 1: …\n\n### Output\n…\n\n### Constraints\n- 1 ≤ n ≤ 10^5"} className={MONO} />
        )}
        <p className="mt-2 text-xs text-muted">Markdown: # headings, **bold**, `code`, - lists, ``` code blocks, &gt; tips. Samples are shown below the statement automatically.</p>
      </section>

      <section className="glass rounded-[26px] p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold">Starter code</h2>
        <p className="text-sm text-muted">Optional per language. Empty = a generic read-input template.</p>
        <div className="mt-3 flex flex-wrap gap-1">
          {LANGS.map((l) => (
            <button key={l} type="button" onClick={() => setStarterLang(l)} className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", starterLang === l ? "bg-fg/10" : "text-muted hover:text-fg")}>
              {LANG_INFO[l].label}
              {p.starter[l]?.trim() ? " •" : ""}
            </button>
          ))}
        </div>
        <div className="mt-3 h-64 overflow-hidden rounded-xl ring-1 ring-line">
          <CodeEditor key={starterLang} value={p.starter[starterLang] ?? DEFAULT_STARTER[starterLang]} onChange={(v) => setP((x) => ({ ...x, starter: { ...x.starter, [starterLang]: v } }))} language={LANG_INFO[starterLang].monaco} />
        </div>
      </section>

      <section className="glass rounded-[26px] p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-lg font-bold">Test cases</h2>
          <span className="text-sm text-muted">
            {tests.filter((t) => t.sample).length} sample · {tests.filter((t) => !t.sample).length} hidden
          </span>
          <button type="button" onClick={() => setTests((t) => [...t, { key: crypto.randomUUID(), input: "", output: "", sample: t.length === 0 }])} className="ml-auto flex items-center gap-1.5 rounded-xl bg-fg/[0.08] px-3 py-2 text-sm font-semibold hover:bg-fg/[0.12]">
            <Plus className="size-4" /> Add test
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">Samples appear in the statement and power the Run button. Hidden tests are only used on Submit and never reach the browser. Output is compared line by line, ignoring trailing spaces.</p>
        <ul className="mt-4 space-y-3">
          <AnimatePresence initial={false}>
            {tests.map((t, i) => (
              <motion.li key={t.key} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="rounded-2xl bg-fg/[0.03] p-4 ring-1 ring-line">
                <div className="mb-2 flex items-center gap-3">
                  <span className="text-sm font-bold">Test {i + 1}</span>
                  <label className="flex items-center gap-1.5 text-xs font-semibold">
                    <input type="checkbox" checked={t.sample} onChange={(e) => setTest(t.key, { sample: e.target.checked })} className="accent-[#5b47ff]" /> Sample (visible)
                  </label>
                  {checks?.[i] && <span className={cn("text-xs font-bold", checks[i].pass ? "text-teal" : "text-rose")}>{checks[i].pass ? "✓ reference passes" : `✗ ${checks[i].verdict.replace("_", " ")}`}</span>}
                  <button type="button" onClick={() => setTests((all) => all.filter((x) => x.key !== t.key))} aria-label={`Remove test ${i + 1}`} className="ml-auto text-muted hover:text-rose">
                    <X className="size-4" />
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <TestField label="Input" value={t.input} onChange={(v) => setTest(t.key, { input: v })} />
                  <TestField label="Expected output" value={t.output} onChange={(v) => setTest(t.key, { output: v })} />
                </div>
                {t.sample && <input value={t.explanation ?? ""} onChange={(e) => setTest(t.key, { explanation: e.target.value })} maxLength={1000} placeholder="Explanation shown under the example (optional)" aria-label={`Explanation for test ${i + 1}`} className={cn(INPUT, "mt-3")} />}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </section>

      <section className="glass rounded-[26px] p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Beaker className="size-5 text-[#8f80ff]" /> Check with a reference solution
        </h2>
        <p className="text-sm text-muted">Runs your solution on the saved tests to catch wrong expected outputs before learners do. Save first.</p>
        <div className="mt-3 flex items-center gap-2">
          <select value={refLang} onChange={(e) => setRefLang(e.target.value as Lang)} aria-label="Reference language" className="rounded-xl bg-fg/[0.05] px-3 py-2 text-sm font-semibold ring-1 ring-line outline-none">
            {LANGS.map((l) => (
              <option key={l} value={l} disabled={!runnable.includes(l)}>
                {LANG_INFO[l].label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!!busy || !runnable.includes(refLang)}
            onClick={() =>
              run(
                "check",
                async () => {
                  const res = await rpc("codeAuthor.check", p.id, { lang: refLang, code: refCode });
                  if (res.ok) setChecks(res.results);
                  return res;
                },
                "Checked against all saved tests",
              )
            }
            className={cn("flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50", GRADIENT)}
          >
            {busy === "check" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Check all tests
          </button>
          {checks && (
            <span className={cn("text-sm font-semibold", checks.every((c) => c.pass) ? "text-teal" : "text-rose")}>
              {checks.filter((c) => c.pass).length}/{checks.length} pass
            </span>
          )}
        </div>
        <div className="mt-3 h-56 overflow-hidden rounded-xl ring-1 ring-line">
          <CodeEditor key={`ref-${refLang}`} value={refCode} onChange={setRefCode} language={LANG_INFO[refLang].monaco} />
        </div>
      </section>
    </div>
  );
}

function TestField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const big = value.length > INLINE_LIMIT;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</span>
        <label className="flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-[#8f80ff]">
          <FileUp className="size-3.5" /> From file
          <input
            type="file"
            hidden
            accept=".txt,.in,.out,text/plain"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > MAX_TEST_BYTES) return window.alert("That file is over 1 MB.");
              onChange(await f.text());
            }}
          />
        </label>
      </div>
      {big ? (
        <div className="rounded-xl bg-fg/[0.05] p-3 text-xs text-muted ring-1 ring-line">
          Large test ({(value.length / 1024).toFixed(0)} KB, {value.split("\n").length} lines). Replace it from a file to change it.
          <pre className="mt-2 truncate font-mono">{value.slice(0, 120)}…</pre>
        </div>
      ) : (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} aria-label={label} className={MONO} />
      )}
    </div>
  );
}
