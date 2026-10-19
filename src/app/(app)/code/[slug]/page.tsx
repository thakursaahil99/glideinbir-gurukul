import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/core/auth/current";
import { Workspace } from "@/modules/code/components/workspace";
import { runnerInfo } from "@/modules/code/runner";
import { publicProblem, solvedBy } from "@/modules/code/service";
import { getProblemBySlug, listComments, listSubmissions } from "@/modules/code/store";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProblemBySlug((await params).slug);
  return { title: p?.status === "published" ? p.title : "Problem" };
}

export default async function ProblemPage({ params }: Props) {
  const user = await requireUser("/code");
  const p = await getProblemBySlug((await params).slug);
  // Drafts are only visible to their author (and admins) for testing.
  if (!p || (p.status !== "published" && p.authorId !== user.id && user.role !== "admin")) notFound();
  const [problem, subs, comments] = await Promise.all([publicProblem(p), listSubmissions(), listComments(p.id)]);
  const mine = subs.filter((s) => s.problemId === p.id && s.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div className="-mt-4">
      <Workspace key={p.id} problem={problem} runnable={runnerInfo().langs} solved={solvedBy(subs, user.id).has(p.id)} submissions={mine.slice(0, 50)} comments={comments} userId={user.id} isAdmin={user.role === "admin"} />
    </div>
  );
}
