import { readJson, updateJson } from "@/core/db/json-store";
import { holdsSlot, overlaps } from "./logic";
import type { Booking, MentorProfile, MentorshipSettings } from "./types";

const F = {
  mentors: "mentor_profiles.json",
  bookings: "mentor_bookings.json",
  settings: "mentor_settings.json",
};
const arr = <T>(raw: unknown): T[] => (Array.isArray(raw) ? (raw as T[]) : []);
const now = () => new Date().toISOString();

type Result = { ok: true; booking: Booking } | { ok: false; error: string; booking: Booking | null };

/* ---------------- Mentors ---------------- */

export const listMentors = async () => arr<MentorProfile>(await readJson(F.mentors));
export const getMentor = async (userId: string) => (await listMentors()).find((m) => m.userId === userId) ?? null;

export async function upsertMentor(userId: string, change: (p: MentorProfile | null) => Omit<MentorProfile, "userId" | "createdAt" | "updatedAt">) {
  let out: MentorProfile | undefined;
  await updateJson(F.mentors, arr<MentorProfile>, (all) => {
    const i = all.findIndex((m) => m.userId === userId);
    const prev = i >= 0 ? all[i]! : null;
    out = { ...change(prev), userId, createdAt: prev?.createdAt ?? now(), updatedAt: now() };
    if (i < 0) return [...all, out];
    const copy = all.slice();
    copy[i] = out;
    return copy;
  });
  return out!;
}

/* ---------------- Bookings ---------------- */

export const listBookings = async () => arr<Booking>(await readJson(F.bookings));
export const getBooking = async (id: string) => (await listBookings()).find((b) => b.id === id) ?? null;

/** Another live booking of the same mentor or learner that overlaps `b`. */
function clash(all: Booking[], b: Pick<Booking, "id" | "mentorId" | "studentId" | "start" | "end">) {
  return all.find((x) => x.id !== b.id && holdsSlot(x) && (x.mentorId === b.mentorId || x.studentId === b.studentId) && overlaps(x, b));
}

/**
 * Inserts a booking only if nobody holds an overlapping slot. The check and the write
 * happen inside one queued update, so two learners racing for a slot can't both win.
 */
export async function claimSlot(b: Booking, extraGuard: (all: Booking[]) => string | null = () => null): Promise<Result> {
  let result: Result = { ok: false, error: "Could not book", booking: null };
  await updateJson(F.bookings, arr<Booking>, (all) => {
    const taken = clash(all, b);
    const err = taken ? (taken.mentorId === b.mentorId ? "Someone just booked this slot. Pick another one." : "You already have a session at this time.") : extraGuard(all);
    if (err) {
      result = { ok: false, error: err, booking: null };
      return all;
    }
    result = { ok: true, booking: b };
    return [...all, b];
  });
  return result;
}

/** Removes a booking whose payment failed right after claiming the slot. */
export const releaseSlot = (id: string) => updateJson(F.bookings, arr<Booking>, (all) => all.filter((b) => b.id !== id));

/**
 * Atomic compare-and-set. `guard` sees the stored booking (and all others) inside the
 * write queue; a changed start/end is re-checked for clashes before it's written.
 */
export async function transition(id: string, guard: (b: Booking, all: Booking[]) => string | null, change: (b: Booking) => Booking): Promise<Result> {
  let result: Result = { ok: false, error: "Booking not found", booking: null };
  await updateJson(F.bookings, arr<Booking>, (all) =>
    all.map((b) => {
      if (b.id !== id) return b;
      const err = guard(b, all);
      if (err) {
        result = { ok: false, error: err, booking: b };
        return b;
      }
      const next = { ...change(b), updatedAt: now() };
      if ((next.start !== b.start || next.end !== b.end) && holdsSlot(next) && clash(all, next)) {
        result = { ok: false, error: "That time was just taken. Pick another slot.", booking: b };
        return b;
      }
      result = { ok: true, booking: next };
      return next;
    }),
  );
  return result;
}

/* ---------------- Settings ---------------- */

const DEFAULT_SETTINGS: MentorshipSettings = { commissionBps: 2000 };
const parseSettings = (raw: unknown): MentorshipSettings => {
  const bps = (raw as MentorshipSettings | undefined)?.commissionBps;
  return Number.isInteger(bps) && bps! >= 0 && bps! <= 10_000 ? { commissionBps: bps! } : DEFAULT_SETTINGS;
};
export const getMentorshipSettings = async () => parseSettings(await readJson(F.settings));
export const saveMentorshipSettings = (s: MentorshipSettings) => updateJson(F.settings, parseSettings, () => s);
