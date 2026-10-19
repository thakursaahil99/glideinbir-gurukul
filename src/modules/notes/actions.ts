"use server";

import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { requireAdmin, requireUser } from "@/core/auth/current";
import { rateLimit } from "@/core/security/rate-limit";
import { LINK_TTL_MS, MAX_PRICE, maxPreview, MIN_PRICE, publishBlock } from "./logic";
import { NOTES_DIR, signDownload, UUID_RE } from "./media";
import { activeVendor, buyNote, decidePayout, hasAccess, notesEnabled, reportNote, requestPayout, vendorDecisionNotice, type BuyResult } from "./service";
import { changeNote, changeVendor, closeReports, findPurchase, getNote, getVendor, insertNote, insertReview, insertVendor, listNotes, nowIso, removeNote, saveNotesSettings } from "./store";
import { NOTE_SUBJECTS, REPORT_REASONS, type NoteItem, type Payout } from "./types";

type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });
const id = z.string().regex(UUID_RE);

async function signedIn() {
  const user = await requireUser("/notes");
  return (await notesEnabled()) ? user : null;
}

async function loadNote(noteId: unknown) {
  const parsed = id.safeParse(noteId);
  return parsed.success ? getNote(parsed.data) : null;
}

/* ================= Learner ================= */

export async function buyNoteAction(noteId: unknown): Promise<BuyResult> {
  const user = await signedIn();
  if (!user) return fail("The notes marketplace is switched off right now");
  if (!rateLimit(`nbuy:${user.id}`, 15, 60_000).ok) return fail("Too many attempts. Wait a minute.");
  const parsed = id.safeParse(noteId);
  return parsed.success ? buyNote(user, parsed.data) : fail("Notes not found");
}

/** A short-lived link bound to this user; the file route re-checks everything. */
export async function downloadLinkAction(noteId: unknown): Promise<{ ok: true; url: string } | Fail> {
  const user = await signedIn();
  if (!user) return fail("The notes marketplace is switched off right now");
  if (!rateLimit(`ndl:${user.id}`, 30, 10 * 60_000).ok) return fail("Too many downloads. Try again in a few minutes.");
  const n = await loadNote(noteId);
  if (!n?.file || !(await hasAccess(user, n))) return fail("Buy these notes to download them");
  return { ok: true, url: signDownload(n.id, user.id, LINK_TTL_MS) };
}

const reviewSchema = z.object({ stars: z.number().int().min(1).max(5), text: z.string().trim().max(800) });

export async function reviewNoteAction(noteId: unknown, input: unknown): Promise<{ ok: true } | Fail> {
  const user = await signedIn();
  if (!user) return fail("The notes marketplace is switched off right now");
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return fail("Pick 1 to 5 stars");
  const n = await loadNote(noteId);
  if (!n) return fail("Notes not found");
  if (!(await findPurchase(user.id, n.id))) return fail("Only buyers can review these notes");
  const res = await insertReview({ noteId: n.id, userId: user.id, name: user.name.split(" ")[0] ?? user.name, ...parsed.data, createdAt: nowIso() });
  return res.ok ? { ok: true } : fail(res.error);
}

const reportSchema = z.object({ reason: z.enum(Object.keys(REPORT_REASONS) as [keyof typeof REPORT_REASONS]), text: z.string().trim().max(600) });

export async function reportNoteAction(noteId: unknown, input: unknown): Promise<{ ok: true } | Fail> {
  const user = await signedIn();
  if (!user) return fail("The notes marketplace is switched off right now");
  if (!rateLimit(`nreport:${user.id}`, 10, 60 * 60_000).ok) return fail("Too many reports. Try again later.");
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return fail("Pick a reason");
  if (parsed.data.reason === "other" && parsed.data.text.length < 10) return fail("Tell us a little more (10+ characters)");
  const n = await loadNote(noteId);
  if (!n || n.status !== "published") return fail("Notes not found");
  if (n.vendorId === user.id) return fail("You can't report your own notes");
  const res = await reportNote(user, n, parsed.data.reason, parsed.data.text);
  return res.ok ? { ok: true } : fail(res.error);
}

/* ================= Vendor ================= */

const upi = z.string().trim().regex(/^[\w.-]{2,64}@[a-zA-Z]{2,32}$/, "Enter a valid UPI id like name@okaxis");
const vendorSchema = z.object({
  storeName: z.string().trim().min(3, "Store name is too short").max(50),
  bio: z.string().trim().min(20, "Tell learners about yourself (20+ characters)").max(600),
  subjects: z.array(z.enum(NOTE_SUBJECTS)).min(1, "Pick at least one subject").max(NOTE_SUBJECTS.length),
  payoutUpi: upi,
});

