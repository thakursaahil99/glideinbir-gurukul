import type { Metadata } from "next";
import { requireUser } from "@/core/auth/current";
import { getSite } from "@/core/site/store";
import { canTeach } from "@/modules/courses/access";
import { CoursesTabs } from "@/modules/courses/components/bits";
import { CatalogFilters, CourseGrid } from "@/modules/courses/components/catalog";
import { filterCatalog, parseCatalogQuery } from "@/modules/courses/logic";
import { loadCatalogContext, toCard } from "@/modules/courses/queries";
import { CATEGORIES, LEVELS } from "@/modules/courses/types";
import { ensureStarterContent } from "@/app/starter-content";

export async function generateMetadata(): Promise<Metadata> {
  const { modules } = await getSite();
  return { title: modules.find((m) => m.key === "courses")?.name ?? "Courses" };
}

export default async function CoursesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("/courses");
  // Layout and page render in parallel: make sure starter content exists before reading.
  await ensureStarterContent();
  const query = parseCatalogQuery(await searchParams, CATEGORIES, LEVELS);
  const ctx = await loadCatalogContext(user.id);

  const items = filterCatalog(
    ctx.courses.filter((c) => c.status === "published").map((course) => ({ course, stats: ctx.statsOf(course.id), instructorName: ctx.nameOf(course.instructorId) })),
    query,
  ).map(({ course, stats, instructorName }) => toCard(course, stats, instructorName, ctx.enrolledIds.has(course.id)));

  const empty = ctx.courses.every((c) => c.status !== "published");

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-muted uppercase">Courses</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Learn from the <span className="text-gradient">best</span>
          </h1>
        </div>
        <CoursesTabs canTeach={canTeach(user)} />
      </div>

      {empty ? (
        <div className="glass rounded-[28px] px-6 py-16 text-center">
          <p className="font-display text-2xl font-bold">No courses yet</p>
          <p className="mx-auto mt-2 max-w-md text-muted">
            {user.role === "admin"
              ? "Load the demo courses from Admin → Courses, or create your own from the Teach tab."
              : canTeach(user)
                ? "Be the first: create a course from the Teach tab."
                : "New courses are on the way. Check back soon!"}
          </p>
        </div>
      ) : (
        <>
          <CatalogFilters total={items.length} />
          <CourseGrid items={items} />
        </>
      )}
    </div>
  );
}
