/**
 * Mentorship Booking data model. JSON files with the `mentor_` prefix.
 * Availability lives inside the profile and feedback inside the booking here; they
 * split into mentor_profiles / mentor_availability / mentor_bookings / mentor_feedback
 * in the Supabase migration, where an exclusion constraint on tstzrange(start, end)
 * per mentor replaces the in-queue overlap check in store.ts.
 */

export const SESSION_LENGTHS = [30, 45, 60] as const;
export const BUFFERS = [0, 10, 15] as const;
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** One weekly opening, in Asia/Kolkata wall-clock time ("HH:MM", same day). */
export interface AvailabilityWindow {
  day: number;
  start: string;
  end: string;
}

export interface MentorProfile {
  userId: string;
  name: string;
  headline: string;
  bio: string;
  expertise: string[];
  /** Minutes per session. */
  sessionMin: number;
  /** Gap kept free after every session. */
  bufferMin: number;
  /** Paise per session. */
  price: number;
  weekly: AvailabilityWindow[];
  /** IST dates ("YYYY-MM-DD") with no sessions. */
  leaves: string[];
  /** Listed on /mentorship. */
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BookingStatus = "confirmed" | "completed" | "cancelled";

export interface Booking {
  id: string;
  mentorId: string;
  mentorName: string;
  studentId: string;
  studentName: string;
  start: string;
  end: string;
  /** Paise held in escrow at booking. */
  price: number;
  /** Commission fixed at booking time, so a later admin change can't alter a paid deal. */
  commissionBps: number;
  agenda: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  reschedules: number;
  /** When the current start time was chosen (booking or last reschedule). */
  scheduledAt: string;
  cancelledAt?: string;
  cancelledBy?: "student" | "mentor" | "admin";
  cancelReason?: string;
  /** Escrow split once the booking is final: payout goes to the mentor (minus commission), refund to the learner. */
  payout?: number;
  refund?: number;
  paidOut?: boolean;
  /** When each reminder went out. Reset on reschedule. */
  reminders: { h24?: string; m15?: string };
  feedback?: { stars: number; text: string; at: string };
}

export interface MentorshipSettings {
  commissionBps: number;
}
