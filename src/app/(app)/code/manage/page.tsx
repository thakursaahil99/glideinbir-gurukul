import { redirect } from "next/navigation";
import { requireUser } from "@/core/auth/current";
import { CodeTabs } from "@/modules/code/components/bits";
import { ManageList } from "@/modules/code/components/manage";
import { canAuthor } from "@/modules/code/service";
import { allTests, listProblems, listSubmissions } from "@/modules/code/store";

export const metadata = { title: "My problems" };

export default async function ManagePage() {
  const user = await requireUser("/code/manage");
  if (!canAuthor(user)) redirect("/code");
  const [problems, tests, subs] = await Promise.all([listProblems(), allTests(), listSubmissions()]);
  const mine = problems
    .filter((p) => p.authorId === user.id || user.role === "admin")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      difficulty: p.difficulty,
      status: p.status,
      updatedAt: p.updatedAt,
      tests: tests.filter((t) => t.problemId === p.id).length,
      submissions: subs.filter((s) => s.problemId === p.id).length,
      accepted: subs.filter((s) => s.problemId === p.id && s.verdict === "accepted").length,
    }));
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-muted uppercase">Coding Practice</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">My problems</h1>
        </div>
        <CodeTabs canAuthor />
      </div>
      <ManageList problems={mine} />
    </div>
  );
}
