"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { requireUser } from "@/core/auth/current";
import { canTeach, coursesEnabled, ownsOrAdmin } from "./access";
import { publishProblems, uniqueSlug } from "./logic";
import { courseDraftSchema } from "./schema";
import { deleteCourse, getCourse, insertCourse, listCourses, listEnrollments, updateCourse } from "./store";
import type { Course } from "./types";

export interface TeachResult {
  ok: boolean;
  error?: string;
  problems?: string[];
}

async function requireTeacher() {
  const user = await requireUser("/courses/teach");
  if (!canTeach(user) || !(await coursesEnabled())) redirect("/courses");
  return user;
}

async function ownedCourse(id: unknown) {
  const user = await requireTeacher();
  if (typeof id !== "string") return { user, course: null };
  const course = await getCourse(id);
  return { user, course: course && ownsOrAdmin(course, user) ? course : null };
}

/** Returns the new course id; the client navigates to the editor itself. */
export async function createCourseAction(rawTitle: unknown): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await requireTeacher();
  const title = (typeof rawTitle === "string" ? rawTitle : "").trim().slice(0, 120);
  if (title.length < 3) return { ok: false, error: "Give the course a title of at least 3 characters" };
  const taken = new Set((await listCourses()).map((c) => c.slug));
  const now = new Date().toISOString();
  const course: Course = {
    id: randomUUID(),
    slug: uniqueSlug(title, taken),
    instructorId: user.id,
    title,
    subtitle: "",
    description: "",
    category: "Other",
    level: "beginner",
    language: "Hinglish",
    price: 0,
    colors: ["#ff8a00", "#5b47ff"],
    outcomes: [],
    sections: [{ id: randomUUID(), title: "Getting started", lectures: [] }],
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
  await insertCourse(course);
  return { ok: true, id: course.id };
}

export async function saveCourseAction(id: unknown, draft: unknown): Promise<TeachResult> {
  const { course } = await ownedCourse(id);
  if (!course) return { ok: false, error: "Course not found" };
  const parsed = courseDraftSchema.safeParse(draft);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: i ? `${i.path.filter((p) => typeof p !== "symbol").join(" › ")}: ${i.message}` : "Invalid input" };
  }
  const { priceRupees, ...rest } = parsed.data;
  const next: Course = { ...course, ...rest, price: priceRupees * 100 };

  // A live course must stay publishable; unpublish first to make breaking edits.
  if (course.status === "published") {
    const problems = publishProblems(next);
    if (problems.length) return { ok: false, error: "A published course must stay complete", problems };
  }
  await updateCourse(course.id, () => next);
  return { ok: true };
}

export async function setCourseStatusAction(id: unknown, status: unknown): Promise<TeachResult> {
  const { course } = await ownedCourse(id);
  if (!course) return { ok: false, error: "Course not found" };
  if (status !== "published" && status !== "draft") return { ok: false, error: "Invalid status" };
  if (status === "published") {
    const problems = publishProblems(course);
    if (problems.length) return { ok: false, error: "Not ready to publish", problems };
  }
  await updateCourse(course.id, (c) => ({ ...c, status, publishedAt: status === "published" ? (c.publishedAt ?? new Date().toISOString()) : c.publishedAt }));
  return { ok: true };
}

/** Courses with learners are archived instead, so nobody loses access to what they paid for. */
export async function deleteCourseAction(id: unknown): Promise<TeachResult> {
  const { course } = await ownedCourse(id);
  if (!course) return { ok: false, error: "Course not found" };
  if ((await listEnrollments({ courseId: course.id })).length > 0)
    return { ok: false, error: "This course has students. Unpublish it instead; enrolled learners keep access." };
  await deleteCourse(course.id);
  return { ok: true };
}
