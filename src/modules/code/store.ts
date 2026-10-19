import { readJson, updateJson } from "@/core/db/json-store";
import type { Comment, Problem, Streak, Submission, TestCase } from "./types";

const F = {
  problems: "code_problems.json",
  tests: "code_testcases.json",
  submissions: "code_submissions.json",
  streaks: "code_streaks.json",
  comments: "code_comments.json",
};
const arr = <T>(raw: unknown): T[] => (Array.isArray(raw) ? (raw as T[]) : []);
export const nowIso = () => new Date().toISOString();

/* ---------------- Problems ---------------- */

export const listProblems = async () => arr<Problem>(await readJson(F.problems));
export const getProblem = async (id: string) => (await listProblems()).find((p) => p.id === id) ?? null;
export const getProblemBySlug = async (slug: string) => (await listProblems()).find((p) => p.slug === slug) ?? null;

/** Inserts with a slug that is unique across problems (adds -2, -3 … inside the write queue). */
export async function insertProblem(p: Problem) {
  let out = p;
  await updateJson(F.problems, arr<Problem>, (all) => {
    let slug = p.slug;
    for (let i = 2; all.some((x) => x.slug === slug); i++) slug = `${p.slug}-${i}`;
    out = { ...p, slug };
    return [...all, out];
  });
  return out;
}

export async function changeProblem(id: string, guard: (p: Problem, all: Problem[]) => string | null, next: (p: Problem) => Problem): Promise<{ ok: true; problem: Problem } | { ok: false; error: string }> {
  let res: { ok: true; problem: Problem } | { ok: false; error: string } = { ok: false, error: "Problem not found" };
  await updateJson(F.problems, arr<Problem>, (all) =>
    all.map((p) => {
      if (p.id !== id) return p;
      const err = guard(p, all);
      if (err) {
        res = { ok: false, error: err };
        return p;
      }
      const v = { ...next(p), updatedAt: nowIso() };
      res = { ok: true, problem: v };
      return v;
    }),
  );
  return res;
}

export const removeProblem = (id: string) => updateJson(F.problems, arr<Problem>, (all) => all.filter((p) => p.id !== id));

/* ---------------- Test cases ---------------- */

export const listTests = async (problemId: string) => arr<TestCase>(await readJson(F.tests)).filter((t) => t.problemId === problemId);
export const allTests = async () => arr<TestCase>(await readJson(F.tests));
/** Replaces a problem's whole test set at once. */
export const replaceTests = (problemId: string, tests: TestCase[]) => updateJson(F.tests, arr<TestCase>, (all) => [...all.filter((t) => t.problemId !== problemId), ...tests]);

/* ---------------- Submissions ---------------- */

export const listSubmissions = async () => arr<Submission>(await readJson(F.submissions));
export const getSubmission = async (id: string) => (await listSubmissions()).find((s) => s.id === id) ?? null;
export const insertSubmission = (s: Submission) => updateJson(F.submissions, arr<Submission>, (all) => [...all, s]);

/* ---------------- Streaks ---------------- */

export const listStreaks = async () => arr<Streak>(await readJson(F.streaks));
export const getStreak = async (userId: string) => (await listStreaks()).find((s) => s.userId === userId) ?? null;
export async function updateStreak(userId: string, next: (s: Streak | null) => Streak) {
  let out: Streak | undefined;
  await updateJson(F.streaks, arr<Streak>, (all) => {
    const i = all.findIndex((s) => s.userId === userId);
    out = next(i >= 0 ? all[i]! : null);
    if (i < 0) return [...all, out];
    const copy = all.slice();
    copy[i] = out;
    return copy;
  });
  return out!;
}

/* ---------------- Discussion ---------------- */

export const listComments = async (problemId: string) => arr<Comment>(await readJson(F.comments)).filter((c) => c.problemId === problemId);
export const insertComment = (c: Comment) => updateJson(F.comments, arr<Comment>, (all) => [...all, c]);
export async function removeComment(id: string, allowed: (c: Comment) => boolean) {
  let removed = false;
  await updateJson(F.comments, arr<Comment>, (all) =>
    all.filter((c) => {
      if (c.id !== id || !allowed(c)) return true;
      removed = true;
      return false;
    }),
  );
  return removed;
}
