import type { Metadata } from "next";
import { requireUser } from "@/core/auth/current";
import { getSite } from "@/core/site/store";
import { CodeTabs } from "@/modules/code/components/bits";
import { ProblemList, type ProblemRow } from "@/modules/code/components/problem-list";
import { canAuthor, progressOf } from "@/modules/code/service";
import { listProblems, listSubmissions } from "@/modules/code/store";
import { DIFFICULTIES } from "@/modules/code/types";
import { ensureStarterContent } from "@/app/starter-content";

export async function generateMetadata(): Promise<Metadata> {
  const { modules } = await getSite();
  return { title: modules.find((m) => m.key === "code")?.name ?? "Coding Practice" };
}

export default async function CodePage() {
  const user = await requireUser("/code");
  // Layout and page render in parallel: make sure starter content exists before reading.
  await ensureStarterContent();
  const [problems, subs, progress] = await Promise.all([listProblems(), listSubmissions(), progressOf(user.id)]);
  const rows: ProblemRow[] = problems
    .filter((p) => p.status === "published")
    .sort((a, b) => DIFFICULTIES.indexOf(a.difficulty) - DIFFICULTIES.indexOf(b.difficulty) || a.createdAt.localeCompare(b.createdAt))
    .map((p) => {
      const mine = subs.filter((s) => s.problemId === p.id);
      return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        difficulty: p.difficulty,
        tags: p.tags,
        acceptance: mine.length ? Math.round((mine.filter((s) => s.verdict === "accepted").length / mine.length) * 100) : null,
        solvers: new Set(mine.filter((s) => s.verdict === "accepted").map((s) => s.userId)).size,
        state: progress.solved.has(p.id) ? "solved" : progress.attempted.has(p.id) ? "attempted" : "todo",
      };
    });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-muted uppercase">Coding Practice</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Solve. Submit. <span className="bg-gradient-to-r from-[#2ee6c5] to-[#5b47ff] bg-clip-text text-transparent">Climb.</span>
          </h1>
          <p className="mt-2 max-w-xl text-muted">Real judge, hidden tests, instant verdicts. Keep your daily streak burning.</p>
        </div>
        <CodeTabs canAuthor={canAuthor(user)} />
      </div>
      <ProblemList problems={rows} progress={{ counts: progress.counts, streak: progress.streak, best: progress.best, days: progress.days }} serverNow={Date.now()} />
    </div>
  );
}
