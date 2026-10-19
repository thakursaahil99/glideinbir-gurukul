"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Check, CloudUpload, ExternalLink, FileText, ImagePlus, Loader2, Rocket, Trash2, Undo2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { rpc } from "@/lib/rpc";
import { cn, formatPaise } from "@/lib/utils";
import { fmtBytes, maxPreview, MIN_PRICE, publishBlock } from "../logic";
import { NOTE_SUBJECTS, type NoteItem, type NoteSubject } from "../types";
import { GRADIENT, INPUT, NoteCover, Notice, uploadWithProgress } from "./bits";

type Msg = { ok: boolean; text: string } | null;

export function NoteEditor({ initial, initialCoverUrl }: { initial: NoteItem; initialCoverUrl: string | null }) {
  const router = useRouter();
  const [note, setNote] = useState(initial);
  const [coverUrl, setCoverUrl] = useState(initialCoverUrl);
  const [price, setPrice] = useState(String(initial.price / 100));
  const [tag, setTag] = useState("");
  const [upload, setUpload] = useState<{ kind: "pdf" | "cover"; pct: number } | null>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const pdfInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const pricePaise = Math.round((Number(price) || 0) * 100);
  const maxPrev = maxPreview(note.pages, pricePaise);
  const block = publishBlock({ ...note, price: pricePaise });
  const set = (patch: Partial<NoteItem>) => setNote((n) => ({ ...n, ...patch }));

  async function sendFile(kind: "pdf" | "cover", file: File) {
    setMsg(null);
    if (kind === "pdf" && file.type !== "application/pdf") return setMsg({ ok: false, text: "Choose a PDF file" });
    setUpload({ kind, pct: 0 });
    const res = await uploadWithProgress(`/api/notes/upload?noteId=${note.id}&kind=${kind}`, file, (pct) => setUpload({ kind, pct }));
    setUpload(null);
    if (!res.ok) return setMsg({ ok: false, text: String(res.data.error ?? "Upload failed") });
    if (kind === "pdf") {
      setNote((n) => ({ ...n, file: String(res.data.file), pages: Number(res.data.pages), bytes: Number(res.data.bytes), previewPages: Number(res.data.previewPages) }));
      setMsg({ ok: true, text: `PDF uploaded: ${res.data.pages} pages.` });
    } else {
      setNote((n) => ({ ...n, cover: String(res.data.file) }));
      setCoverUrl(`/api/notes/cover/${note.id}?v=${res.data.file}`);
      setMsg({ ok: true, text: "Cover updated." });
    }
  }

  const payload = () => ({ title: note.title, description: note.description, subject: note.subject, tags: note.tags, priceRupees: Number(price) || 0, previewPages: Math.min(note.previewPages, Math.max(1, maxPrev)) });

  async function run(key: string, job: () => Promise<{ ok: boolean; error?: string }>, okText: string) {
    setBusy(key);
    setMsg(null);
    try {
      const res = await job();
      setMsg(res.ok ? { ok: true, text: okText } : { ok: false, text: res.error ?? "Something went wrong" });
      return res.ok;
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong" });
      return false;
    } finally {
      setBusy(null);
    }
  }

  const addTag = () => {
    const t = tag.trim();
    if (t.length >= 2 && !note.tags.includes(t) && note.tags.length < 8) set({ tags: [...note.tags, t] });
    setTag("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/notes/sell" className="flex items-center gap-2 text-sm font-semibold text-muted hover:text-fg">
          <ArrowLeft className="size-4" /> Seller hub
        </Link>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", note.hidden ? "bg-rose/15 text-rose" : note.status === "published" ? "bg-teal/15 text-teal" : "bg-fg/10")}>{note.hidden ? "Hidden by review" : note.status === "published" ? "Live" : "Draft"}</span>
        {note.status === "published" && !note.hidden && (
          <Link href={`/notes/${note.id}`} className="ml-auto flex items-center gap-1.5 text-sm font-semibold text-[#2ee6c5]">
            View listing <ExternalLink className="size-3.5" />
          </Link>
        )}
      </div>

      {note.hidden && <p className="rounded-2xl border border-rose/40 bg-rose/10 p-3 text-sm">Hidden from the marketplace: {note.hidden.reason}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          {/* PDF */}
          <section
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              const f = e.dataTransfer.files[0];
              if (f) void sendFile("pdf", f);
            }}
            className={cn("relative overflow-hidden rounded-[28px] border-2 border-dashed p-6 text-center transition-colors", drag ? "border-[#2ee6c5] bg-[#00b89c]/10" : "border-line glass")}
          >
            <input ref={pdfInput} type="file" accept="application/pdf" hidden aria-label="Upload PDF" onChange={(e) => e.target.files?.[0] && sendFile("pdf", e.target.files[0])} />
            {upload?.kind === "pdf" ? (
              <div className="py-4">
                <Loader2 className="mx-auto size-8 animate-spin text-[#2ee6c5]" />
                <p className="mt-3 font-semibold">Uploading… {upload.pct}%</p>
                <div className="mx-auto mt-3 h-2 max-w-sm overflow-hidden rounded-full bg-fg/10">
                  <motion.div className={cn("h-full", GRADIENT)} animate={{ width: `${upload.pct}%` }} />
                </div>
              </div>
            ) : note.file ? (
              <div className="flex flex-wrap items-center gap-4 text-left">
                <span className={cn("grid size-14 place-items-center rounded-2xl text-white", GRADIENT)}>
                  <FileText className="size-7" />
                </span>
                <div className="flex-1">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <Check className="size-4 text-teal" /> PDF ready
                  </p>
                  <p className="text-sm text-muted">
                    {note.pages} pages · {fmtBytes(note.bytes)}
                  </p>
                </div>
                <button type="button" onClick={() => pdfInput.current?.click()} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:bg-fg/5">
                  Replace PDF
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => pdfInput.current?.click()} className="w-full py-6">
                <motion.span animate={{ y: [0, -6, 0] }} transition={{ duration: 2, repeat: Infinity }} className={cn("mx-auto grid size-16 place-items-center rounded-3xl text-white", GRADIENT)}>
                  <CloudUpload className="size-8" />
                </motion.span>
                <p className="mt-4 font-display text-lg font-bold">Drop your PDF here or click to upload</p>
                <p className="text-sm text-muted">Up to 30 MB. Password-protected PDFs aren&apos;t supported.</p>
              </button>
            )}
          </section>

          <section className="glass space-y-4 rounded-[28px] p-5 sm:p-6">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Title</span>
              <input value={note.title} onChange={(e) => set({ title: e.target.value })} maxLength={100} className={INPUT} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Description</span>
              <textarea value={note.description} onChange={(e) => set({ description: e.target.value })} rows={5} maxLength={3000} placeholder="What's inside, which exam it's for, how it's organised, what makes it better than the textbook…" className={INPUT} />
              <span className="mt-1 block text-right text-xs text-muted">{note.description.length}/3000</span>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">Subject</span>
                <select value={note.subject} onChange={(e) => set({ subject: e.target.value as NoteSubject })} className={INPUT}>
                  {NOTE_SUBJECTS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">Price (₹, 0 = free)</span>
                <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className={INPUT} />
                {pricePaise > 0 && pricePaise < MIN_PRICE && <span className="mt-1 block text-xs text-rose">Paid notes start at ₹{MIN_PRICE / 100}</span>}
              </label>
            </div>
            <div>
              <span className="mb-1.5 block text-sm font-semibold">Tags</span>
              <div className="flex flex-wrap gap-1.5">
                {note.tags.map((t) => (
                  <span key={t} className="flex items-center gap-1 rounded-lg bg-fg/[0.06] py-0.5 pr-1 pl-2 text-xs">
                    {t}
                    <button type="button" onClick={() => set({ tags: note.tags.filter((x) => x !== t) })} aria-label={`Remove ${t}`}>
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
              <input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                onBlur={addTag}
                maxLength={24}
                aria-label="Add a tag"
                placeholder="Add a tag and press Enter"
                className={cn(INPUT, "mt-2")}
              />
            </div>
            <div>
              <span className="mb-1.5 flex justify-between text-sm font-semibold">
                Free preview <span className="text-muted tabular-nums">{note.pages ? `${Math.min(note.previewPages, Math.max(1, maxPrev))} of ${note.pages} pages` : "upload a PDF first"}</span>
              </span>
              <input type="range" min={1} max={Math.max(1, maxPrev)} value={Math.min(note.previewPages, Math.max(1, maxPrev))} disabled={!note.pages} onChange={(e) => set({ previewPages: Number(e.target.value) })} aria-label="Free preview pages" className="w-full accent-[#00b89c]" />
              <p className="text-xs text-muted">{pricePaise ? "Paid notes can preview up to 30% of their pages." : "Free notes can preview up to 20 pages."}</p>
            </div>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <section className="glass rounded-[28px] p-5">
            <p className="mb-4 text-xs font-semibold tracking-wide text-muted uppercase">Listing preview</p>
            <div className="mx-auto w-44">
              <NoteCover title={note.title} subject={note.subject} pages={note.pages} coverUrl={coverUrl} className="aspect-[3/4]" />
            </div>
            <p className="mt-4 line-clamp-2 text-center font-semibold">{note.title}</p>
            <p className="text-center font-display text-xl font-bold">{pricePaise ? formatPaise(pricePaise) : "Free"}</p>
            <input ref={coverInput} type="file" accept="image/png,image/jpeg,image/webp" hidden aria-label="Upload cover" onChange={(e) => e.target.files?.[0] && sendFile("cover", e.target.files[0])} />
            <button type="button" disabled={!!upload} onClick={() => coverInput.current?.click()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-line py-2.5 text-sm font-semibold hover:bg-fg/5">
              {upload?.kind === "cover" ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} {note.cover ? "Change cover" : "Upload cover (optional)"}
            </button>
          </section>

          <section className="glass space-y-3 rounded-[28px] p-5">
            <Notice msg={msg} />
            <button type="button" disabled={!!busy || !!upload} onClick={() => run("save", () => rpc("notesSell.save", note.id, payload()), "Saved")} className="flex w-full items-center justify-center gap-2 rounded-xl border border-line py-2.5 text-sm font-semibold hover:bg-fg/5 disabled:opacity-50">
              {busy === "save" && <Loader2 className="size-4 animate-spin" />} Save draft
            </button>
            {note.status === "published" ? (
              <button
                type="button"
                disabled={!!busy}
                onClick={async () => {
                  if (await run("unpub", () => rpc("notesSell.status", note.id, "draft"), "Unpublished. Buyers keep their access.")) set({ status: "draft" });
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-fg/10 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                <Undo2 className="size-4" /> Unpublish
              </button>
            ) : (
              <button
                type="button"
                disabled={!!busy || !!upload || !!block}
                onClick={async () => {
                  const ok = await run(
                    "pub",
                    async () => {
                      const saved = await rpc("notesSell.save", note.id, payload());
                      return saved.ok ? rpc("notesSell.status", note.id, "published") : saved;
                    },
                    "Published! Your notes are live in the marketplace.",
                  );
                  if (ok) set({ status: "published" });
                }}
                className={cn("flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50", GRADIENT)}
              >
                {busy === "pub" ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />} Publish
              </button>
            )}
            {block && note.status !== "published" && <p className="text-center text-xs text-muted">{block}</p>}
            {note.sales === 0 && (
              <button
                type="button"
                disabled={!!busy}
                onClick={async () => {
                  if (!window.confirm("Delete these notes and the uploaded PDF?")) return;
                  if (await run("del", () => rpc("notesSell.delete", note.id), "Deleted")) router.push("/notes/sell");
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold text-rose hover:bg-rose/10"
              >
                <Trash2 className="size-4" /> Delete
              </button>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