export async function applyVendorAction(input: unknown): Promise<{ ok: true } | Fail> {
  const user = await signedIn();
  if (!user) return fail("The notes marketplace is switched off right now");
  const parsed = vendorSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form");
  const prev = await getVendor(user.id);
  if (prev?.status === "rejected") {
    // Re-apply after a rejection.
    const res = await changeVendor(user.id, (v) => (v.status === "rejected" ? null : "Already applied"), (v) => ({ ...v, ...parsed.data, name: user.name, status: "pending", adminNote: undefined, appliedAt: nowIso() }));
    return res.ok ? { ok: true } : fail(res.error);
  }
  const res = await insertVendor({ userId: user.id, name: user.name, ...parsed.data, status: user.role === "admin" ? "approved" : "pending", appliedAt: nowIso(), updatedAt: nowIso() });
  return res.ok ? { ok: true } : fail(res.error);
}

export async function updateVendorAction(input: unknown): Promise<{ ok: true } | Fail> {
  const user = await signedIn();
  if (!user) return fail("The notes marketplace is switched off right now");
  const parsed = vendorSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form");
  const res = await changeVendor(user.id, (v) => (v.status === "approved" ? null : "Your store isn't active"), (v) => ({ ...v, ...parsed.data }));
  if (!res.ok) return fail(res.error);
  // Keep the store name on listings in step.
  for (const n of (await listNotes()).filter((x) => x.vendorId === user.id && x.vendorName !== parsed.data.storeName)) await changeNote(n.id, () => null, (x) => ({ ...x, vendorName: parsed.data.storeName }));
  return { ok: true };
}

async function vendorNote(noteId: unknown) {
  const user = await signedIn();
  if (!user) return { error: "The notes marketplace is switched off right now" } as const;
  const v = await activeVendor(user.id);
  if (!v) return { error: "Only approved sellers can do this" } as const;
  const n = noteId === undefined ? null : await loadNote(noteId);
  if (noteId !== undefined && (!n || n.vendorId !== user.id)) return { error: "Notes not found" } as const;
  return { user, v, n };
}

export async function createNoteAction(): Promise<{ ok: true; id: string } | Fail> {
  const ctx = await vendorNote(undefined);
  if ("error" in ctx) return fail(ctx.error!);
  if (!rateLimit(`ncreate:${ctx.user.id}`, 20, 60 * 60_000).ok) return fail("Too many new drafts. Try again later.");
  const now = nowIso();
  const note: NoteItem = { id: randomUUID(), vendorId: ctx.user.id, vendorName: ctx.v.storeName, title: "Untitled notes", description: "", subject: ctx.v.subjects[0] ?? "Other", tags: [], price: 4900, previewPages: 1, file: null, pages: 0, bytes: 0, cover: null, status: "draft", sales: 0, createdAt: now, updatedAt: now };
  await insertNote(note);
  return { ok: true, id: note.id };
}

const noteSchema = z.object({
  title: z.string().trim().min(5, "Title is too short").max(100),
  description: z.string().trim().max(3000),
  subject: z.enum(NOTE_SUBJECTS),
  tags: z.array(z.string().trim().min(2).max(24)).max(8),
  priceRupees: z.number().min(0).max(MAX_PRICE / 100, `At most ₹${MAX_PRICE / 100}`),
  previewPages: z.number().int().min(1).max(20),
});

export async function saveNoteAction(noteId: unknown, input: unknown): Promise<{ ok: true } | Fail> {
  const ctx = await vendorNote(noteId);
  if ("error" in ctx) return fail(ctx.error!);
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form");
  const price = Math.round(parsed.data.priceRupees * 100);
  if (price !== 0 && price < MIN_PRICE) return fail(`Paid notes start at ₹${MIN_PRICE / 100} (or make them free)`);
  const res = await changeNote(
    ctx.n!.id,
    (x) => {
      if (x.pages && parsed.data.previewPages > maxPreview(x.pages, price)) return `Free preview can be at most ${maxPreview(x.pages, price)} of ${x.pages} pages`;
      if (x.status === "published" && x.sales > 0 && price > x.price * 2 + 10_000) return "Raise the price of notes that already sold gradually (at most 2× + ₹100)";
      return null;
    },
    (x) => {
      const { title, description, subject, tags, previewPages } = parsed.data;
      const next: NoteItem = { ...x, title, description, subject, previewPages, tags: [...new Set(tags)], price, vendorName: ctx.v.storeName };
      // A published note that no longer meets the rules goes back to draft.
      return x.status === "published" && publishBlock(next) ? { ...next, status: "draft" } : next;
    },
  );
  return res.ok ? { ok: true } : fail(res.error);
}

