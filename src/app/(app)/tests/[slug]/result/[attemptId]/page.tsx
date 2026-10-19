import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/core/auth/current";
import { ownsOrAdmin, settleIfExpired, submittedAttempts } from "@/modules/tests/access";
import { ResultView } from "@/modules/tests/components/result-view";
import { standing } from "@/modules/tests/logic";
import { getAttempt, getTestBySlug } from "@/modules/tests/store";

type Props = { params: Promise<{ slug: string; attemptId: string }> };

export const metadata: Metadata = { title: "Result" };

export default async function ResultPage({ params }: Props) {
  const { slug, attemptId } = await params;
  const user = await requireUser(`/tests/${slug}`);
  const [test, raw] = await Promise.all([getTestBySlug(slug), getAttempt(attemptId)]);
  // Learners see their own result; the test's owner and admins can see anyone's.
  if (!test || !raw || raw.testId !== test.id || (raw.userId !== user.id && !ownsOrAdmin(test, user))) notFound();

  const attempt = await settleIfExpired(raw, test);
  if (attempt.status !== "submitted" || !attempt.result) redirect(`/tests/${slug}/attempt/${attempt.id}`);

  const all = await submittedAttempts(test.id);
  const { rank, percentile, total } = standing(attempt.result.score, all.map((a) => a.result!.score));

  return (
    <ResultView
      testTitle={test.title}
      slug={test.slug}
      result={attempt.result}
      rank={rank}
      percentile={percentile}
      candidates={total}
      timedOut={attempt.submitReason === "timeout"}
      questions={test.sections.flatMap((s) => s.questions.map((q) => ({ ...q, section: s.title, mine: attempt.answers[q.id] ?? null })))}
    />
  );
}
