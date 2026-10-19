"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAdmin, requireUser } from "@/core/auth/current";
import { rateLimit } from "@/core/security/rate-limit";
import { MAX_CODE_BYTES, MAX_INPUT_BYTES, MAX_TEST_BYTES, outputsMatch, slugify } from "./logic";
import { RunnerUnavailable } from "./runner";
import { canAuthor, codeEnabled, runCode, submitCode, type RunCase } from "./service";
import { changeProblem, getProblem, insertComment, insertProblem, listSubmissions, listTests, nowIso, removeComment, removeProblem, replaceTests } from "./store";
import { DIFFICULTIES, LANGS, type Submission, type TestCase } from "./types";

type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });
const uuid = z.string().regex(/^[0-9a-f-]{36}$/);
const code = z.string().max(MAX_CODE_BYTES, "Your code is too long (64 KB max)");
const lang = z.enum(LANGS);

async function signedIn() {
  const user = await requireUser("/code");
  return (await codeEnabled()) ? user : null;
}

/** Learners only reach published problems; authors and admins also their drafts. */
async function loadProblem(id: unknown, user: { id: string; role: string }) {
  const parsed = uuid.safeParse(id);
  const p = parsed.success ? await getProblem(parsed.data) : null;
  if (!p) return null;
  return p.status === "published" || p.authorId === user.id || user.role === "admin" ? p : null;
}

async function guarded<T>(job: () => Promise<T>): Promise<T | Fail> {
  try {
    return await job();
  } catch (e) {
    if (e instanceof RunnerUnavailable) return fail(e.message);
    console.error("[code] runner failed", e);
    return fail("The judge is busy or unreachable. Please try again in a moment.");
  }
}

/* ================= Learner ================= */

const runSchema = z.object({ lang, code, customInput: z.string().max(MAX_INPUT_BYTES).nullable() });

export async function runCodeAction(problemId: unknown, input: unknown): Promise<{ ok: true; cases: RunCase[] } | Fail> {
  const user = await signedIn();
  if (!user) return fail("Coding practice is switched off right now");
  const parsed = runSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid code");
  if (!parsed.data.code.trim()) return fail("Write some code first");
  if (!rateLimit(`crun:${user.id}`, 20, 60_000).ok) return fail("You're running code very fast. Wait a few seconds.");
  const p = await loadProblem(problemId, user);
  if (!p) return fail("Problem not found");
  return guarded(async () => ({ ok: true as const, cases: await runCode(p, parsed.data.lang, parsed.data.code, parsed.data.customInput) }));
}

export async function submitCodeAction(problemId: unknown, input: unknown): Promise<{ ok: true; submission: Submission } | Fail> {
  const user = await signedIn();
  if (!user) return fail("Coding practice is switched off right now");
  const parsed = z.object({ lang, code }).safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid code");
  if (!parsed.data.code.trim()) return fail("Write some code first");
  if (!rateLimit(`csub:${user.id}`, 10, 60_000).ok) return fail("Too many submissions. Wait a minute.");
  const p = await loadProblem(problemId, user);
  if (!p || p.status !== "published") return fail("Problem not found");
  return guarded(async () => ({ ok: true as const, submission: await submitCode(user, p, parsed.data.lang, parsed.data.code) }));
}

export async function mySubmissionsAction(problemId: unknown): Promise<{ ok: true; submissions: Submission[] } | Fail> {
  const user = await signedIn();
  if (!user) return fail("Coding practice is switched off right now");
  const p = await loadProblem(problemId, user);
  if (!p) return fail("Problem not found");
  const mine = (await listSubmissions()).filter((s) => s.problemId === p.id && s.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { ok: true, submissions: mine.slice(0, 50) };
}

export async function postCommentAction(problemId: unknown, text: unknown): Promise<{ ok: true; id: string } | Fail> {
  const user = await signedIn();
  if (!user) return fail("Coding practice is switched off right now");
  const parsed = z.string().trim().min(2, "Write something first").max(2000).safeParse(text);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid");
  if (!rateLimit(`ccomment:${user.id}`, 10, 10 * 60_000).ok) return fail("Slow down a little");
  const p = await loadProblem(problemId, user);
  if (!p) return fail("Problem not found");
  const id = randomUUID();
  await insertComment({ id, problemId: p.id, userId: user.id, userName: user.name, text: parsed.data, createdAt: nowIso() });
  return { ok: true, id };
}

export async function deleteCommentAction(id: unknown): Promise<{ ok: true } | Fail> {
  const user = await signedIn();
  if (!user) return fail("Coding practice is switched off right now");
  if (!uuid.safeParse(id).success) return fail("Not found");
  const removed = await removeComment(id as string, (c) => c.userId === user.id || user.role === "admin");
  return removed ? { ok: true } : fail("You can only delete your own comments");
}

/* ================= Authors (instructors & admins) ================= */

async function author() {
  const user = await signedIn();
  return user && canAuthor(user) ? user : null;
}

async function ownProblem(id: unknown) {
  const user = await author();
  if (!user) return { error: "Only instructors can do this" } as const;
  const parsed = uuid.safeParse(id);
  const p = parsed.success ? await getProblem(parsed.data) : null;
  if (!p || (p.authorId !== user.id && user.role !== "admin")) return { error: "Problem not found" } as const;
  return { user, p };
}

export async function createProblemAction(): Promise<{ ok: true; id: string } | Fail> {
  const user = await author();
  if (!user) return fail("Only instructors can do this");
  const id = randomUUID();
  const now = nowIso();
  await insertProblem({ id, slug: `problem-${id.slice(0, 6)}`, title: "Untitled problem", statement: "", difficulty: "easy", tags: [], starter: {}, timeLimitMs: 2000, memoryLimitMb: 256, status: "draft", authorId: user.id, authorName: user.name, createdAt: now, updatedAt: now });
  return { ok: true, id };
}

const testSchema = z.object({ input: z.string().max(MAX_TEST_BYTES, "A test case is too big (1 MB max)"), output: z.string().max(MAX_TEST_BYTES), sample: z.boolean(), explanation: z.string().trim().max(1000).optional() });
const problemSchema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(80),
  statement: z.string().max(20_000),
  difficulty: z.enum(DIFFICULTIES),
  tags: z.array(z.string().trim().min(2).max(24)).max(8),
  starter: z.partialRecord(z.enum(LANGS), z.string().max(MAX_CODE_BYTES)),
  timeLimitMs: z.number().int().min(500).max(10_000),
  memoryLimitMb: z.number().int().min(32).max(512),
  tests: z.array(testSchema).max(60, "At most 60 test cases"),
});

