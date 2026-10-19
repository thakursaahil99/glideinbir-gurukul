import { isListed, ratingOf } from "./logic";
import { listNotes, listPurchases, listReviews, listVendors } from "./store";
import type { NoteItem, Review } from "./types";

export interface NoteCard {
  id: string;
  title: string;
  subject: string;
  tags: string[];
  price: number;
  pages: number;
  previewPages: number;
  vendorId: string;
  vendorName: string;
  coverUrl: string | null;
  rating: number | null;
  ratings: number;
  sales: number;
  createdAt: string;
}

export const coverUrl = (n: Pick<NoteItem, "id" | "cover" | "updatedAt">) => (n.cover ? `/api/notes/cover/${n.id}?v=${encodeURIComponent(n.cover)}` : null);

export function toCard(n: NoteItem, reviews: Review[]): NoteCard {
  const r = ratingOf(reviews.filter((x) => x.noteId === n.id));
  return { id: n.id, title: n.title, subject: n.subject, tags: n.tags, price: n.price, pages: n.pages, previewPages: n.previewPages, vendorId: n.vendorId, vendorName: n.vendorName, coverUrl: coverUrl(n), rating: r.avg, ratings: r.count, sales: n.sales, createdAt: n.createdAt };
}

export async function marketplace() {
  const [notes, vendors, reviews] = await Promise.all([listNotes(), listVendors(), listReviews()]);
  const vendorById = new Map(vendors.map((v) => [v.userId, v]));
  return notes.filter((n) => isListed(n, vendorById.get(n.vendorId))).map((n) => toCard(n, reviews));
}

export async function libraryOf(userId: string) {
  const [purchases, notes, reviews] = await Promise.all([listPurchases(), listNotes(), listReviews()]);
  const byId = new Map(notes.map((n) => [n.id, n]));
  return purchases
    .filter((p) => p.userId === userId && byId.has(p.noteId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((p) => ({ ...toCard(byId.get(p.noteId)!, reviews), purchasedAt: p.createdAt, paid: p.price }));
}
