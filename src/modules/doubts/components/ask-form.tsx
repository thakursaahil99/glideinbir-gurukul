"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert, ImagePlus, Loader2, MessagesSquare, Radar, ShieldCheck, Wallet, X, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { rpc } from "@/lib/rpc";
import { cn, formatPaise } from "@/lib/utils";
import { SESSION_LIMITS, SUBJECTS, type Subject } from "../types";

export interface SubjectStat {
  subject: Subject;
  online: number;
  minRate: number | null;
}

export function AskForm({ stats, balance }: { stats: SubjectStat[]; balance: number }) {
  const router = useRouter();
  const [subject, setSubject] = useState<Subject>(() => stats.find((s) => s.online > 0)?.subject ?? "Physics");
  const [text, setText] = useState("");
  const [limit, setLimit] = useState<number>(10);
  const [image, setImage] = useState<{ file: string; preview: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; openId?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const stat = stats.find((s) => s.subject === subject)!;
  const estimate = stat.minRate ? stat.minRate * limit : null;

  const attach = async (f: File) => {
    setError(null);
    if (!["image/png", "image/jpeg", "image/webp"].includes(f.type)) return setError({ text: "Use a PNG, JPG or WebP image" });
    if (f.size > 5 * 1024 * 1024) return setError({ text: "Image must be under 5 MB" });
    setUploading(true);
    try {
      const res = await fetch("/api/doubts/upload", { method: "PUT", headers: { "Content-Type": f.type }, body: f });
      const body = await res.json();
      if (!res.ok) return setError({ text: body.error ?? "Upload failed" });
      setImage({ file: body.file, preview: URL.createObjectURL(f) });
    } catch {
      setError({ text: "Upload failed. Check your connection." });
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await rpc("doubts.ask", { subject, text, limitMin: limit, image: image?.file ?? null });
      if (res.ok) router.push(`/doubts/${res.id}`);
      else setError({ text: res.error, openId: "openId" in res ? res.openId : undefined });
    } catch (e) {
      setError({ text: e instanceof Error ? e.message : "Something went wrong" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-[28px] p-6 sm:p-8">
        <p className="text-sm font-semibold">1. Subject</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {stats.map((s) => (
            <button
              key={s.subject}
              type="button"
              aria-pressed={subject === s.subject}
              onClick={() => setSubject(s.subject)}
              className={cn("relative flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors", subject === s.subject ? "border-transparent text-white" : "border-line text-muted hover:text-fg")}
            >
              {subject === s.subject && <motion.span layoutId="subject-pill" className="absolute inset-0 rounded-full bg-gradient-to-r from-[#ffb800] to-[#ff5e3a]" />}
              <span className="relative">{s.subject}</span>
              <span className={cn("relative size-1.5 rounded-full", s.online ? "bg-teal" : "bg-fg/20")} aria-label={s.online ? `${s.online} online` : "no tutors online"} />
            </button>
          ))}
        </div>

        <label htmlFor="doubt-text" className="mt-6 block text-sm font-semibold">
          2. Your doubt
        </label>
        <textarea
          id="doubt-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          rows={5}
          placeholder="e.g. In projectile motion, why is the horizontal velocity constant? I don't get step 3 of my book's example."
          className="mt-2 w-full rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-primary"
        />
        <div className="mt-2 flex items-center gap-3">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && attach(e.target.files[0])} />
          {image ? (
            <span className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.preview} alt="Attached" className="h-16 rounded-xl ring-1 ring-line" />
              <button type="button" onClick={() => setImage(null)} aria-label="Remove image" className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-rose text-white">
                <X className="size-3.5" />
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-sm font-semibold text-muted hover:text-fg">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} Attach a photo (optional)
            </button>
          )}
          <span className="ml-auto text-xs text-muted">{text.length}/2000</span>
        </div>

        <p className="mt-6 text-sm font-semibold">3. Session length (max)</p>
        <div className="mt-3 inline-flex rounded-2xl border border-line p-1">
          {SESSION_LIMITS.map((n) => (
            <button key={n} type="button" onClick={() => setLimit(n)} className={cn("relative rounded-xl px-5 py-2 text-sm font-semibold", limit === n ? "text-bg" : "text-muted")}>
              {limit === n && <motion.span layoutId="limit-pill" className="absolute inset-0 rounded-xl bg-fg" />}
              <span className="relative">{n} min</span>
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-fg/[0.04] p-4 text-sm">
          {stat.online ? (
            <p>
              <b className="text-teal">{stat.online}</b> {subject} tutor{stat.online > 1 ? "s" : ""} online · from <b>{formatPaise(stat.minRate!)}/min</b>. Up to <b>{formatPaise(estimate!)}</b> is held when a tutor accepts; you only pay for minutes used and the first minute is free.
            </p>
          ) : (
            <p className="text-muted">No {subject} tutors are online right now. Try another subject or check back soon.</p>
          )}
          <p className="mt-2 flex items-center gap-1.5 text-muted">
            <Wallet className="size-4" /> Wallet balance {formatPaise(balance)}
            {estimate !== null && balance < estimate && (
              <Link href="/wallet" className="ml-2 font-semibold text-primary hover:underline">
                Add money
              </Link>
            )}
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.p role="status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 flex items-center gap-2 rounded-2xl border border-rose/40 bg-rose/10 p-3 text-sm">
              <CircleAlert className="size-4 shrink-0 text-rose" /> {error.text}
              {error.openId && (
                <Link href={`/doubts/${error.openId}`} className="ml-auto font-semibold text-primary hover:underline">
                  Open it
                </Link>
              )}
            </motion.p>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={submit}
          disabled={busy || text.trim().length < 10 || !stat.online}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ffb800] to-[#ff5e3a] py-4 font-semibold text-white shadow-[0_20px_50px_-15px_#ff5e3a] disabled:opacity-50 disabled:shadow-none"
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : <Zap className="size-5" />} Find me a tutor now
        </button>
      </motion.div>

      <aside className="space-y-4">
        <div className="glass rounded-[28px] p-6">
          <p className="font-display text-lg font-bold">How it works</p>
          <ol className="mt-4 space-y-4">
            {[
              [Radar, "We ping online tutors for your subject", "The first to accept gets your doubt. Nobody in 2 minutes? It expires, free."],
              [MessagesSquare, "Chat (and video) 1-on-1", "Share the question, get it solved live."],
              [Wallet, "Pay per minute used", "The unused part of the hold returns to your wallet instantly."],
              [ShieldCheck, "Rate your tutor", "Ratings keep the good tutors on top."],
            ].map(([Icon, title, body], i) => {
              const I = Icon as typeof Zap;
              return (
                <motion.li key={title as string} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.08 }} className="flex gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#ffb800] to-[#ff5e3a] text-white">
                    <I className="size-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{title as string}</span>
                    <span className="block text-xs text-muted">{body as string}</span>
                  </span>
                </motion.li>
              );
            })}
          </ol>
        </div>
      </aside>
    </div>
  );
}

export const ALL_SUBJECTS = SUBJECTS;
