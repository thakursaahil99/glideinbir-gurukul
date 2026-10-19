import { randomUUID } from "node:crypto";
import type { PublicUser } from "@/core/auth/roles";
import { getSite } from "@/core/site/store";
import { bumpStreak, clipShown, liveStreak, outputsMatch, overall, POINTS } from "./logic";
import { execute, type RawResult } from "./runner";
import { insertSubmission, listProblems, listStreaks, listSubmissions, listTests, nowIso, updateStreak } from "./store";
import type { CaseResult, Problem, Submission, Verdict } from "./types";

export async function codeEnabled() {
  return (await getSite()).modules.find((m) => m.key === "code")?.enabled ?? false;
}

export const canAuthor = (u: Pick<PublicUser, "role">) => u.role === "instructor" || u.role === "admin";

/** What a learner may see of a problem: never the hidden tests. */
export async function publicProblem(p: Problem) {
  const samples = (await listTests(p.id)).filter((t) => t.sample);
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    statement: p.statement,
    difficulty: p.difficulty,
    tags: p.tags,
    starter: p.starter,
    timeLimitMs: p.timeLimitMs,
    memoryLimitMb: p.memoryLimitMb,
    authorName: p.authorName,
    samples: samples.map((t) => ({ input: t.input, output: t.output, explanation: t.explanation ?? "" })),
  };
}
export type PublicProblem = Awaited<ReturnType<typeof publicProblem>>;

function judge(raw: RawResult, expected: string | null): CaseResult {
  // Compare the full output, keep only a display-sized copy.
  const base = { timeMs: raw.timeMs, stdout: clipShown(raw.stdout), stderr: clipShown(raw.stderr) };
  const map: Record<RawResult["status"], Verdict> = { ok: "accepted", tle: "time_limit", runtime: "runtime_error", compile: "compile_error", internal: "internal_error" };
  if (raw.status !== "ok") return { ...base, verdict: map[raw.status] };
  return { ...base, verdict: expected === null || outputsMatch(raw.stdout, expected) ? "accepted" : "wrong_answer" };
}

/** Expected outputs shown to the learner (samples only) are trimmed like their own output. */
const shown = (s: string) => clipShown(s);

export interface RunCase {
  input: string;
  expected: string | null;
  result: CaseResult;
}

/** Run = the sample tests (or the learner's own input). Nothing is stored. */
export async function runCode(p: Problem, lang: Submission["lang"], code: string, customInput: string | null): Promise<RunCase[]> {
  const cases = customInput !== null ? [{ input: customInput, output: null as string | null }] : (await listTests(p.id)).filter((t) => t.sample).map((t) => ({ input: t.input, output: t.output as string | null }));
  const raw = await execute({ lang, code, inputs: cases.map((c) => c.input), timeLimitMs: p.timeLimitMs, memoryLimitMb: p.memoryLimitMb });
  return cases.map((c, i) => ({ input: clipShown(c.input), expected: c.output === null ? null : shown(c.output), result: judge(raw[i]!, c.output) }));
}

/** Submit = every test, samples first. Stored, and an accepted one feeds the streak. */
export async function submitCode(user: PublicUser, p: Problem, lang: Submission["lang"], code: string): Promise<Submission> {
  const tests = (await listTests(p.id)).sort((a, b) => Number(b.sample) - Number(a.sample));
  const raw = await execute({ lang, code, inputs: tests.map((t) => t.input), timeLimitMs: p.timeLimitMs, memoryLimitMb: p.memoryLimitMb });
  const results = raw.map((r, i) => judge(r, tests[i]!.output));
  const { verdict, passed, firstFail } = overall(results);
  const fail = firstFail >= 0 ? tests[firstFail]! : null;
  const failedResult = firstFail >= 0 ? results[firstFail]! : null;
  const sub: Submission = {
    id: randomUUID(),
    problemId: p.id,
    userId: user.id,
    userName: user.name,
    lang,
    code,
    verdict,
    passed,
    total: tests.length,
    timeMs: Math.max(0, ...results.map((r) => r.timeMs)),
    failed:
      fail && failedResult
        ? {
            index: firstFail + 1,
            sample: fail.sample,
            ...(fail.sample ? { input: clipShown(fail.input), expected: shown(fail.output), got: failedResult.stdout } : {}),
            message: verdict === "compile_error" || verdict === "runtime_error" ? failedResult.stderr.slice(0, 4000) : undefined,
          }
        : undefined,
    createdAt: nowIso(),
  };
  await insertSubmission(sub);
  if (verdict === "accepted") await updateStreak(user.id, (s) => bumpStreak(s, user.id, Date.now()));
  return sub;
}

/* ---------------- Progress & leaderboard ---------------- */

export function solvedBy(subs: Submission[], userId: string) {
  return new Set(subs.filter((s) => s.userId === userId && s.verdict === "accepted").map((s) => s.problemId));
}

export async function progressOf(userId: string, now = Date.now()) {
  const [subs, problems, streaks] = await Promise.all([listSubmissions(), listProblems(), listStreaks()]);
  const solved = solvedBy(subs, userId);
  const live = problems.filter((p) => p.status === "published");
  const streak = streaks.find((s) => s.userId === userId) ?? null;
  const attempted = new Set(subs.filter((s) => s.userId === userId).map((s) => s.problemId));
  const by = (d: Problem["difficulty"]) => ({ solved: live.filter((p) => p.difficulty === d && solved.has(p.id)).length, total: live.filter((p) => p.difficulty === d).length });
  return {
    solved,
    attempted,
    counts: { easy: by("easy"), medium: by("medium"), hard: by("hard") },
    streak: liveStreak(streak, now),
    best: streak?.best ?? 0,
    days: streak?.days ?? [],
  };
}

export async function leaderboard(now = Date.now()) {
  const [subs, problems, streaks] = await Promise.all([listSubmissions(), listProblems(), listStreaks()]);
  const diff = new Map(problems.filter((p) => p.status === "published").map((p) => [p.id, p.difficulty]));
  const rows = new Map<string, { userId: string; name: string; points: number; solved: number; lastSolve: string }>();
  // First accepted submission per (user, problem) counts.
  const seen = new Set<string>();
  for (const s of [...subs].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const d = diff.get(s.problemId);
    if (s.verdict !== "accepted" || !d || seen.has(`${s.userId}:${s.problemId}`)) continue;
    seen.add(`${s.userId}:${s.problemId}`);
    const r = rows.get(s.userId) ?? { userId: s.userId, name: s.userName, points: 0, solved: 0, lastSolve: s.createdAt };
    r.points += POINTS[d];
    r.solved++;
    r.lastSolve = s.createdAt;
    rows.set(s.userId, r);
  }
  const streakOf = new Map(streaks.map((s) => [s.userId, liveStreak(s, now)]));
  return [...rows.values()]
    .map((r) => ({ ...r, streak: streakOf.get(r.userId) ?? 0 }))
    .sort((a, b) => b.points - a.points || a.lastSolve.localeCompare(b.lastSolve))
    .map((r, i) => ({ ...r, rank: i + 1 }));
}
