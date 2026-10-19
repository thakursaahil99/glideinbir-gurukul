import type { Metadata } from "next";
import { requireUser } from "@/core/auth/current";
import { getSite } from "@/core/site/store";
import { canTeach } from "@/modules/tests/access";
import { TestsTabs } from "@/modules/tests/components/bits";
import { TestFilters, TestGrid } from "@/modules/tests/components/catalog";
import { loadTestCards } from "@/modules/tests/queries";
import { EXAMS } from "@/modules/tests/types";
import { ensureStarterContent } from "@/app/starter-content";

export async function generateMetadata(): Promise<Metadata> {
  const { modules } = await getSite();
  return { title: modules.find((m) => m.key === "tests")?.name ?? "Test Series" };
}

export default async function TestsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("/tests");
  // Layout and page render in parallel: make sure starter content exists before reading.
  await ensureStarterContent();
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = one("q").trim().toLowerCase().slice(0, 80);
  const exam = (EXAMS as readonly string[]).includes(one("exam")) ? one("exam") : "";
  const price = one("price");

  const all = await loadTestCards(user);
  const items = all
    .filter((t) => !q || t.title.toLowerCase().includes(q) || t.exam.toLowerCase().includes(q))
    .filter((t) => !exam || t.exam === exam)
    .filter((t) => (price === "free" ? t.price === 0 : price === "paid" ? t.price > 0 : true))
    .sort((a, b) => b.attempts - a.attempts);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-muted uppercase">Test Series</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Practise like it&apos;s <span className="text-gradient">exam day</span>
          </h1>
        </div>
        <TestsTabs canTeach={canTeach(user)} />
      </div>
      {all.length === 0 ? (
        <div className="glass rounded-[28px] px-6 py-16 text-center">
          <p className="font-display text-2xl font-bold">No tests yet</p>
          <p className="mx-auto mt-2 max-w-md text-muted">
            {user.role === "admin" ? "Load the demo tests from Admin → Tests, or create one from the Teach tab." : "New mock tests are on the way. Check back soon!"}
          </p>
        </div>
      ) : (
        <>
          <TestFilters total={items.length} />
          <TestGrid items={items} empty="Try a different search or exam." />
        </>
      )}
    </div>
  );
}