export async function saveProblemAction(id: unknown, input: unknown): Promise<{ ok: true; slug: string } | Fail> {
  const ctx = await ownProblem(id);
  if ("error" in ctx) return fail(ctx.error!);
  const parsed = problemSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form");
  const { tests, ...rest } = parsed.data;
  if (ctx.p.status === "published" && (tests.filter((t) => t.sample).length < 1 || tests.length < 2)) return fail("A live problem needs at least 1 sample and 2 tests in total");
  // Live problems keep their URL; drafts follow the title (made unique if taken).
  const wanted = slugify(rest.title);
  const res = await changeProblem(
    ctx.p.id,
    () => null,
    (p) => ({ ...p, ...rest, slug: p.status === "published" ? p.slug : wanted }),
  );
  if (!res.ok) return fail(res.error);
  const fixed = await changeProblem(ctx.p.id, (p, all) => (all.some((x) => x.id !== p.id && x.slug === p.slug) ? null : "unique"), (p) => ({ ...p, slug: `${p.slug}-${p.id.slice(0, 4)}` }));
  await replaceTests(ctx.p.id, tests.map((t): TestCase => ({ id: randomUUID(), problemId: ctx.p.id, input: t.input, output: t.output, sample: t.sample, explanation: t.explanation || undefined })));
  return { ok: true, slug: fixed.ok ? fixed.problem.slug : res.problem.slug };
}

export async function setProblemStatusAction(id: unknown, status: unknown): Promise<{ ok: true } | Fail> {
  const ctx = await ownProblem(id);
  if ("error" in ctx) return fail(ctx.error!);
  if (status !== "draft" && status !== "published") return fail("Bad status");
  if (status === "published") {
    const tests = await listTests(ctx.p.id);
    if (ctx.p.statement.trim().length < 30) return fail("Write the problem statement first (30+ characters)");
    if (!tests.some((t) => t.sample)) return fail("Add at least one sample test");
    if (tests.length < 2) return fail("Add at least 2 tests (samples + hidden)");
  }
  const res = await changeProblem(ctx.p.id, () => null, (p) => ({ ...p, status }));
  return res.ok ? { ok: true } : fail(res.error);
}

export async function deleteProblemAction(id: unknown): Promise<{ ok: true } | Fail> {
  const ctx = await ownProblem(id);
  if ("error" in ctx) return fail(ctx.error!);
  if ((await listSubmissions()).some((s) => s.problemId === ctx.p.id)) return fail("Learners have submitted to this problem. Unpublish it instead.");
  await removeProblem(ctx.p.id);
  await replaceTests(ctx.p.id, []);
  return { ok: true };
}

/** Runs the author's reference solution against every test (nothing stored). */
export async function checkTestsAction(id: unknown, input: unknown): Promise<{ ok: true; results: { sample: boolean; pass: boolean; verdict: string; got: string; expected: string; timeMs: number }[] } | Fail> {
  const ctx = await ownProblem(id);
  if ("error" in ctx) return fail(ctx.error!);
  const parsed = z.object({ lang, code }).safeParse(input);
  if (!parsed.success) return fail("Invalid code");
  if (!rateLimit(`ccheck:${ctx.user.id}`, 10, 60_000).ok) return fail("Wait a minute before checking again");
  const tests = await listTests(ctx.p.id);
  if (!tests.length) return fail("Save some tests first");
  return guarded(async () => {
    const { execute } = await import("./runner");
    const raw = await execute({ lang: parsed.data.lang, code: parsed.data.code, inputs: tests.map((t) => t.input), timeLimitMs: ctx.p.timeLimitMs, memoryLimitMb: ctx.p.memoryLimitMb });
    return {
      ok: true as const,
      results: raw.map((r, i) => {
        const pass = r.status === "ok" && outputsMatch(r.stdout, tests[i]!.output);
        return { sample: tests[i]!.sample, pass, verdict: r.status === "ok" ? (pass ? "accepted" : "wrong_answer") : r.status, got: r.stdout.slice(0, 2000), expected: tests[i]!.output.slice(0, 2000), timeMs: r.timeMs };
      }),
    };
  });
}

/* ================= Admin ================= */

export async function loadDemoProblemsAction(): Promise<{ ok: true; added: number } | Fail> {
  const admin = await requireAdmin();
  const { loadDemoProblems } = await import("./demo");
  return { ok: true, added: await loadDemoProblems(admin) };
}
