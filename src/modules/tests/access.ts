import type { PublicUser } from "@/core/auth/roles";
import { listUsers } from "@/core/auth/users";
import { getSite } from "@/core/site/store";
import { evaluate, isExpired } from "./logic";
import { getTest, hasPurchased, listAttempts, updateAttempt } from "./store";
import type { Attempt, Test } from "./types";

export async function testsEnabled() {
  return (await getSite()).modules.find((m) => m.key === "tests")?.enabled ?? false;
}

export const canTeach = (user: Pick<PublicUser, "role">) => user.role === "instructor" || user.role === "admin";

export const ownsOrAdmin = (test: Pick<Test, "instructorId">, user: Pick<PublicUser, "id" | "role">) => test.instructorId === user.id || user.role === "admin";

/** Free tests are open to everyone signed in; paid ones need a purchase (owners always get in). */
export async function canTake(test: Test, user: PublicUser) {
  if (test.price === 0 || ownsOrAdmin(test, user)) return true;
  return hasPurchased(user.id, test.id);
}

export async function userNames(): Promise<Map<string, string>> {
  return new Map((await listUsers()).map((u) => [u.id, u.name]));
}

/** Submits and scores an attempt. Idempotent: an already-submitted attempt is returned as is. */
export async function finalizeAttempt(attempt: Attempt, reason: "manual" | "timeout", test?: Test | null): Promise<Attempt> {
  if (attempt.status === "submitted") return attempt;
  const t = test ?? (await getTest(attempt.testId));
  if (!t) return attempt;
  const updated = await updateAttempt(attempt.id, (a) => ({
    ...a,
    status: "submitted",
    submittedAt: new Date().toISOString(),
    submitReason: reason,
    result: evaluate(t, a.answers, a.timeSpent),
  }));
  return updated ?? attempt;
}

/**
 * Time is enforced on the server: any in-progress attempt past its deadline is
 * submitted the first time anyone looks at it (no background job needed).
 */
export async function settleIfExpired(attempt: Attempt, test?: Test | null) {
  return attempt.status === "in_progress" && isExpired(attempt) ? finalizeAttempt(attempt, "timeout", test) : attempt;
}

/** Submitted scores for ranking, after settling any expired attempts of this test. */
export async function submittedAttempts(testId: string) {
  const test = await getTest(testId);
  const all = await listAttempts({ testId });
  const settled = await Promise.all(all.map((a) => settleIfExpired(a, test)));
  return settled.filter((a) => a.status === "submitted" && a.result);
}
