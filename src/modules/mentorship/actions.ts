"use server";

import { z } from "zod";
import { requireAdmin, requireUser } from "@/core/auth/current";
import { rateLimit } from "@/core/security/rate-limit";
import { livekitConfigured, livekitMeetUrl, livekitToken } from "@/core/video/livekit";
import { firstName, MAX_PRICE, MIN_PRICE, phaseOf, slotsAhead, weeklyError } from "./logic";
import { book, busyOf, cancel, isMentorRole, mentorshipEnabled, reschedule, settle } from "./service";
import { getBooking, getMentor, listBookings, saveMentorshipSettings, transition, upsertMentor } from "./store";
import { BUFFERS, SESSION_LENGTHS, type Booking } from "./types";

type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });
const uuid = z.string().regex(/^[0-9a-f-]{36}$/);

async function load(id: unknown) {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return null;
  const b = await getBooking(parsed.data);
  return b ? settle(b) : null;
}

const roleIn = (b: Booking, userId: string) => (b.studentId === userId ? "student" : b.mentorId === userId ? "mentor" : null);

async function requireMentorshipUser() {
  const user = await requireUser("/mentorship");
  return (await mentorshipEnabled()) ? user : null;
}

/* ================= Learner ================= */

/** Fresh free slots for a mentor (used after a clash, and when rescheduling). */
export async function mentorSlotsAction(mentorId: unknown, exceptBookingId?: unknown) {
  const user = await requireMentorshipUser();
  if (!user) return fail("Mentorship is switched off right now");
  const m = typeof mentorId === "string" ? await getMentor(mentorId) : null;
  if (!m || (!m.published && m.userId !== user.id)) return fail("Mentor not found");
  const except = typeof exceptBookingId === "string" ? exceptBookingId : undefined;
  return { ok: true as const, days: slotsAhead(m, busyOf(await listBookings(), m.userId, except), Date.now()) };
}

const bookSchema = z.object({
  mentorId: uuid,
  start: z.iso.datetime(),
  agenda: z.string().trim().min(10, "Tell the mentor what you'd like to discuss (at least 10 characters)").max(600),
});

export async function bookSessionAction(input: unknown): Promise<{ ok: true; id: string } | Fail> {
  const user = await requireMentorshipUser();
  if (!user) return fail("Mentorship is switched off right now");
  const parsed = bookSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid booking");
  if (!rateLimit(`mbook:${user.id}`, 10, 10 * 60_000).ok) return fail("Too many bookings in a short time. Try again in a few minutes.");
  const mentor = await getMentor(parsed.data.mentorId);
  if (!mentor?.published) return fail("This mentor isn't taking bookings");
  if (mentor.userId === user.id) return fail("You can't book yourself");
  const res = await book(user, mentor, parsed.data.start, parsed.data.agenda);
  return res.ok ? { ok: true, id: res.booking.id } : fail(res.error);
}

export async function cancelBookingAction(id: unknown, reason?: unknown): Promise<{ ok: true; refund: number } | Fail> {
  const user = await requireUser("/mentorship");
  const b = await load(id);
  const role = b && roleIn(b, user.id);
  if (!b || !role) return fail("Booking not found");
  const why = z.string().trim().max(300).catch("").parse(reason ?? "");
  if (role === "mentor" && why.length < 5) return fail("Tell the learner why you're cancelling");
  const res = await cancel(b, role, why);
  return res.ok ? { ok: true, refund: res.booking.refund ?? 0 } : fail(res.error);
}

export async function rescheduleBookingAction(id: unknown, start: unknown): Promise<{ ok: true } | Fail> {
  const user = await requireUser("/mentorship");
  if (!z.iso.datetime().safeParse(start).success) return fail("Pick a new slot");
  const b = await load(id);
  const role = b && roleIn(b, user.id);
  if (!b || !role) return fail("Booking not found");
  const mentor = await getMentor(b.mentorId);
  if (!mentor) return fail("Mentor not found");
  const res = await reschedule(b, mentor, start as string, role);
  return res.ok ? { ok: true } : fail(res.error);
}

const feedbackSchema = z.object({ stars: z.number().int().min(1).max(5), text: z.string().trim().max(800) });

