import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/core/auth/current";
import { settleIfExpired } from "@/modules/tests/access";
import { AttemptView } from "@/modules/tests/components/attempt-view";
import { publicQuestion } from "@/modules/tests/logic";
import { getAttempt, getTestBySlug } from "@/modules/tests/store";

type Props = { params: Promise<{ slug: string; attemptId: string }> };

export const metadata: Metadata = { title: "Test in progress" };

export default async function AttemptPage({ params }: Props) {
  const { slug, attemptId } = await params;
  const user = await requireUser(`/tests/${slug}`);
  const [test, raw] = await Promise.all([getTestBySlug(slug), getAttempt(attemptId)]);
  if (!test || !raw || raw.testId !== test.id || raw.userId !== user.id) notFound();

  const attempt = await settleIfExpired(raw, test);
  if (attempt.status === "submitted") redirect(`/tests/${slug}/result/${attempt.id}`);

  return (
    <AttemptView
      attemptId={attempt.id}
      title={test.title}
      // Only the client-safe view of each question ever reaches the browser.
      sections={test.sections.map((s) => ({ id: s.id, title: s.title, questions: s.questions.map(publicQuestion) }))}
      answers={attempt.answers}
      marked={attempt.marked}
      deadline={attempt.deadline}
      serverNow={Date.now()}
    />
  );
}
