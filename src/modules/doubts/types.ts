/**
 * Instant Doubt Solving data model. JSON files with the `doubts_` prefix.
 * A doubt request and its session share one record here (doubts_requests);
 * they split into doubts_requests / doubts_sessions in the Supabase migration.
 */

export const SUBJECTS = ["Physics", "Chemistry", "Maths", "Biology", "English", "Coding", "Reasoning", "Accounts", "Other"] as const;
export type Subject = (typeof SUBJECTS)[number];

/** Session caps a learner can pick. The wallet hold is rate × this. */
export const SESSION_LIMITS = [10, 20, 30] as const;

export type DoubtStatus = "requested" | "accepted" | "in_progress" | "completed" | "cancelled" | "expired";

export interface TutorProfile {
  userId: string;
  name: string;
  subjects: Subject[];
  /** Paise per minute. */
  ratePerMinute: number;
  bio: string;
  online: boolean;
  /** Last time the tutor's live feed was connected. "Online" also needs this to be recent. */
  lastSeen: string;
  updatedAt: string;
}

export interface Doubt {
  id: string;
  studentId: string;
  studentName: string;
  subject: Subject;
  text: string;
  /** Upload file id under data/uploads/doubts/<id>/, served by an access-checked route. */
  image: string | null;
  limitMin: number;
  status: DoubtStatus;
  createdAt: string;
  /** A request nobody accepts by this time expires. */
  expiresAt: string;

  tutorId?: string;
  tutorName?: string;
  ratePerMinute?: number;
  /** Paise moved to escrow at accept = rate × limit. */
  hold?: number;
  acceptedAt?: string;
  startedAt?: string;
  endedAt?: string;
  endedBy?: "student" | "tutor" | "limit" | "system";
  cancelReason?: string;
  billedMinutes?: number;
  charged?: number;
  refunded?: number;
  /** Escrow fully paid out (tutor + refund). Unsettled finished doubts are retried on read. */
  paidOut?: boolean;
  rating?: { stars: number; text: string; at: string };
}

export interface DoubtMessage {
  id: string;
  doubtId: string;
  senderId: string;
  senderName: string;
  role: "student" | "tutor" | "system";
  text: string;
  createdAt: string;
}

export interface DoubtSettings {
  commissionBps: number;
}
