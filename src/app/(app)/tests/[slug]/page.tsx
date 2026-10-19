import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/core/auth/current";
import { getBalance } from "@/core/wallet/store";
import { canTake, ownsOrAdmin, settleIfExpired, submittedAttempts } from "@/modules/tests/access";
import { TestDetail } from "@/modules/tests/components/test-detail";
import { allQuestions, maxScore } from "@/modules/tests/logic";
import { getTestBySlug, listAttempts } from "@/modules/tests/store";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const test = await getTestBySlug((await params).slug);
  return { title: test?.title ?? "Test", description: test?.description };
}

export default async function TestPage({ params }: Props) {
  const { slug } = await params;
  const user = await requireUser(`/tests/${slug}`);
  const test = await getTestBySlug(slug);
  if (!test) notFound();

  const raw = (await listAttempts({ testId: test.id, userId: user.id }))[0];
  const mine = raw ? await settleIfExpired(raw, test) : null;
  if (test.status !== "published" && !ownsOrAdmin(test, user) && !mine) notFound();

  const [submitted, balance, allowed, attempts] = await Promise.all([submittedAttempts(test.id), getBalance(user.id), canTake(test, user), listAttempts({ testId: test.id })]);
  const leaderboard = submitted
    .sort((a, b) => b.result!.score - a.result!.score || a.result!.timeTakenSec - b.result!.timeTakenSec)
    .slice(0, 10)
    .map((a) => ({ name: a.userName, score: a.result!.score, timeSec: a.result!.timeTakenSec, isMe: a.userId === user.id }));

  return (
    <TestDetail
      id={test.id}
      slug={test.slug}
      title={test.title}
      description={test.description}
      exam={test.exam}
      colors={test.colors}
      price={test.price}
      durationMin={test.durationMin}
      instructions={test.instructions}
      demo={test.demo}
      sections={test.sections.map((s) => ({ title: s.title, questions: s.questions.length, marks: s.questions.reduce((n, q) => n + q.marks, 0) }))}
      questions={allQuestions(test).length}
      maxScore={maxScore(test)}
      attempts={attempts.length}
      canTake={allowed}
      isOwner={ownsOrAdmin(test, user)}
      balance={balance}
      mine={mine ? { id: mine.id, status: mine.status } : null}
      leaderboard={leaderboard}
    />
  );
}