export async function sessionFeedbackAction(id: unknown, input: unknown): Promise<{ ok: true } | Fail> {
  const user = await requireUser("/mentorship");
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) return fail("Pick 1 to 5 stars");
  const b = await load(id);
  if (!b || b.studentId !== user.id) return fail("Booking not found");
  const res = await transition(b.id, (x) => (x.status !== "completed" ? "You can leave feedback after the session" : x.feedback ? "You've already left feedback" : null), (x) => ({ ...x, feedback: { ...parsed.data, at: new Date().toISOString() } }));
  return res.ok ? { ok: true } : fail(res.error);
}

export async function joinCallAction(id: unknown): Promise<{ ok: true; url: string } | Fail> {
  const user = await requireUser("/mentorship");
  const b = await load(id);
  if (!b || !roleIn(b, user.id)) return fail("Booking not found");
  if (phaseOf(b, Date.now()) !== "open") return fail("The room opens 10 minutes before the start");
  if (!livekitConfigured()) return fail("Video calls need LiveKit keys (LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET).");
  const ttlSec = Math.ceil((Date.parse(b.end) + 30 * 60_000 - Date.now()) / 1000);
  return { ok: true, url: livekitMeetUrl(livekitToken({ room: `mentor-${b.id}`, identity: user.id, name: firstName(user.name), ttlSec })) };
}

/** Polled by the session room so countdowns and status stay right. */
export async function getBookingAction(id: unknown): Promise<{ ok: true; booking: Booking } | Fail> {
  const user = await requireUser("/mentorship");
  const b = await load(id);
  return b && roleIn(b, user.id) ? { ok: true, booking: b } : fail("Booking not found");
}

/* ================= Mentor ================= */

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM times");

const profileSchema = z
  .object({
    headline: z.string().trim().min(5, "Add a short headline").max(90),
    bio: z.string().trim().max(800),
    expertise: z.array(z.string().trim().min(2).max(30)).min(1, "Add at least one topic").max(8, "Up to 8 topics"),
    sessionMin: z.number().refine((n) => (SESSION_LENGTHS as readonly number[]).includes(n), "Pick a session length"),
    bufferMin: z.number().refine((n) => (BUFFERS as readonly number[]).includes(n), "Pick a buffer"),
    priceRupees: z.number().min(MIN_PRICE / 100, `At least ₹${MIN_PRICE / 100}`).max(MAX_PRICE / 100, `At most ₹${MAX_PRICE / 100}`),
    weekly: z.array(z.object({ day: z.number().int().min(0).max(6), start: hhmm, end: hhmm })).max(35),
    leaves: z.array(z.iso.date()).max(90),
    published: z.boolean(),
  })
  .superRefine((p, ctx) => {
    const err = weeklyError(p.weekly, p.sessionMin);
    if (err) ctx.addIssue({ code: "custom", message: err });
    if (p.published && p.weekly.length === 0) ctx.addIssue({ code: "custom", message: "Add at least one weekly opening before going live" });
  });

export async function saveMentorProfileAction(input: unknown): Promise<{ ok: true } | Fail> {
  const user = await requireMentorshipUser();
  if (!user || !isMentorRole(user)) return fail("Only mentors can do this");
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid profile");
  const { priceRupees, leaves, ...rest } = parsed.data;
  await upsertMentor(user.id, () => ({ ...rest, name: user.name, price: Math.round(priceRupees * 100), leaves: [...new Set(leaves)].sort() }));
  return { ok: true };
}

/* ================= Admin ================= */

export async function saveMentorshipCommissionAction(percent: unknown): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const parsed = z.number().min(0).max(90, "Keep commission at or below 90%").safeParse(percent);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid");
  await saveMentorshipSettings({ commissionBps: Math.round(parsed.data * 100) });
  return { ok: true };
}

/** Full refund, e.g. when a mentor didn't show up. Works until the money has been paid out. */
export async function adminCancelBookingAction(id: unknown): Promise<{ ok: true } | Fail> {
  await requireAdmin();
  const b = await load(id);
  if (!b) return fail("Booking not found");
  const res = await cancel(b, "admin", "Cancelled by the Glideinbir team");
  return res.ok ? { ok: true } : fail(res.error);
}
