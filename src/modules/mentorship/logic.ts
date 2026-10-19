import type { AvailabilityWindow, Booking, MentorProfile } from "./types";

/** India has no daylight saving, so Asia/Kolkata is always UTC+05:30. */
export const TZ = "Asia/Kolkata";
const IST_OFFSET_MS = 330 * 60_000;

/** Slots need this much notice. */
export const MIN_NOTICE_MS = 2 * 60 * 60_000;
/** How far ahead learners can book. */
export const BOOKING_WINDOW_DAYS = 21;
/** Cancel or reschedule earlier than this before the start for a full refund. */
export const FREE_CHANGE_MS = 24 * 60 * 60_000;
export const MAX_RESCHEDULES = 2;
/** The call room opens this early and stays open this long after the end. */
export const JOIN_EARLY_MS = 10 * 60_000;
export const JOIN_LATE_MS = 15 * 60_000;
export const MIN_PRICE = 4_900;
export const MAX_PRICE = 5_000_000;

export interface Range {
  start: string;
  end: string;
}

/* ---------------- Time helpers (all IST) ---------------- */

export const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
export const fromMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** "YYYY-MM-DD" of an instant, in IST. */
export const istDate = (ms: number) => new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
/** Day of week (0 = Sunday) of an IST date. */
export const istWeekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();
/** IST wall-clock time on an IST date → epoch ms. */
/** Hour (0–23) of an instant, in IST. */
export const istHour = (iso: string) => new Date(Date.parse(iso) + IST_OFFSET_MS).getUTCHours();
export const istToMs = (date: string, hhmm: string) => Date.parse(`${date}T${hhmm}:00Z`) - IST_OFFSET_MS;

export function nextDays(now: number, count = BOOKING_WINDOW_DAYS) {
  const today = Date.parse(`${istDate(now)}T00:00:00Z`);
  return Array.from({ length: count }, (_, i) => new Date(today + i * 86_400_000).toISOString().slice(0, 10));
}

export const overlaps = (a: Range, b: Range) => Date.parse(a.start) < Date.parse(b.end) && Date.parse(b.start) < Date.parse(a.end);

export function fmtIST(iso: string | number, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: TZ, ...opts }).format(new Date(iso));
}
export const fmtTime = (iso: string | number) => fmtIST(iso, { hour: "numeric", minute: "2-digit" });
export const fmtDay = (iso: string | number) => fmtIST(iso, { weekday: "short", day: "numeric", month: "short" });
export const fmtWhen = (iso: string) => `${fmtDay(iso)}, ${fmtTime(iso)} IST`;

/* ---------------- Availability ---------------- */

/** Error text for a broken weekly schedule, or null when it's usable. */
export function weeklyError(weekly: AvailabilityWindow[], sessionMin: number) {
  for (let day = 0; day < 7; day++) {
    const list = weekly.filter((w) => w.day === day).sort((a, b) => toMin(a.start) - toMin(b.start));
    for (let i = 0; i < list.length; i++) {
      const w = list[i]!;
      if (toMin(w.end) - toMin(w.start) < sessionMin) return `Each opening must fit at least one ${sessionMin}-minute session (check ${dayName(day)} ${w.start}–${w.end})`;
      if (i > 0 && toMin(w.start) < toMin(list[i - 1]!.end)) return `Openings on ${dayName(day)} overlap`;
    }
  }
  return null;
}
const dayName = (d: number) => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d];

/**
 * Free slots on one IST date: walk each weekly opening in steps of session + buffer,
 * skipping leave days, short notice and anything that overlaps a booking
 * (bookings are widened by the buffer so back-to-back calls keep their gap).
 */
