import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/core/auth/current";
import { canTeach, ownsOrAdmin, userNames } from "@/modules/courses/access";
import { CourseEditor } from "@/modules/courses/components/course-editor";
import { progressPercent } from "@/modules/courses/logic";
import { getCourse, listCourseProgress, listEnrollments } from "@/modules/courses/store";

export const metadata = { title: "Edit course" };

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/courses/teach/${id}`);
  if (!canTeach(user)) redirect("/courses");
  const course = await getCourse(id);
  if (!course || !ownsOrAdmin(course, user)) notFound();

  const [enrollments, progress, names] = await Promise.all([listEnrollments({ courseId: id }), listCourseProgress(id), userNames()]);

  return (
    <CourseEditor
      id={course.id}
      slug={course.slug}
      status={course.status}
      initial={{
        title: course.title,
        subtitle: course.subtitle,
        description: course.description,
        category: course.category,
        level: course.level,
        language: course.language,
        priceRupees: Math.round(course.price / 100),
        colors: course.colors,
        outcomes: course.outcomes,
        sections: course.sections,
      }}
      students={enrollments.map((e) => ({
        name: names.get(e.userId) ?? "Deleted user",
        enrolledAt: e.createdAt,
        paid: e.pricePaid,
        progress: progressPercent(course, progress.filter((p) => p.userId === e.userId)),
      }))}
    />
  );
}
