"use server";

import { requireUser } from "@/core/auth/current";
import { notify } from "@/core/notifications/store";
import { rateLimit } from "@/core/security/rate-limit";
import { commissionFor, WalletError } from "@/core/wallet/ledger";
import { getBalance, walletTransfer } from "@/core/wallet/store";
import { formatPaise } from "@/lib/utils";
import { canTake, finalizeAttempt, ownsOrAdmin, testsEnabled } from "./access";
import { allQuestions, isExpired, remainingSec } from "./logic";
import { answerSchema } from "./schema";
import { ensurePurchase, getAttempt, getTest, getTestSettings, hasPurchased, startAttempt, updateAttempt } from "./store";

export type BuyTestResult = { ok: true } | { ok: false; error: string; shortfall?: number };

/** Buy a paid test with the wallet (instructor gets price minus commission). Idempotent per user and test. */
export async function buyTestAction(testId: unknown): Promise<BuyTestResult> {
  const user = await requireUser("/tests");
  if (typeof testId !== "string" || !(await testsEnabled())) return { ok: false, error: "Test not found" };
  if (!rateLimit(`buytest:${user.id}`, 10, 60_000).ok) return { ok: false, error: "Too many attempts. Wait a minute." };
  const test = await getTest(testId);
  if (!test || test.status !== "published") return { ok: false, error: "This test isn't available" };
  if (ownsOrAdmin(test, user) || test.price === 0 || (await hasPurchased(user.id, test.id))) return { ok: true };

  const { commissionBps } = await getTestSettings();
  try {
    const res = await walletTransfer({
      from: user.id,
      to: test.instructorId,
      amount: test.price,
      commissionBps,
      key: `test:${test.id}:${user.id}`,
      note: `Test: ${test.title}`,
      ref: `test:${test.id}`,
    });
    if (!res.duplicate)
      await notify(test.instructorId, {
        kind: "wallet",
        title: `New purchase: ${test.title}`,
        body: `${user.name} bought your test. You earned ${formatPaise(test.price - commissionFor(test.price, commissionBps))}.`,
        href: "/tests/teach",
      });
  } catch (e) {
    if (e instanceof WalletError && e.code === "INSUFFICIENT_FUNDS")
      return { ok: false, error: "Not enough wallet balance", shortfall: test.price - (await getBalance(user.id)) };
    if (e instanceof WalletError) return { ok: false, error: e.message };
    throw e;
  }
  await ensurePurchase(user.id, test.id, test.price);
  return { ok: true };
}

/** Starts (or resumes) the learner's single attempt. The clock starts on the server, now. */
export async function startAttemptAction(testId: unknown): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const user = await requireUser("/tests");
  if (typeof testId !== "string") return { ok: false, error: "Test not found" };
  const test = await getTest(testId);
  if (!test || (test.status !== "published" && !ownsOrAdmin(test, user))) return { ok: false, error: "This test isn't available" };
  if (!(await canTake(test, user))) return { ok: false, error: "Buy this test to attempt it" };
  if (!allQuestions(test).length) return { ok: false, error: "This test has no questions yet" };

  const { attempt } = await startAttempt({ testId: test.id, userId: user.id, userName: user.name, durationMin: test.durationMin });
  const url = attempt.status === "submitted" ? `/tests/${test.slug}/result/${attempt.id}` : `/tests/${test.slug}/attempt/${attempt.id}`;
  return { ok: true, url };
}

export type SaveAnswerResult = { ok: true; remainingSec: number } | { ok: false; expired: true; resultUrl: string } | { ok: false; error: string };

/** Saves one answer. Refused after the deadline (which then auto-submits). Correct answers are never returned. */
export async function saveAnswerAction(input: unknown): Promise<SaveAnswerResult> {
  const user = await requireUser("/tests");
  const parsed = answerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid answer" };
  const { attemptId, questionId, selected, value, marked, timeDelta } = parsed.data;

  const attempt = await getAttempt(attemptId);
  if (!attempt || attempt.userId !== user.id) return { ok: false, error: "Attempt not found" };
  const test = await getTest(attempt.testId);
  if (!test) return { ok: false, error: "Test not found" };
  const resultUrl = `/tests/${test.slug}/result/${attempt.id}`;
  if (attempt.status === "submitted") return { ok: false, expired: true, resultUrl };
  if (isExpired(attempt)) {
    await finalizeAttempt(attempt, "timeout", test);
    return { ok: false, expired: true, resultUrl };
  }

  const q = allQuestions(test).find((x) => x.id === questionId);
  if (!q) return { ok: false, error: "Question not found" };
  const optionIds = new Set(q.options.map((o) => o.id));
  const picks = q.type === "numeric" ? [] : [...new Set(selected)].filter((id) => optionIds.has(id));
  if (q.type === "single" && picks.length > 1) return { ok: false, error: "Pick one option" };

  // Time per question can't add up to more than the test allows.
  const cap = test.durationMin * 60;
  await updateAttempt(attempt.id, (a) => {
    const used = Object.values(a.timeSpent).reduce((s, n) => s + n, 0);
    const delta = Math.max(0, Math.min(timeDelta, cap - used));
    return {
      ...a,
      answers: { ...a.answers, [q.id]: { selected: picks, value: q.type === "numeric" ? value : null } },
      marked: marked ? [...new Set([...a.marked, q.id])] : a.marked.filter((id) => id !== q.id),
      timeSpent: { ...a.timeSpent, [q.id]: Math.round(((a.timeSpent[q.id] ?? 0) + delta) * 10) / 10 },
    };
  });
  return { ok: true, remainingSec: remainingSec(attempt) };
}

export async function submitAttemptAction(attemptId: unknown): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const user = await requireUser("/tests");
  if (typeof attemptId !== "string") return { ok: false, error: "Attempt not found" };
  const attempt = await getAttempt(attemptId);
  if (!attempt || attempt.userId !== user.id) return { ok: false, error: "Attempt not found" };
  const test = await getTest(attempt.testId);
  if (!test) return { ok: false, error: "Test not found" };
  const done = await finalizeAttempt(attempt, isExpired(attempt) ? "timeout" : "manual", test);
  if (attempt.status === "in_progress" && done.result)
    await notify(user.id, {
      kind: "module",
      title: `Result: ${test.title}`,
      body: `You scored ${done.result.score}/${done.result.maxScore} with ${done.result.accuracy}% accuracy.`,
      href: `/tests/${test.slug}/result/${attempt.id}`,
    });
  return { ok: true, url: `/tests/${test.slug}/result/${attempt.id}` };
}
