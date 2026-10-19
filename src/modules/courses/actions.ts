"use server";

import { requireUser } from "@/core/auth/current";
import { notify } from "@/core/notifications/store";
import { rateLimit } from "@/core/security/rate-limit";
import { commissionFor, WalletError } from "@/core/wallet/ledger";
import { getBalance, walletTransfer } from "@/core/wallet/store";
import { formatPaise } from "@/lib/utils";
import { coursesEnabled, viewerOf } from "./access";
import { maybeIssueCertificate } from "./certificate";
import { allLectures, canAccessLecture, findLecture, isWatched } from "./logic";
import { progressSchema, reviewSchema } from "./schema";
import { ensureEnrollment, getCourse, getCourseSettings, isEnrolled, saveProgress, upsertReview } from "./store";

/** On success, `learnUrl` is where to send the learner next (their resume lecture). */
export type BuyResult = { ok: true; learnUrl: string } | { ok: false; error: string; shortfall?: number };

/**
 * Buy with the wallet. The student pays the full price; the instructor gets it
 * minus platform commission. The ledger key makes a retry (double click, or
 * after a Razorpay top-up) charge at most once, and enrollment is idempotent.
 */
export async function buyCourseAction(courseId: unknown): Promise<BuyResult> {
  const user = await requireUser("/courses");
  if (typeof courseId !== "string" || !(await coursesEnabled())) return { ok: false, error: "Course not found" };
  if (!rateLimit(`buy:${user.id}`, 10, 60_000).ok) return { ok: false, error: "Too many attempts. Wait a minute." };

  const course = await getCourse(courseId);
  if (!course || course.status !== "published") return { ok: false, error: "This course isn't available" };
  if (course.instructorId === user.id) return { ok: false, error: "You can't buy your own course" };
  const first = allLectures(course)[0];
  const learnUrl = first ? `/courses/${course.slug}/learn/${first.id}` : `/courses/${course.slug}`;
  if (await isEnrolled(user.id, course.id)) return { ok: true, learnUrl };

  if (course.price > 0) {
    const { commissionBps } = await getCourseSettings();
    try {
      const res = await walletTransfer({
        from: user.id,
        to: course.instructorId,
        amount: course.price,
        commissionBps,
        key: `course:${course.id}:${user.id}`,
        note: `Course: ${course.title}`,
        ref: `course:${course.id}`,
      });
      if (!res.duplicate) {
        const earned = course.price - commissionFor(course.price, commissionBps);
        await notify(course.instructorId, {
          kind: "wallet",
          title: `New student in ${course.title}`,
          body: `${user.name} enrolled. You earned ${formatPaise(earned)}.`,
          href: "/courses/teach",
        });
      }
    } catch (e) {
      if (e instanceof WalletError && e.code === "INSUFFICIENT_FUNDS")
        return { ok: false, error: "Not enough wallet balance", shortfall: course.price - (await getBalance(user.id)) };
      if (e instanceof WalletError) return { ok: false, error: e.message };
      throw e;
    }
  }

  await ensureEnrollment(user.id, course.id, course.price);
  await notify(user.id, {
    kind: "module",
    title: `You're enrolled in ${course.title}`,
    body: course.price ? `${formatPaise(course.price)} paid from your wallet. Happy learning!` : "Free course. Happy learning!",
    href: `/courses/${course.slug}`,
  });
  return { ok: true, learnUrl };
}

/** Called by the player every few seconds and on pause/end. Returns a certificate code when the course hits 100%. */
export async function saveProgressAction(input: unknown): Promise<{ ok: boolean; certificate?: string }> {
  const user = await requireUser("/courses");
  const parsed = progressSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { courseId, lectureId, positionSec, completed } = parsed.data;

  const course = await getCourse(courseId);
  const lecture = course && findLecture(course, lectureId);
  if (!course || !lecture) return { ok: false };
  const viewer = await viewerOf(course, user);
  // Progress is tracked for enrolled learners only (owners and preview viewers just watch).
  if (!viewer.enrolled || !canAccessLecture(lecture, viewer)) return { ok: false };

  const done = completed ?? (isWatched(positionSec, lecture.durationSec) ? true : undefined);
  await saveProgress({ userId: user.id, courseId, lectureId, positionSec: Math.floor(positionSec), completed: done });

  if (done === true) {
    const cert = await maybeIssueCertificate(user.id, course);
    if (cert) return { ok: true, certificate: cert.code };
  }
  return { ok: true };
}

export async function submitReviewAction(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser("/courses");
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const course = await getCourse(parsed.data.courseId);
  if (!course) return { ok: false, error: "Course not found" };
  if (!(await isEnrolled(user.id, course.id))) return { ok: false, error: "Only enrolled learners can review" };

  await upsertReview({ courseId: course.id, userId: user.id, userName: user.name, rating: parsed.data.rating, text: parsed.data.text });
  return { ok: true };
}
