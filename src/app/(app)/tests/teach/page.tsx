import { redirect } from "next/navigation";
import { requireUser } from "@/core/auth/current";
import { listEntries } from "@/core/wallet/store";
import { canTeach, submittedAttempts } from "@/modules/tests/access";
import { TestsTabs } from "@/modules/tests/components/bits";
import { TestTeachDashboard, type TeachTestRow } from "@/modules/tests/components/teach-dashboard";
import { allQuestions, maxScore } from "@/modules/tests/logic";
import { getTestSettings, listAttempts, listTests } from "@/modules/tests/store";

export const metadata = { title: "Teach tests" };

export default async function TestTeachPage() {
  const user = await requireUser("/tests/teach");
  if (!canTeach(user)) redirect("/tests");

  const [tests, entries, settings, attempts] = await Promise.all([listTests(), listEntries(user.id, 10_000), getTestSettings(), listAttempts()]);
  const earnedBy = new Map<string, number>();
  for (const e of entries) if (e.type === "transfer_in" && e.ref?.startsWith("test:")) earnedBy.set(e.ref.slice(5), (earnedBy.get(e.ref.slice(5)) ?? 0) + e.amount);

  const mine = tests.filter((t) => t.instructorId === user.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const rows: TeachTestRow[] = await Promise.all(
    mine.map(async (t) => {
      const done = await submittedAttempts(t.id);
      return {
        id: t.id,
        slug: t.slug,
        title: t.title,
        exam: t.exam,
        colors: t.colors,
        status: t.status,
        price: t.price,
        questions: allQuestions(t).length,
        attempts: attempts.filter((a) => a.testId === t.id).length,
        avgScore: done.length ? Math.round((done.reduce((s, a) => s + a.result!.score, 0) / done.length) * 10) / 10 : null,
        maxScore: maxScore(t),
        earned: earnedBy.get(t.id) ?? 0,
      };
    }),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-muted uppercase">Instructor</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">Your test series</h1>
        </div>
        <TestsTabs canTeach />
      </div>
      <TestTeachDashboard rows={rows} commissionPercent={settings.commissionBps / 100} />
    </div>
  );
}
