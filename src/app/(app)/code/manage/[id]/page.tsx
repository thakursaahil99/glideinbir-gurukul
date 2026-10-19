import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/core/auth/current";
import { ProblemEditor } from "@/modules/code/components/problem-editor";
import { runnerInfo } from "@/modules/code/runner";
import { canAuthor } from "@/modules/code/service";
import { getProblem, listTests } from "@/modules/code/store";

export const metadata = { title: "Edit problem" };

export default async function EditProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("/code/manage");
  if (!canAuthor(user)) redirect("/code");
  const { id } = await params;
  const p = /^[0-9a-f-]{36}$/.test(id) ? await getProblem(id) : null;
  if (!p || (p.authorId !== user.id && user.role !== "admin")) notFound();
  return (
    <div className="mx-auto max-w-5xl">
      <ProblemEditor key={p.id} initial={p} initialTests={await listTests(p.id)} runnable={runnerInfo().langs} />
    </div>
  );
}
