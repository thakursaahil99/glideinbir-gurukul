/**
 * Pure doubt-solving rules (no I/O). Unit-tested in tests/doubts.test.ts.
 */
import type { Doubt, DoubtStatus, Subject, TutorProfile } from "./types";

/** Unaccepted requests expire after this. */
export const REQUEST_TTL_MS = 2 * 60_000;
/** A tutor counts as online only if their live feed pinged within this window. */
export const ONLINE_WINDOW_MS = 90_000;
/** Ending within this many seconds of starting is a free cancellation. */
export const FREE_CANCEL_SEC = 60;
export const MIN_RATE = 100; // ₹1/min
export const MAX_RATE = 10_000; // ₹100/min

export const OPEN: DoubtStatus[] = ["requested", "accepted", "in_progress"];
export const isOpen = (d: Pick<Doubt, "status">) => OPEN.includes(d.status);

export const isTutorOnline = (p: Pick<TutorProfile, "online" | "lastSeen">, now = Date.now()) => p.online && now - Date.parse(p.lastSeen) <= ONLINE_WINDOW_MS;

/** Tutors who may see and accept a request: online, teach the subject, affordable, and not the learner. */
export function eligibleTutors(profiles: TutorProfile[], q: { subject: Subject; limitMin: number; balance: number; studentId: string }, now = Date.now()) {
  return profiles
    .filter((p) => p.userId !== q.studentId && isTutorOnline(p, now) && p.subjects.includes(q.subject) && p.ratePerMinute * q.limitMin <= q.balance)
    .sort((a, b) => a.ratePerMinute - b.ratePerMinute);
}

export const holdFor = (ratePerMinute: number, limitMin: number) => ratePerMinute * limitMin;

/** Deadline for an accepted session: start + limit (or null before it starts). */
export const sessionEndsAt = (d: Pick<Doubt, "startedAt" | "limitMin">) => (d.startedAt ? Date.parse(d.startedAt) + d.limitMin * 60_000 : null);

export interface Bill {
  minutes: number;
  charged: number;
  refunded: number;
}

/**
 * What a finished session costs. Billing is per started minute, capped at the
 * session limit and the hold. Sessions that never started, or ended within the
 * free-cancel window, cost nothing.
 */
export function bill(d: Pick<Doubt, "startedAt" | "limitMin" | "ratePerMinute" | "hold">, endedAt: number): Bill {
  const hold = d.hold ?? 0;
  if (!d.startedAt || !d.ratePerMinute) return { minutes: 0, charged: 0, refunded: hold };
  const elapsedSec = Math.max(0, (endedAt - Date.parse(d.startedAt)) / 1000);
  if (elapsedSec < FREE_CANCEL_SEC) return { minutes: 0, charged: 0, refunded: hold };
  const minutes = Math.min(d.limitMin, Math.ceil(elapsedSec / 60));
  const charged = Math.min(hold, minutes * d.ratePerMinute);
  return { minutes, charged, refunded: hold - charged };
}

/** Lazily-applied time rules: request expiry and the session limit. */
export function dueTransition(d: Doubt, now = Date.now()): { to: "expired" } | { to: "completed"; at: number } | null {
  if (d.status === "requested" && now > Date.parse(d.expiresAt)) return { to: "expired" };
  const end = sessionEndsAt(d);
  if (d.status === "in_progress" && end !== null && now >= end) return { to: "completed", at: end };
  return null;
}

export type Actor = "student" | "tutor";

/** Which status changes each side may make. */
export function canMove(from: DoubtStatus, to: DoubtStatus, actor: Actor): boolean {
  if (actor === "student") return (from === "requested" && to === "cancelled") || (from === "accepted" && to === "cancelled") || (from === "in_progress" && to === "completed");
  return (from === "requested" && to === "accepted") || (from === "accepted" && to === "in_progress") || (from === "accepted" && to === "cancelled") || (from === "in_progress" && to === "completed");
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || "Learner";
