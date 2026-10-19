import { readJson, updateJson } from "@/core/db/json-store";
import type { NoteItem, NotesSettings, Payout, Purchase, Report, Review, Vendor } from "./types";

const F = {
  vendors: "notes_vendors.json",
  items: "notes_items.json",
  purchases: "notes_purchases.json",
  reviews: "notes_reviews.json",
  reports: "notes_reports.json",
  payouts: "notes_payouts.json",
  settings: "notes_settings.json",
};
const arr = <T>(raw: unknown): T[] => (Array.isArray(raw) ? (raw as T[]) : []);
export const nowIso = () => new Date().toISOString();

type Change<T> = { ok: true; value: T } | { ok: false; error: string; value: T | null };

/**
 * Atomic compare-and-set on one row of a table: `guard` sees the stored row (and the
 * whole table) inside the write queue and returns an error string to refuse.
 */
async function change<T>(file: string, match: (x: T) => boolean, guard: (x: T, all: T[]) => string | null, next: (x: T) => T): Promise<Change<T>> {
  let out: Change<T> = { ok: false, error: "Not found", value: null };
  await updateJson(file, arr<T>, (all) =>
    all.map((x) => {
      if (!match(x)) return x;
      const err = guard(x, all);
      if (err) {
        out = { ok: false, error: err, value: x };
        return x;
      }
      const v = next(x);
      out = { ok: true, value: v };
      return v;
    }),
  );
  return out;
}

/** Appends a row unless `guard` (run inside the write queue) refuses. */
async function insert<T>(file: string, row: T, guard: (all: T[]) => string | null = () => null): Promise<Change<T>> {
  let out: Change<T> = { ok: false, error: "Could not save", value: null };
  await updateJson(file, arr<T>, (all) => {
    const err = guard(all);
    if (err) {
      out = { ok: false, error: err, value: null };
      return all;
    }
    out = { ok: true, value: row };
    return [...all, row];
  });
  return out;
}

/* ---------------- Vendors ---------------- */

export const listVendors = async () => arr<Vendor>(await readJson(F.vendors));
export const getVendor = async (userId: string) => (await listVendors()).find((v) => v.userId === userId) ?? null;
export const insertVendor = (v: Vendor) => insert(F.vendors, v, (all) => (all.some((x) => x.userId === v.userId) ? "You've already applied" : null));
export const changeVendor = (userId: string, guard: (v: Vendor) => string | null, next: (v: Vendor) => Vendor) =>
  change<Vendor>(F.vendors, (v) => v.userId === userId, guard, (v) => ({ ...next(v), updatedAt: nowIso() }));

/* ---------------- Notes ---------------- */

export const listNotes = async () => arr<NoteItem>(await readJson(F.items));
export const getNote = async (id: string) => (await listNotes()).find((n) => n.id === id) ?? null;
export const insertNote = (n: NoteItem) => insert(F.items, n);
export const changeNote = (id: string, guard: (n: NoteItem) => string | null, next: (n: NoteItem) => NoteItem) =>
  change<NoteItem>(F.items, (n) => n.id === id, guard, (n) => ({ ...next(n), updatedAt: nowIso() }));
export const removeNote = (id: string) => updateJson(F.items, arr<NoteItem>, (all) => all.filter((n) => n.id !== id));

/* ---------------- Purchases ---------------- */

export const listPurchases = async () => arr<Purchase>(await readJson(F.purchases));
export const findPurchase = async (userId: string, noteId: string) => (await listPurchases()).find((p) => p.userId === userId && p.noteId === noteId) ?? null;
/** One purchase per learner per note, enforced inside the write queue. */
export const insertPurchase = (p: Purchase) => insert(F.purchases, p, (all) => (all.some((x) => x.userId === p.userId && x.noteId === p.noteId) ? "already" : null));

/* ---------------- Reviews ---------------- */

export const listReviews = async () => arr<Review>(await readJson(F.reviews));
export const insertReview = (r: Review) => insert(F.reviews, r, (all) => (all.some((x) => x.userId === r.userId && x.noteId === r.noteId) ? "You've already reviewed these notes" : null));

/* ---------------- Reports ---------------- */

export const listReports = async () => arr<Report>(await readJson(F.reports));
export const insertReport = (r: Report) => insert(F.reports, r, (all) => (all.some((x) => x.userId === r.userId && x.noteId === r.noteId && x.status === "open") ? "You've already reported these notes. Our team is on it." : null));
/** Closes every open report on a note. */
export const closeReports = (noteId: string, status: "resolved" | "dismissed") =>
  updateJson(F.reports, arr<Report>, (all) => all.map((r) => (r.noteId === noteId && r.status === "open" ? { ...r, status, closedAt: nowIso() } : r)));

/* ---------------- Payouts ---------------- */

export const listPayouts = async () => arr<Payout>(await readJson(F.payouts));
export const insertPayout = (p: Payout) => insert(F.payouts, p, (all) => (all.some((x) => x.vendorId === p.vendorId && x.status === "requested") ? "You already have a payout request in progress" : null));
export const changePayout = (id: string, guard: (p: Payout) => string | null, next: (p: Payout) => Payout) => change<Payout>(F.payouts, (p) => p.id === id, guard, next);
export const removePayout = (id: string) => updateJson(F.payouts, arr<Payout>, (all) => all.filter((p) => p.id !== id));

/* ---------------- Settings ---------------- */

const DEFAULT_SETTINGS: NotesSettings = { commissionBps: 2000, minPayout: 10_000 };
const parseSettings = (raw: unknown): NotesSettings => {
  const s = (raw ?? {}) as Partial<NotesSettings>;
  return {
    commissionBps: Number.isInteger(s.commissionBps) && s.commissionBps! >= 0 && s.commissionBps! <= 9000 ? s.commissionBps! : DEFAULT_SETTINGS.commissionBps,
    minPayout: Number.isInteger(s.minPayout) && s.minPayout! >= 100 ? s.minPayout! : DEFAULT_SETTINGS.minPayout,
  };
};
export const getNotesSettings = async () => parseSettings(await readJson(F.settings));
export const saveNotesSettings = (s: NotesSettings) => updateJson(F.settings, parseSettings, () => s);