export function slotsOn(p: Pick<MentorProfile, "weekly" | "leaves" | "sessionMin" | "bufferMin">, date: string, busy: Range[], now: number): Range[] {
  if (p.leaves.includes(date)) return [];
  const weekday = istWeekday(date);
  const pad = p.bufferMin * 60_000;
  const blocked = busy.map((b) => ({ start: Date.parse(b.start) - pad, end: Date.parse(b.end) + pad }));
  const out: Range[] = [];
  for (const w of p.weekly.filter((x) => x.day === weekday).sort((a, b) => toMin(a.start) - toMin(b.start))) {
    for (let m = toMin(w.start); m + p.sessionMin <= toMin(w.end); m += p.sessionMin + p.bufferMin) {
      const start = istToMs(date, fromMin(m));
      const end = start + p.sessionMin * 60_000;
      if (start < now + MIN_NOTICE_MS) continue;
      if (blocked.some((b) => start < b.end && b.start < end)) continue;
      out.push({ start: new Date(start).toISOString(), end: new Date(end).toISOString() });
    }
  }
  return out;
}

/** Slots for the whole booking window, grouped by IST date. */
export function slotsAhead(p: Parameters<typeof slotsOn>[0], busy: Range[], now: number, days = BOOKING_WINDOW_DAYS) {
  return nextDays(now, days).map((date) => ({ date, slots: slotsOn(p, date, busy, now) }));
}

/** The server re-derives the slot list instead of trusting the client's start time. */
export function findSlot(p: Parameters<typeof slotsOn>[0], start: string, busy: Range[], now: number): Range | null {
  const ms = Date.parse(start);
  if (!Number.isFinite(ms) || ms > now + BOOKING_WINDOW_DAYS * 86_400_000) return null;
  return slotsOn(p, istDate(ms), busy, now).find((s) => Date.parse(s.start) === ms) ?? null;
}

/* ---------------- Booking rules ---------------- */

/** Bookings that hold a slot. */
export const holdsSlot = (b: Pick<Booking, "status">) => b.status === "confirmed";

/**
 * Money split when a confirmed booking is cancelled.
 * Mentor or admin cancels: full refund. Learner cancels more than 24h ahead: full refund;
 * later than that: no refund (the mentor kept the time free).
 */
export function cancelSplit(b: Pick<Booking, "price" | "start">, by: "student" | "mentor" | "admin", now: number) {
  const full = by !== "student" || Date.parse(b.start) - now > FREE_CHANGE_MS;
  return full ? { refund: b.price, payout: 0 } : { refund: 0, payout: b.price };
}

export function rescheduleBlock(b: Pick<Booking, "status" | "start" | "reschedules">, by: "student" | "mentor", now: number): string | null {
  if (b.status !== "confirmed") return "Only upcoming sessions can be moved";
  if (Date.parse(b.start) <= now) return "This session has already started";
  if (by === "student") {
    if (Date.parse(b.start) - now <= FREE_CHANGE_MS) return "Sessions can be moved up to 24 hours before the start";
    if (b.reschedules >= MAX_RESCHEDULES) return `A session can be moved at most ${MAX_RESCHEDULES} times`;
  }
  return null;
}

export type Phase = "upcoming" | "open" | "ended";
/** "open" = the call room is joinable. */
export function phaseOf(b: Pick<Booking, "status" | "start" | "end">, now: number): Phase {
  if (b.status !== "confirmed") return "ended";
  if (now < Date.parse(b.start) - JOIN_EARLY_MS) return "upcoming";
  if (now <= Date.parse(b.end) + JOIN_LATE_MS) return "open";
  return "ended";
}

/** A confirmed session becomes completed (and the mentor gets paid) once it has ended. */
export const isDue = (b: Pick<Booking, "status" | "end">, now: number) => b.status === "confirmed" && now >= Date.parse(b.end);

/**
 * Reminders that should go out now. The 24h one is skipped for sessions booked
 * less than a day ahead (the booking confirmation already covers it).
 */
export function dueReminders(b: Pick<Booking, "status" | "start" | "end" | "scheduledAt" | "reminders">, now: number) {
  if (b.status !== "confirmed") return [] as ("h24" | "m15")[];
  const start = Date.parse(b.start);
  const out: ("h24" | "m15")[] = [];
  const bookedFarAhead = start - Date.parse(b.scheduledAt) > FREE_CHANGE_MS;
  if (!b.reminders.h24 && bookedFarAhead && now >= start - FREE_CHANGE_MS && now < start - 15 * 60_000) out.push("h24");
  if (!b.reminders.m15 && now >= start - 15 * 60_000 && now < Date.parse(b.end)) out.push("m15");
  return out;
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;
