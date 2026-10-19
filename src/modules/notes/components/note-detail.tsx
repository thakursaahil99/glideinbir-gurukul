"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BookOpenCheck, Check, Download, Eye, Flag, Loader2, Lock, ShieldCheck, Star, Wallet, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { topUpWallet } from "@/core/payments/checkout-client";
import { MIN_RECHARGE_RUPEES } from "@/core/payments/limits";
import { rpc } from "@/lib/rpc";
import { refreshSummary } from "@/lib/summary";
import { cn, formatPaise } from "@/lib/utils";
import { fmtBytes } from "../logic";
import type { NoteCard } from "../queries";
import { REPORT_REASONS, type ReportReason } from "../types";
import { GRADIENT, INPUT, NoteCover, Notice, Stars } from "./bits";

export interface DetailProps {
  note: NoteCard & { description: string; bytes: number; hidden: string | null };
  vendor: { storeName: string; bio: string; notes: number };
  access: "none" | "owned" | "seller";
  balance: number;
  reviews: { name: string; stars: number; text: string; createdAt: string }[];
  reviewed: boolean;
}

type Msg = { ok: boolean; text: string } | null;

export function NoteDetail(p: DetailProps) {
  const { note: n } = p;
  const [access, setAccess] = useState(p.access);
  const [reviews, setReviews] = useState(p.reviews);
  const [reviewed, setReviewed] = useState(p.reviewed);
  const [showPreview, setShowPreview] = useState(false);
  const [reporting, setReporting] = useState(false);

  return (
    <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
      <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
        <motion.div initial={{ opacity: 0, y: 30, rotate: -3 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ type: "spring", stiffness: 120, damping: 16 }} className="mx-auto w-full max-w-[300px]">
          <NoteCover title={n.title} subject={n.subject} pages={n.pages} coverUrl={n.coverUrl} big className="aspect-[3/4]" />
        </motion.div>
        <BuyCard {...p} access={access} onBought={() => setAccess("owned")} />
      </div>

      <div className="min-w-0 space-y-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-[#00b89c]/15 px-2.5 py-0.5 font-bold text-[#2ee6c5]">{n.subject}</span>
            {n.tags.map((t) => (
              <span key={t} className="rounded-full bg-fg/[0.06] px-2.5 py-0.5 font-medium">
                {t}
              </span>
            ))}
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">{n.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            <span>
              by <b className="text-fg">{n.vendorName}</b>
            </span>
            {n.rating && (
              <span className="flex items-center gap-1.5">
                <Stars value={n.rating} /> <b className="text-fg">{n.rating.toFixed(1)}</b> ({n.ratings})
              </span>
            )}
            <span>{n.pages} pages</span>
            <span>{fmtBytes(n.bytes)}</span>
            {n.sales > 0 && <span>{n.sales} learners</span>}
          </div>
        </div>

        {n.hidden && <p className="rounded-2xl border border-saffron/40 bg-saffron/10 p-3 text-sm">These notes are under review and can&apos;t be bought right now. {access !== "none" && "You still have full access."}</p>}

        <section className="glass rounded-[26px] p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold">About these notes</h2>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-muted">{n.description}</p>
        </section>

        {/* Preview */}
        <section className="glass overflow-hidden rounded-[26px]">
          <div className="flex flex-wrap items-center gap-3 p-5 sm:p-6">
            <span className={cn("grid size-11 place-items-center rounded-2xl text-white", GRADIENT)}>
              <Eye className="size-5" />
            </span>
            <div className="flex-1">
              <p className="font-display text-lg font-bold">Free preview</p>
              <p className="text-sm text-muted">
                Read the first {n.previewPages} of {n.pages} pages before you {n.price ? "buy" : "download"}.
              </p>
            </div>
            <button type="button" onClick={() => setShowPreview((s) => !s)} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:bg-fg/5">
              {showPreview ? "Hide preview" : "Read preview"}
            </button>
          </div>
          <AnimatePresence>
            {showPreview && (
              <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t border-line">
                <iframe title="Notes preview" src={`/api/notes/preview/${n.id}#toolbar=0&navpanes=0&view=FitH`} className="h-[75vh] w-full bg-white" />
                <p className="p-3 text-center text-xs text-muted">
                  Can&apos;t see it?{" "}
                  <a href={`/api/notes/preview/${n.id}`} target="_blank" rel="noreferrer" className="font-semibold text-[#2ee6c5] underline">
                    Open the preview in a new tab
                  </a>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section className="glass rounded-[26px] p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold">About the seller</h2>
          <p className="mt-1 font-semibold">{p.vendor.storeName}</p>
          <p className="mt-1 text-sm text-muted">{p.vendor.bio}</p>
          <p className="mt-2 text-xs text-muted">{p.vendor.notes} notes on Glideinbir</p>
        </section>

        <section className="glass rounded-[26px] p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold">Reviews</h2>
          {access === "owned" && !reviewed && (
            <ReviewForm
              noteId={n.id}
              onDone={(r) => {
                setReviews((x) => [r, ...x]);
                setReviewed(true);
              }}
            />
          )}
          {reviews.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No reviews yet{access === "owned" ? ". Be the first!" : "."}</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {reviews.map((r, i) => (
                <li key={`${r.name}-${r.createdAt}-${i}`} className="text-sm">
                  <div className="flex items-center gap-2">
                    <Stars value={r.stars} /> <b>{r.name}</b>
                  </div>
                  {r.text && <p className="mt-1 text-muted">{r.text}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        {access !== "seller" && (
          <div className="text-right">
            <button type="button" onClick={() => setReporting(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-rose">
              <Flag className="size-3.5" /> Report these notes
            </button>
          </div>
        )}
        <AnimatePresence>{reporting && <ReportDialog noteId={n.id} onClose={() => setReporting(false)} />}</AnimatePresence>
      </div>
    </div>
  );
}

function BuyCard({ note: n, balance, access, onBought }: DetailProps & { onBought: () => void }) {
  const [busy, setBusy] = useState<"buy" | "dl" | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const shortfall = Math.max(0, n.price - balance);
  const topUp = Math.max(MIN_RECHARGE_RUPEES, Math.ceil(shortfall / 100));

  async function buy() {
    setBusy("buy");
    setMsg(null);
    try {
      if (shortfall > 0) {
        const top = await topUpWallet(topUp, `Top-up for ${n.title}`);
        if (!top.ok) return setMsg({ ok: false, text: top.message });
      }
      const res = await rpc("notes.buy", n.id);
      if (!res.ok) return setMsg({ ok: false, text: res.error });
      refreshSummary();
      onBought();
      setMsg({ ok: true, text: "Added to your library. Download whenever you like." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong" });
    } finally {
      setBusy(null);
    }
  }

  async function download() {
    setBusy("dl");
    setMsg(null);
    try {
      const res = await rpc("notes.download", n.id);
      if (!res.ok) return setMsg({ ok: false, text: res.error });
      window.location.href = res.url;
      setMsg({ ok: true, text: "Your download is starting. The PDF carries your name, please don't share it." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="glass rounded-[26px] p-5">
      {access === "none" ? (
        <>
          <p className="font-display text-4xl font-bold">{n.price ? formatPaise(n.price) : <span className="text-teal">Free</span>}</p>
          {n.price > 0 && (
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
              <Wallet className="size-4" /> Wallet balance {formatPaise(balance)}
            </p>
          )}
          <button type="button" disabled={!!busy || !!n.hidden} onClick={buy} className={cn("mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-white shadow-lg shadow-[#00b89c]/25 disabled:opacity-50", GRADIENT)}>
            {busy === "buy" ? <Loader2 className="size-5 animate-spin" /> : <Lock className="size-4" />}
            {n.price === 0 ? "Get it free" : shortfall > 0 ? `Add ${formatPaise(topUp * 100)} & buy` : "Buy with wallet"}
          </button>
          {shortfall > 0 && n.price > 0 && <p className="mt-2 text-center text-xs text-muted">We&apos;ll top up your wallet via Razorpay (UPI, cards, netbanking), then unlock the notes.</p>}
        </>
      ) : (
        <>
          <p className="flex items-center gap-2 font-semibold text-teal">{access === "seller" ? <BookOpenCheck className="size-5" /> : <Check className="size-5" />} {access === "seller" ? "Your notes" : "In your library"}</p>
          <button type="button" disabled={!!busy} onClick={download} className={cn("mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-white shadow-lg shadow-[#00b89c]/25 disabled:opacity-50", GRADIENT)}>
            {busy === "dl" ? <Loader2 className="size-5 animate-spin" /> : <Download className="size-5" />} Download PDF
          </button>
          {access === "seller" && (
            <Link href={`/notes/sell/${n.id}`} className="mt-2 block rounded-xl border border-line py-2.5 text-center text-sm font-semibold hover:bg-fg/5">
              Edit listing
            </Link>
          )}
        </>
      )}
      <div className="mt-3">
        <Notice msg={msg} />
      </div>
      <ul className="mt-4 space-y-1.5 border-t border-line pt-4 text-xs text-muted">
        <li className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-teal" /> Secure download, yours forever
        </li>
        <li className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-teal" /> {n.previewPages} free preview pages before you pay
        </li>
      </ul>
    </div>
  );
}

function ReviewForm({ noteId, onDone }: { noteId: string; onDone: (r: DetailProps["reviews"][number]) => void }) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="mt-3 rounded-2xl bg-fg/[0.04] p-4">
      <p className="text-sm font-semibold">How useful were these notes?</p>
      <div className="mt-2 flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <motion.button key={i} type="button" whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }} onMouseEnter={() => setHover(i)} onClick={() => setStars(i)} aria-label={`${i} star${i > 1 ? "s" : ""}`}>
            <Star className={cn("size-7", i <= (hover || stars) ? "fill-saffron text-saffron" : "text-fg/20")} />
          </motion.button>
        ))}
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={800} placeholder="What did you like? (optional)" className={cn(INPUT, "mt-3")} />
      {err && <p className="mt-2 text-sm text-rose">{err}</p>}
      <button
        type="button"
        disabled={!stars || busy}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          try {
            const res = await rpc("notes.review", noteId, { stars, text });
            if (res.ok) onDone({ name: "You", stars, text: text.trim(), createdAt: new Date().toISOString() });
            else setErr(res.error);
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Something went wrong");
          }
          setBusy(false);
        }}
        className={cn("mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50", GRADIENT)}
      >
        {busy && <Loader2 className="size-4 animate-spin" />} Post review
      </button>
    </div>
  );
}

function ReportDialog({ noteId, onClose }: { noteId: string; onClose: () => void }) {
  const [reason, setReason] = useState<ReportReason>("copied");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  return (
    <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div role="dialog" aria-modal="true" aria-label="Report notes" initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-[26px] bg-card-solid p-6 ring-1 ring-line">
        <div className="flex items-center justify-between">
          <p className="font-display text-lg font-bold">Report these notes</p>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-full hover:bg-fg/5">
            <X className="size-4" />
          </button>
        </div>
        {msg?.ok ? (
          <p className="mt-4 text-sm">{msg.text}</p>
        ) : (
          <>
            <div className="mt-4 space-y-2">
              {(Object.keys(REPORT_REASONS) as ReportReason[]).map((r) => (
                <label key={r} className={cn("flex cursor-pointer items-center gap-3 rounded-xl p-3 text-sm ring-1", reason === r ? "bg-rose/10 ring-rose/40" : "ring-line")}>
                  <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="accent-rose" />
                  {REPORT_REASONS[r]}
                </label>
              ))}
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={600} placeholder="Details help our team (e.g. where it was copied from)" className={cn(INPUT, "mt-3")} />
            <div className="mt-3">
              <Notice msg={msg} />
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const res = await rpc("notes.report", noteId, { reason, text });
                  setMsg(res.ok ? { ok: true, text: "Thanks. Our team will review these notes." } : { ok: false, text: res.error });
                } catch (e) {
                  setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong" });
                }
                setBusy(false);
              }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-rose py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy && <Loader2 className="size-4 animate-spin" />} Send report
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
