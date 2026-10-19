import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/core/auth/current";
import { getBalance } from "@/core/wallet/store";
import { toCourseView, viewerOf } from "@/modules/courses/access";
import { CourseDetail } from "@/modules/courses/components/course-detail";
import { allLectures, progressPercent, resumeLecture, totalDurationSec } from "@/modules/courses/logic";
import { courseStatsMap, EMPTY_STATS, findCertificate, getCourseBySlug, listProgress, listReviews } from "@/modules/courses/store";
import { userNames } from "@/modules/courses/access";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const course = await getCourseBySlug((await params).slug);
  return { title: course?.title ?? "Course", description: course?.subtitle };
}

export default async function CoursePage({ params }: Props) {
  const { slug } = await params;
  const user = await requireUser(`/courses/${slug}`);
  const course = await getCourseBySlug(slug);
  if (!course) notFound();

  const viewer = await viewerOf(course, user);
  // Drafts and archived courses stay visible only to their owner and to people who already bought them.
  if (course.status !== "published" && !viewer.isOwnerOrAdmin && !viewer.enrolled) notFound();

  const [stats, names, reviews, progress, cert, balance] = await Promise.all([
    courseStatsMap(),
    userNames(),
    listReviews(course.id),
    listProgress(user.id, course.id),
    findCertificate(user.id, course.id),
    getBalance(user.id),
  ]);

  const access = viewer.isOwnerOrAdmin ? "owner" : viewer.enrolled ? "enrolled" : "none";
  const resume = access === "none" ? null : resumeLecture(course, progress);

  return (
    <CourseDetail
      course={toCourseView(course, viewer)}
      stats={stats.get(course.id) ?? EMPTY_STATS}
      instructorName={names.get(course.instructorId) ?? "Glideinbir Gurukul"}
      reviews={reviews.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))}
      myReview={reviews.find((r) => r.userId === user.id) ?? null}
      access={access}
      balance={balance}
      progress={progressPercent(course, progress)}
      resumeLectureId={resume?.id ?? null}
      certificateCode={cert?.code ?? null}
      totalSec={totalDurationSec(course)}
      lectureCount={allLectures(course).length}
      viewerName={user.name}
    />
  );
}
