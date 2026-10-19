import { requireUser } from "@/core/auth/current";
import { canTeach } from "@/modules/courses/access";
import { CoursesTabs } from "@/modules/courses/components/bits";
import { MyLearning, type LearningItem } from "@/modules/courses/components/my-learning";
import { progressPercent, resumeLecture } from "@/modules/courses/logic";
import { loadCatalogContext } from "@/modules/courses/queries";
import { listCertificates, listProgress } from "@/modules/courses/store";

export const metadata = { title: "My learning" };

export default async function MyLearningPage() {
  const user = await requireUser("/courses/my");
  const [ctx, progress, certs] = await Promise.all([loadCatalogContext(user.id), listProgress(user.id), listCertificates(user.id)]);
  const byId = new Map(ctx.courses.map((c) => [c.id, c]));

  const items: LearningItem[] = ctx.enrollments
    .map((e) => {
      const c = byId.get(e.courseId);
      if (!c) return null;
      const rows = progress.filter((p) => p.courseId === c.id);
      const resume = resumeLecture(c, rows);
      const last = rows.map((r) => r.updatedAt).sort().pop() ?? e.createdAt;
      return {
        id: c.id,
        slug: c.slug,
        title: c.title,
        category: c.category,
        colors: c.colors,
        instructorName: ctx.nameOf(c.instructorId),
        progress: progressPercent(c, rows),
        resumeLectureId: resume?.id ?? null,
        resumeTitle: resume?.title ?? null,
        certificateCode: certs.find((x) => x.courseId === c.id)?.code ?? null,
        lastActivity: last,
      };
    })
    .filter((x): x is LearningItem => x !== null)
    .sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-muted uppercase">Courses</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">My learning</h1>
        </div>
        <CoursesTabs canTeach={canTeach(user)} />
      </div>
      <MyLearning items={items} />
    </div>
  );
}
