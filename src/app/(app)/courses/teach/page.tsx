import { redirect } from "next/navigation";
import { requireUser } from "@/core/auth/current";
import { listEntries } from "@/core/wallet/store";
import { canTeach } from "@/modules/courses/access";
import { CoursesTabs } from "@/modules/courses/components/bits";
import { TeachDashboard, type TeachRow } from "@/modules/courses/components/teach-dashboard";
import { courseStatsMap, EMPTY_STATS, getCourseSettings, listCourses } from "@/modules/courses/store";

export const metadata = { title: "Teach" };

export default async function TeachPage() {
  const user = await requireUser("/courses/teach");
  if (!canTeach(user)) redirect("/courses");

  const [courses, stats, entries, settings] = await Promise.all([listCourses(), courseStatsMap(), listEntries(user.id, 10_000), getCourseSettings()]);
  const earnedBy = new Map<string, number>();
  for (const e of entries) if (e.type === "transfer_in" && e.ref?.startsWith("course:")) earnedBy.set(e.ref.slice(7), (earnedBy.get(e.ref.slice(7)) ?? 0) + e.amount);

  const rows: TeachRow[] = courses
    .filter((c) => c.instructorId === user.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((c) => {
      const s = stats.get(c.id) ?? EMPTY_STATS;
      return {
        id: c.id,
        slug: c.slug,
        title: c.title,
        category: c.category,
        colors: c.colors,
        status: c.status,
        price: c.price,
        students: s.students,
        rating: s.rating,
        reviews: s.reviews,
        earned: earnedBy.get(c.id) ?? 0,
        updatedAt: c.updatedAt,
      };
    });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-muted uppercase">Instructor</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">Teach on Glideinbir</h1>
        </div>
        <CoursesTabs canTeach />
      </div>
      <TeachDashboard rows={rows} commissionPercent={settings.commissionBps / 100} />
    </div>
  );
}
