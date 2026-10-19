/**
 * Notes Marketplace data model. JSON files with the `notes_` prefix map 1:1 to the
 * Supabase tables notes_vendors, notes_items, notes_purchases, notes_payouts
 * (+ notes_reviews, notes_reports, notes_settings).
 */

export const NOTE_SUBJECTS = ["JEE", "NEET", "UPSC", "SSC & Banking", "Class 10", "Class 12", "Engineering", "Coding", "Commerce", "Other"] as const;
export type NoteSubject = (typeof NOTE_SUBJECTS)[number];

export type VendorStatus = "pending" | "approved" | "rejected" | "suspended";

export interface Vendor {
  userId: string;
  /** Account name, for admins. */
  name: string;
  storeName: string;
  bio: string;
  subjects: NoteSubject[];
  /** Where payouts go (UPI id). Only the vendor and admins see it. */
  payoutUpi: string;
  status: VendorStatus;
  adminNote?: string;
  appliedAt: string;
  reviewedAt?: string;
  updatedAt: string;
}

export interface NoteItem {
  id: string;
  vendorId: string;
  /** Store name shown to buyers. */
  vendorName: string;
  title: string;
  description: string;
  subject: NoteSubject;
  tags: string[];
  /** Paise; 0 = free. */
  price: number;
  /** Pages anyone signed in can read before buying. */
  previewPages: number;
  /** Set by the upload route from the real PDF. */
  file: string | null;
  pages: number;
  bytes: number;
  cover: string | null;
  status: "draft" | "published";
  /** Moderation: hidden notes can't be bought (buyers keep access). */
  hidden?: { reason: string; at: string; by: "admin" | "reports" };
  sales: number;
  createdAt: string;
  updatedAt: string;
}

export interface Purchase {
  id: string;
  noteId: string;
  userId: string;
  price: number;
  createdAt: string;
}

export interface Review {
  noteId: string;
  userId: string;
  name: string;
  stars: number;
  text: string;
  createdAt: string;
}

export const REPORT_REASONS = { copied: "Copied / pirated content", inappropriate: "Inappropriate content", misleading: "Not as described", other: "Something else" } as const;
export type ReportReason = keyof typeof REPORT_REASONS;

export interface Report {
  id: string;
  noteId: string;
  userId: string;
  userName: string;
  reason: ReportReason;
  text: string;
  status: "open" | "resolved" | "dismissed";
  createdAt: string;
  closedAt?: string;
}

export interface Payout {
  id: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  upi: string;
  status: "requested" | "paid" | "rejected";
  requestedAt: string;
  processedAt?: string;
  /** Bank / UPI transaction reference entered by the admin. */
  reference?: string;
  note?: string;
}

export interface NotesSettings {
  commissionBps: number;
  /** Smallest payout a vendor can request, in paise. */
  minPayout: number;
}
