import type { NoteItem, Review, Vendor } from "./types";

export const MIN_PRICE = 900;
export const MAX_PRICE = 500_000;
/** Open reports from this many different people hide a note until an admin looks. */
export const AUTO_HIDE_REPORTS = 3;
/** Download links work this long. */
export const LINK_TTL_MS = 5 * 60_000;

/** Paid notes can preview at most 30% of their pages (at least 1, at most 20). */
export function maxPreview(pages: number, price: number) {
  if (pages <= 0) return 0;
  if (price === 0) return Math.min(pages, 20);
  return Math.max(1, Math.min(20, Math.floor(pages * 0.3)));
}

/** Why a note can't go live yet, or null. */
export function publishBlock(n: Pick<NoteItem, "file" | "pages" | "previewPages" | "price" | "title" | "description">) {
  if (!n.file || n.pages < 1) return "Upload the PDF first";
  if (n.title.trim().length < 5) return "Add a title";
  if (n.description.trim().length < 30) return "Describe the notes in at least 30 characters";
  if (n.previewPages < 1 || n.previewPages > maxPreview(n.pages, n.price)) return `Free preview must be 1–${maxPreview(n.pages, n.price)} pages`;
  return null;
}

/** Visible and buyable in the marketplace. */
export const isListed = (n: NoteItem, vendor: Pick<Vendor, "status"> | null | undefined) => n.status === "published" && !n.hidden && !!n.file && vendor?.status === "approved";

export function ratingOf(reviews: Pick<Review, "stars">[]) {
  return reviews.length ? { avg: reviews.reduce((s, r) => s + r.stars, 0) / reviews.length, count: reviews.length } : { avg: null, count: 0 };
}

export const fmtBytes = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** Cover gradient picked from the subject, used when the vendor didn't upload one. */
const PALETTES: Record<string, [string, string]> = {
  JEE: ["#5b47ff", "#00c2ff"],
  NEET: ["#00b89c", "#7ddc5a"],
  UPSC: ["#ff8a00", "#ff4d6d"],
  "SSC & Banking": ["#ffb800", "#ff5e3a"],
  "Class 10": ["#3d8bff", "#2ee6c5"],
  "Class 12": ["#c04dff", "#ff4da6"],
  Engineering: ["#2ee6c5", "#5b47ff"],
  Coding: ["#12102e", "#5b47ff"],
  Commerce: ["#ff4d6d", "#c04dff"],
  Other: ["#7ddc5a", "#00c2ff"],
};
export const coverColors = (subject: string) => PALETTES[subject] ?? PALETTES.Other!;

export const slugTitle = (t: string) => t.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "notes";
