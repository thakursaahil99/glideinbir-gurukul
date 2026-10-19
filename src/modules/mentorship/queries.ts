import { firstName, slotsAhead } from "./logic";
import { busyOf, settle } from "./service";
import { listBookings, listMentors } from "./store";
import type { Booking, MentorProfile } from "./types";

export interface MentorCard {
  userId: string;
  name: string;
  headline: string;
  bio: string;
  expertise: string[];
  sessionMin: number;
  price: number;
  rating: number | null;
  ratings: number;
  sessions: number;
  nextSlot: string | null;
}

export interface Review {
  stars: number;
  text: string;
  name: string;
  at: string;
}

export function mentorStats(bookings: Booking[], mentorId: string) {
  const mine = bookings.filter((b) => b.mentorId === mentorId);
  const rated = mine.filter((b) => b.feedback);
  return {
    sessions: mine.filter((b) => b.status === "completed").length,
    ratings: rated.length,
    rating: rated.length ? rated.reduce((s, b) => s + b.feedback!.stars, 0) / rated.length : null,
    reviews: rated
      .sort((a, b) => b.feedback!.at.localeCompare(a.feedback!.at))
      .slice(0, 6)
      .map((b): Review => ({ stars: b.feedback!.stars, text: b.feedback!.text, name: firstName(b.studentName), at: b.feedback!.at })),
  };
}

export function toCard(m: MentorProfile, bookings: Booking[], now: number): MentorCard {
  const s = mentorStats(bookings, m.userId);
  const days = slotsAhead(m, busyOf(bookings, m.userId), now);
  return {
    userId: m.userId,
    name: m.name,
    headline: m.headline,
    bio: m.bio,
    expertise: m.expertise,
    sessionMin: m.sessionMin,
    price: m.price,
    rating: s.rating,
    ratings: s.ratings,
    sessions: s.sessions,
    nextSlot: days.find((d) => d.slots.length)?.slots[0]?.start ?? null,
  };
}

/** All bookings with time-based rules applied (completion, payouts, reminders). */
export async function settledBookings() {
  return Promise.all((await listBookings()).map((b) => settle(b)));
}

export async function publishedMentors(now = Date.now()) {
  const [mentors, bookings] = await Promise.all([listMentors(), settledBookings()]);
  return mentors
    .filter((m) => m.published)
    .map((m) => toCard(m, bookings, now))
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.sessions - a.sessions);
}
