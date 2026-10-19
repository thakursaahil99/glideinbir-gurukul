import { AdminHeading } from "@/components/admin/admin-shell";
import { userNames } from "@/modules/courses/access";
import { AdminCourses, type AdminCourseRow } from "@/modules/courses/components/admin-courses";
import { courseStatsMap, EMPTY_STATS, getCourseSettings, listCourses, listEnrollments } from "@/modules/courses/store";

export const metadata = { title: "Courses" };

export default async function AdminCoursesPage() {
  const [courses, stats, names, enrollments, settings] = await Promise.all([listCourses(), courseStatsMap(), userNames(), listEnrollments(), getCourseSettings()]);
  const revenue = new Map<string, number>();
  for (const e of enrollments) revenue.set(e.courseId, (revenue.get(e.courseId) ?? 0) + e.pricePaid);

  const rows: AdminCourseRow[] = courses
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      instructorName: names.get(c.instructorId) ?? "Deleted user",
      status: c.status,
      price: c.price,
      students: (stats.get(c.id) ?? EMPTY_STATS).students,
      revenue: revenue.get(c.id) ?? 0,
      demo: !!c.demo,
    }));

  return (
    <>
      <AdminHeading title="Courses" sub="Every course on the platform. Instructors manage content from Courses → Teach; you control visibility and commission here." />
      <AdminCourses rows={rows} commissionPercent={settings.commissionBps / 100} />
    </>
  );
}
