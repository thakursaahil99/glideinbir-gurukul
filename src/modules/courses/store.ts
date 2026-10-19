import { randomInt, randomUUID } from "node:crypto";
import { readJson, updateJson } from "@/core/db/json-store";
import { certificateCode } from "./logic";
import type { Certificate, Course, CourseSettings, CourseStats, Enrollment, LectureProgress, Review } from "./types";

const F = {
  courses: "courses_courses.json",
  enrollments: "courses_enrollments.json",
  progress: "courses_progress.json",
  reviews: "courses_reviews.json",
  certificates: "courses_certificates.json",
  settings: "courses_settings.json",
};

const arr = <T>(raw: unknown): T[] => (Array.isArray(raw) ? (raw as T[]) : []);
const now = () => new Date().toISOString();

/* ---------------- Courses ---------------- */

export async function listCourses() {
  return arr<Course>(await readJson(F.courses));
}

export async function getCourse(id: string) {
  return (await listCourses()).find((c) => c.id === id) ?? null;
}

export async function getCourseBySlug(slug: string) {
  return (await listCourses()).find((c) => c.slug === slug) ?? null;
}

export async function insertCourse(course: Course) {
  await updateJson(F.courses, arr<Course>, (all) => [...all, course]);
  return course;
}

/** Applies `change` to one course inside the write queue; returns the updated course. */
export async function updateCourse(id: string, change: (c: Course) => Course) {
  let updated: Course | null = null;
  await updateJson(F.courses, arr<Course>, (all) =>
    all.map((c) => {
      if (c.id !== id) return c;
      updated = { ...change(c), id: c.id, instructorId: c.instructorId, createdAt: c.createdAt, updatedAt: now() };
      return updated;
    }),
  );
  return updated as Course | null;
}

export async function deleteCourse(id: string) {
  await updateJson(F.courses, arr<Course>, (all) => all.filter((c) => c.id !== id));
}

/* ---------------- Enrollments ---------------- */

export async function listEnrollments(filter: { userId?: string; courseId?: string } = {}) {
  return arr<Enrollment>(await readJson(F.enrollments)).filter(
    (e) => (!filter.userId || e.userId === filter.userId) && (!filter.courseId || e.courseId === filter.courseId),
  );
}

export async function isEnrolled(userId: string, courseId: string) {
  return (await listEnrollments({ userId, courseId })).length > 0;
}

/** Idempotent: a second call for the same user and course returns the existing row. */
export async function ensureEnrollment(userId: string, courseId: string, pricePaid: number) {
  let row: Enrollment | undefined;
  await updateJson(F.enrollments, arr<Enrollment>, (all) => {
    row = all.find((e) => e.userId === userId && e.courseId === courseId);
    if (row) return all;
    row = { id: randomUUID(), userId, courseId, pricePaid, createdAt: now() };
    return [...all, row];
  });
  return row!;
}

/* ---------------- Progress ---------------- */

export async function listProgress(userId: string, courseId?: string) {
  return arr<LectureProgress>(await readJson(F.progress)).filter((p) => p.userId === userId && (!courseId || p.courseId === courseId));
}

export async function listCourseProgress(courseId: string) {
  return arr<LectureProgress>(await readJson(F.progress)).filter((p) => p.courseId === courseId);
}

/** Upserts one lecture's progress. `completed` never flips back to false unless set explicitly. */
export async function saveProgress(row: Omit<LectureProgress, "updatedAt" | "completed"> & { completed?: boolean }) {
  await updateJson(F.progress, arr<LectureProgress>, (all) => {
    const i = all.findIndex((p) => p.userId === row.userId && p.lectureId === row.lectureId);
    const prev = i >= 0 ? all[i] : undefined;
    const next: LectureProgress = {
      userId: row.userId,
      courseId: row.courseId,
      lectureId: row.lectureId,
      positionSec: row.positionSec,
      completed: row.completed ?? prev?.completed ?? false,
      updatedAt: now(),
    };
    if (i < 0) return [...all, next];
    const copy = all.slice();
    copy[i] = next;
    return copy;
  });
}

