import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { isListed, maxPreview, publishBlock } from "@/modules/notes/logic";
import type { NoteItem } from "@/modules/notes/types";

const dir = mkdtempSync(path.join(tmpdir(), "gg-notes-"));
type Media = typeof import("@/modules/notes/media");
type Store = typeof import("@/modules/notes/store");
type Demo = typeof import("@/modules/notes/demo");
let media: Media;
let store: Store;
let demo: Demo;

beforeAll(async () => {
  process.env.SESSION_SECRET = "test-secret-test-secret-test-secret-123";
  vi.spyOn(process, "cwd").mockReturnValue(dir);
  vi.resetModules();
  media = await import("@/modules/notes/media");
  store = await import("@/modules/notes/store");
  demo = await import("@/modules/notes/demo");
});
afterAll(() => {
  vi.restoreAllMocks();
  rmSync(dir, { recursive: true, force: true });
});

const note = (extra: Partial<NoteItem> = {}): NoteItem => ({
  id: "11111111-1111-4111-8111-111111111111",
  vendorId: "v1",
  vendorName: "Store",
  title: "Physics formula sheet",
  description: "A complete formula sheet for mechanics with solved examples and tips.",
  subject: "JEE",
  tags: [],
  price: 4900,
  previewPages: 2,
  file: "f.pdf",
  pages: 10,
  bytes: 1000,
  cover: null,
  status: "published",
  sales: 0,
  createdAt: "",
  updatedAt: "",
  ...extra,
});

describe("listing rules", () => {
  it("caps the free preview at 30% for paid notes, 20 pages for free ones", () => {
    expect(maxPreview(10, 4900)).toBe(3);
    expect(maxPreview(2, 4900)).toBe(1);
    expect(maxPreview(200, 4900)).toBe(20);
    expect(maxPreview(8, 0)).toBe(8);
    expect(maxPreview(0, 0)).toBe(0);
  });
  it("blocks publishing without a PDF, a description or a valid preview", () => {
    expect(publishBlock(note())).toBeNull();
    expect(publishBlock(note({ file: null, pages: 0 }))).toMatch(/Upload the PDF/);
    expect(publishBlock(note({ description: "short" }))).toMatch(/30 characters/);
    expect(publishBlock(note({ previewPages: 4 }))).toMatch(/1–3 pages/);
  });
  it("lists only published, unhidden notes of approved sellers", () => {
    expect(isListed(note(), { status: "approved" })).toBe(true);
    expect(isListed(note({ status: "draft" }), { status: "approved" })).toBe(false);
    expect(isListed(note({ hidden: { reason: "x", at: "", by: "admin" } }), { status: "approved" })).toBe(false);
    expect(isListed(note(), { status: "suspended" })).toBe(false);
    expect(isListed(note(), null)).toBe(false);
  });
});

describe("signed download links", () => {
  const NOW = 1_800_000_000_000;
  const parse = (url: string) => new URL(url, "http://x").searchParams;
  it("work for the same user before they expire", () => {
    const q = parse(media.signDownload("n1", "u1", 5 * 60_000, NOW));
    expect(media.verifyDownload("n1", "u1", q.get("exp"), q.get("sig"), NOW + 60_000)).toBe(true);
  });
  it("fail for another user, another note, after expiry or when tampered", () => {
    const q = parse(media.signDownload("n1", "u1", 5 * 60_000, NOW));
    expect(media.verifyDownload("n1", "u2", q.get("exp"), q.get("sig"), NOW)).toBe(false);
    expect(media.verifyDownload("n2", "u1", q.get("exp"), q.get("sig"), NOW)).toBe(false);
    expect(media.verifyDownload("n1", "u1", q.get("exp"), q.get("sig"), NOW + 6 * 60_000)).toBe(false);
    expect(media.verifyDownload("n1", "u1", String(Number(q.get("exp")) + 3_600_000), q.get("sig"), NOW)).toBe(false);
    expect(media.verifyDownload("n1", "u1", q.get("exp"), null, NOW)).toBe(false);
  });
});

describe("PDF handling", () => {
  it("checks real file types from their bytes", () => {
    expect(media.magicOk("pdf", new TextEncoder().encode("%PDF-1.7\n"))).toBe(true);
    expect(media.magicOk("pdf", new TextEncoder().encode("<html>hello"))).toBe(false);
    expect(media.magicOk("png", Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(true);
  });
  it("counts pages, builds a cached preview and a watermarked copy", async () => {
    const { bytes, pages } = await demo.buildDemoPdf({ title: "Test notes", subject: "JEE", accent: [0.3, 0.3, 1], chapters: [{ title: "One", points: ["a", "b"] }, { title: "Two", points: ["c"] }] }, "Tester");
    expect(pages).toBe(5);
    expect(await media.inspectPdf(bytes)).toBe(5);
    const n = note({ file: "doc.pdf", pages, previewPages: 2 });
    mkdirSync(path.join(media.NOTES_DIR, n.id), { recursive: true });
    writeFileSync(media.notePath(n.id, "doc.pdf"), bytes);
    const preview = await PDFDocument.load(await media.previewPdf(n));
    expect(preview.getPageCount()).toBe(2);
    // Second call is served from the cache file.
    expect((await media.previewPdf(n)).length).toBeGreaterThan(0);
    const full = await PDFDocument.load(await media.watermarkedPdf(n, "Licensed to रिया Verma <riya@example.com>"));
    expect(full.getPageCount()).toBe(5);
  });
  it("rejects files that aren't real PDFs", async () => {
    await expect(media.inspectPdf(new TextEncoder().encode("%PDF-1.4 not really"))).rejects.toThrow();
  });
});

describe("store guards", () => {
  it("records one purchase per learner per note, even under a burst", async () => {
    const res = await Promise.all(Array.from({ length: 15 }, (_, i) => store.insertPurchase({ id: `p${i}`, noteId: "n1", userId: "u1", price: 4900, createdAt: "" })));
    expect(res.filter((r) => r.ok)).toHaveLength(1);
    expect((await store.listPurchases()).filter((p) => p.userId === "u1" && p.noteId === "n1")).toHaveLength(1);
  });
  it("allows one open payout request per seller", async () => {
    const p = { vendorId: "v1", vendorName: "S", amount: 10_000, upi: "a@ok", status: "requested" as const, requestedAt: "" };
    const res = await Promise.all([store.insertPayout({ ...p, id: "a" }), store.insertPayout({ ...p, id: "b" })]);
    expect(res.filter((r) => r.ok)).toHaveLength(1);
  });
  it("one open report per person per note", async () => {
    const r = { noteId: "n1", userId: "u9", userName: "X", reason: "copied" as const, text: "", status: "open" as const, createdAt: "" };
    expect((await store.insertReport({ ...r, id: "r1" })).ok).toBe(true);
    expect((await store.insertReport({ ...r, id: "r2" })).ok).toBe(false);
  });
});
