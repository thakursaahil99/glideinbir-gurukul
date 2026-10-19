import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/core/auth/current";
import { canTeach, ownsOrAdmin, settleIfExpired } from "@/modules/tests/access";
import { TestEditor } from "@/modules/tests/components/test-editor";
import { maxScore } from "@/modules/tests/logic";
import { getTest, listAttempts } from "@/modules/tests/store";

export const metadata = { title: "Edit test" };

export default async function EditTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/tests/teach/${id}`);
  if (!canTeach(user)) redirect("/tests");
  const test = await getTest(id);
  if (!test || !ownsOrAdmin(test, user)) notFound();

  const attempts = await Promise.all((await listAttempts({ testId: id })).map((a) => settleIfExpired(a, test)));

  return (
    <TestEditor
      id={test.id}
      slug={test.slug}
      status={test.status}
      initial={{
        title: test.title,
        description: test.description,
        exam: test.exam,
        durationMin: test.durationMin,
        priceRupees: Math.round(test.price / 100),
        colors: test.colors,
        instructions: test.instructions,
        sections: test.sections,
      }}
      attempts={attempts.map((a) => ({ id: a.id, name: a.userName, status: a.status, score: a.result?.score ?? null, maxScore: maxScore(test), startedAt: a.startedAt }))}
    />
  );
}