/* ---------------- Reviews ---------------- */

export async function listReviews(courseId?: string) {
  return arr<Review>(await readJson(F.reviews)).filter((r) => !courseId || r.courseId === courseId);
}

export async function upsertReview(input: Omit<Review, "id" | "createdAt" | "updatedAt">) {
  await updateJson(F.reviews, arr<Review>, (all) => {
    const i = all.findIndex((r) => r.courseId === input.courseId && r.userId === input.userId);
    if (i < 0) return [...all, { ...input, id: randomUUID(), createdAt: now(), updatedAt: now() }];
    const copy = all.slice();
    copy[i] = { ...copy[i]!, ...input, updatedAt: now() };
    return copy;
  });
}

/* ---------------- Stats ---------------- */

/** Students and ratings for every course, computed in one pass over each file. */
export async function courseStatsMap(): Promise<Map<string, CourseStats>> {
  const [enrollments, reviews] = await Promise.all([listEnrollments(), listReviews()]);
  const map = new Map<string, CourseStats & { sum: number }>();
  const get = (id: string) => map.get(id) ?? map.set(id, { students: 0, rating: 0, reviews: 0, sum: 0 }).get(id)!;
  for (const e of enrollments) get(e.courseId).students++;
  for (const r of reviews) {
    const s = get(r.courseId);
    s.reviews++;
    s.sum += r.rating;
  }
  const out = new Map<string, CourseStats>();
  for (const [id, s] of map) out.set(id, { students: s.students, reviews: s.reviews, rating: s.reviews ? Math.round((s.sum / s.reviews) * 10) / 10 : 0 });
  return out;
}

export const EMPTY_STATS: CourseStats = { students: 0, rating: 0, reviews: 0 };

/* ---------------- Certificates ---------------- */

export async function getCertificate(code: string) {
  return arr<Certificate>(await readJson(F.certificates)).find((c) => c.code === code) ?? null;
}

export async function findCertificate(userId: string, courseId: string) {
  return arr<Certificate>(await readJson(F.certificates)).find((c) => c.userId === userId && c.courseId === courseId) ?? null;
}

export async function listCertificates(userId: string) {
  return arr<Certificate>(await readJson(F.certificates)).filter((c) => c.userId === userId);
}

/** One certificate per user and course; returns the existing one on repeat. */
export async function issueCertificate(input: Omit<Certificate, "code" | "issuedAt">): Promise<{ cert: Certificate; created: boolean }> {
  let cert: Certificate | undefined;
  let created = false;
  await updateJson(F.certificates, arr<Certificate>, (all) => {
    cert = all.find((c) => c.userId === input.userId && c.courseId === input.courseId);
    if (cert) return all;
    const taken = new Set(all.map((c) => c.code));
    let code = certificateCode(() => randomInt(0, 1_000_000) / 1_000_000);
    while (taken.has(code)) code = certificateCode(() => randomInt(0, 1_000_000) / 1_000_000);
    cert = { ...input, code, issuedAt: now() };
    created = true;
    return [...all, cert];
  });
  return { cert: cert!, created };
}

/* ---------------- Settings ---------------- */

const DEFAULT_SETTINGS: CourseSettings = { commissionBps: 2000 };

const parseSettings = (raw: unknown): CourseSettings => {
  const bps = (raw as CourseSettings | undefined)?.commissionBps;
  return Number.isInteger(bps) && bps! >= 0 && bps! <= 10_000 ? { commissionBps: bps! } : DEFAULT_SETTINGS;
};

export async function getCourseSettings() {
  return parseSettings(await readJson(F.settings));
}

export async function saveCourseSettings(s: CourseSettings) {
  await updateJson(F.settings, parseSettings, () => s);
}
