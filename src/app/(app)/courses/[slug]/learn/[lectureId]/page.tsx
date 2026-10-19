import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/core/auth/current";
import { toCourseView, viewerOf } from "@/modules/courses/access";
import { LearnView } from "@/modules/courses/components/learn-view";
import { canAccessLecture, findLecture } from "@/modules/courses/logic";
import { findCertificate, getCourseBySlug, listProgress } from "@/modules/courses/store";

type Props = { params: Promise<{ slug: string; lectureId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, lectureId } = await params;
  const course = await getCourseBySlug(slug);
  return { title: (course && findLecture(course, lectureId)?.title) ?? "Lecture" };
}

export default async function LearnPage({ params }: Props) {
  const { slug, lectureId } = await params;
  const user = await requireUser(`/courses/${slug}/learn/${lectureId}`);
  const course = await getCourseBySlug(slug);
  const lecture = course && findLecture(course, lectureId);
  if (!course || !lecture) notFound();

  const viewer = await viewerOf(course, user);
  if (course.status !== "published" && !viewer.isOwnerOrAdmin && !viewer.enrolled) notFound();
  if (!canAccessLecture(lecture, viewer)) redirect(`/courses/${slug}`);

  const [progress, cert] = await Promise.all([listProgress(user.id, course.id), findCertificate(user.id, course.id)]);
  const mine = progress.find((p) => p.lectureId === lectureId);

  return (
    <LearnView
      course={toCourseView(course, viewer)}
      lectureId={lectureId}
      startAt={mine && !mine.completed ? mine.positionSec : 0}
      completedIds={progress.filter((p) => p.completed).map((p) => p.lectureId)}
      tracking={viewer.enrolled}
      certificateCode={cert?.code ?? null}
    />
  );
}