export async function setNoteStatusAction(noteId: unknown, status: unknown): Promise<{ ok: true } | Fail> {
  const ctx = await vendorNote(noteId);
  if ("error" in ctx) return fail(ctx.error!);
  if (status !== "draft" && status !== "published") return fail("Bad status");
  const res = await changeNote(ctx.n!.id, (x) => (status === "published" ? publishBlock(x) : null), (x) => ({ ...x, status }));
  return res.ok ? { ok: true } : fail(res.error);
}

export async function deleteNoteAction(noteId: unknown): Promise<{ ok: true } | Fail> {
  const ctx = await vendorNote(noteId);
  if ("error" in ctx) return fail(ctx.error!);
  if (ctx.n!.sales > 0) return fail("Buyers keep access to sold notes, so they can't be deleted. Unpublish them instead.");
  await removeNote(ctx.n!.id);
  await fs.rm(path.join(NOTES_DIR, ctx.n!.id), { recursive: true, force: true });
  return { ok: true };
}

export async function requestPayoutAction(rupees: unknown): Promise<{ ok: true; payout: Payout } | Fail> {
  const ctx = await vendorNote(undefined);
  if ("error" in ctx) return fail(ctx.error!);
  const parsed = z.number().positive("Enter an amount").max(1_000_000).safeParse(rupees);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Enter an amount");
  const res = await requestPayout(ctx.v, Math.round(parsed.data * 100));
  return res.ok ? { ok: true, payout: res.payout } : fail(res.error);
}

/* ================= Admin ================= */

export async function reviewVendorAction(userId: unknown, decision: unknown, note?: unknown): Promise<{ ok: true } | Fail> {
  await requireAdmin();
  const uid = id.safeParse(userId);
  const d = z.enum(["approved", "rejected", "suspended"]).safeParse(decision);
  if (!uid.success || !d.success) return fail("Bad request");
  const msg = z.string().trim().max(300).catch("").parse(note ?? "");
  if (d.data !== "approved" && msg.length < 5) return fail("Add a short reason for the seller");
  const res = await changeVendor(uid.data, () => null, (v) => ({ ...v, status: d.data, adminNote: msg || undefined, reviewedAt: nowIso() }));
  if (!res.ok) return fail(res.error);
  await vendorDecisionNotice(res.value);
  return { ok: true };
}

export async function moderateNoteAction(noteId: unknown, action: unknown, reason?: unknown): Promise<{ ok: true } | Fail> {
  await requireAdmin();
  const n = await loadNote(noteId);
  if (!n) return fail("Notes not found");
  const why = z.string().trim().max(300).catch("").parse(reason ?? "");
  if (action === "hide") {
    if (why.length < 5) return fail("Add a reason (the seller sees it)");
    await changeNote(n.id, () => null, (x) => ({ ...x, hidden: { reason: why, at: nowIso(), by: "admin" } }));
    await closeReports(n.id, "resolved");
    return { ok: true };
  }
  if (action === "restore") {
    await changeNote(n.id, () => null, (x) => ({ ...x, hidden: undefined }));
    await closeReports(n.id, "dismissed");
    return { ok: true };
  }
  if (action === "dismiss") {
    await closeReports(n.id, "dismissed");
    return { ok: true };
  }
  return fail("Bad action");
}

const payoutDecision = z.object({ decision: z.enum(["paid", "rejected"]), reference: z.string().trim().max(60).catch(""), note: z.string().trim().max(300).catch("") });

export async function decidePayoutAction(payoutId: unknown, input: unknown): Promise<{ ok: true } | Fail> {
  await requireAdmin();
  const pid = id.safeParse(payoutId);
  const d = payoutDecision.safeParse(input);
  if (!pid.success || !d.success) return fail("Bad request");
  const { reference: ref, note: why } = d.data;
  if (d.data.decision === "paid" && ref.length < 4) return fail("Enter the UPI / bank transaction reference");
  if (d.data.decision === "rejected" && why.length < 5) return fail("Add a reason for the seller");
  const res = await decidePayout(pid.data, d.data.decision, ref, why);
  return res.ok ? { ok: true } : fail(res.error);
}

const settingsSchema = z.object({ commissionPercent: z.number().min(0).max(90, "Keep commission at or below 90%"), minPayoutRupees: z.number().min(1).max(100_000) });

export async function saveNotesSettingsAction(input: unknown): Promise<{ ok: true } | Fail> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid");
  await saveNotesSettings({ commissionBps: Math.round(parsed.data.commissionPercent * 100), minPayout: Math.round(parsed.data.minPayoutRupees * 100) });
  return { ok: true };
}

export async function loadDemoNotesAction(): Promise<{ ok: true; added: number } | Fail> {
  const admin = await requireAdmin();
  const { loadDemoNotes } = await import("./demo");
  return { ok: true, added: await loadDemoNotes(admin) };
}
