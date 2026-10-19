import type { PublicUser } from "@/core/auth/roles";
import { ownsOrAdmin } from "./access";
import { allQuestions, maxScore } from "./logic";
import { listAttempts, listPurchases, listTests } from "./store";
import type { Test } from "./types";
import type { TestCardData } from "./components/bits";

/** Cards for the catalog, with the viewer's own status on each test. */
export async function loadTestCards(user: PublicUser, filter: (t: Test) => boolean = (t) => t.status === "published"): Promise<TestCardData[]> {
  const [tests, attempts, purchases] = await Promise.all([listTests(), listAttempts(), listPurchases({ userId: user.id })]);
  const bought = new Set(purchases.map((p) => p.testId));
  return tests.filter(filter).map((t) => {
    const mine = attempts.find((a) => a.testId === t.id && a.userId === user.id);
    return {
      id: t.id,
      slug: t.slug,
      title: t.title,
      exam: t.exam,
      colors: t.colors,
      price: t.price,
      durationMin: t.durationMin,
      questions: allQuestions(t).length,
      maxScore: maxScore(t),
      attempts: attempts.filter((a) => a.testId === t.id).length,
      demo: t.demo,
      myStatus: mine?.status ?? null,
      owned: bought.has(t.id) || ownsOrAdmin(t, user),
    };
  });
}
