"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, CalendarSync, Check, Loader2, MessageSquareText, PartyPopper, Star, Video, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { rpc } from "@/lib/rpc";
import { refreshSummary } from "@/lib/summary";
import { cn, formatPaise } from "@/lib/utils";
import { cancelSplit, fmtDay, fmtTime, fmtWhen, JOIN_EARLY_MS, MAX_RESCHEDULES, phaseOf, rescheduleBlock, type Range } from "../logic";
import type { Booking } from "../types";
import { Avatar, countdown, GRADIENT, Notice, StatusBadge, useNow } from "./bits";
import { SlotPicker, type Day } from "./slot-picker";

type Msg = { ok: boolean; text: string } | null;

export function SessionRoom({ initial, role, serverNow, justBooked }: { initial: Booking; role: "student" | "mentor"; serverNow: number; justBooked: boolean }) {
  const now = useNow(serverNow);
  const [b, setB] = useState(initial);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [panel, setPanel] = useState<"cancel" | "move" | null>(null);
  const phase = phaseOf(b, now);
  const other = role === "student" ? b.mentorName : b.studentName;

  const reload = useCallback(async () => {
    try {
      const res = await rpc("mentorship.get", b.id);
      if (res.ok) setB(res.booking);
    } catch {}
  }, [b.id]);

  // Re-read when the room opens or the session ends (the server completes it then), plus a slow poll.
  useEffect(() => {
    const t = setInterval(reload, 30_000);
    return () => clearInterval(t);
  }, [reload]);
  useEffect(() => {
    if (phase === "ended" && b.status === "confirmed") void reload();
  }, [phase, b.status, reload]);

  async function run(key: string, job: () => Promise<{ ok: boolean; error?: string }>, okText?: string) {
    setBusy(key);
    setMsg(null);
    try {
      const res = await job();
      setMsg(res.ok ? (okText ? { ok: true, text: okText } : null) : { ok: false, text: res.error ?? "Something went wrong" });
      return res.ok;
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong" });
      return false;
    } finally {
      setBusy(null);
    }
  }

  const startsIn = Date.parse(b.start) - now;
  const moveBlock = rescheduleBlock(b, role, now);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-5">
        <AnimatePresence>{justBooked && b.status === "confirmed" && <BookedBanner />}</AnimatePresence>

        {/* Main stage */}
        <section className="glass relative overflow-hidden rounded-[30px] p-6 sm:p-8">
          <div className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full bg-[#c04dff]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-20 size-72 rounded-full bg-[#ff4da6]/15 blur-3xl" />
          <div className="relative flex flex-wrap items-center gap-4">
            <Avatar name={other} size="lg" />
            <div className="min-w-0 flex-1">
              <StatusBadge status={b.status} live={phase === "open"} />
              <p className="mt-2 font-display text-2xl font-bold sm:text-3xl">
                {role === "student" ? "With" : "Learner:"} {other}
              </p>
              <p className="flex items-center gap-1.5 text-sm text-muted">
                <CalendarClock className="size-4" /> {fmtDay(b.start)} · {fmtTime(b.start)} – {fmtTime(b.end)} IST
              </p>
            </div>
          </div>

          <div className="relative mt-8">
            {b.status === "cancelled" ? (
              <div className="rounded-2xl bg-fg/[0.04] p-5 text-sm">
                <p className="font-semibold">This session was cancelled{b.cancelledBy === "admin" ? " by the Glideinbir team" : b.cancelledBy === role ? " by you" : ` by ${other}`}.</p>
                {b.cancelReason && <p className="mt-1 text-muted">Reason: {b.cancelReason}</p>}
                <p className="mt-2 text-muted">{b.refund ? `${formatPaise(b.refund)} was refunded to the learner's wallet.` : "No refund (cancelled less than 24 hours before the start)."}</p>
              </div>
            ) : phase === "upcoming" ? (
              <Countdown ms={startsIn} openAt={Date.parse(b.start) - JOIN_EARLY_MS - now} />
            ) : phase === "open" ? (
              <div className="text-center">
                <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.6, repeat: Infinity }} className={cn("mx-auto grid size-24 place-items-center rounded-full text-white shadow-2xl shadow-[#ff4da6]/40", GRADIENT)}>
                  <Video className="size-10" />
                </motion.div>
                <p className="mt-4 font-display text-2xl font-bold">{startsIn > 0 ? `Starts in ${countdown(startsIn)}` : `Live now · ${countdown(Date.parse(b.end) - now)} left`}</p>
                <p className="text-sm text-muted">The room is open. Join a minute early to check your camera and mic.</p>
                <button
                  type="button"
                  disabled={busy === "join"}
                  onClick={() =>
                    run("join", async () => {
                      const res = await rpc("mentorship.join", b.id);
                      if (res.ok) window.open(res.url, "_blank", "noopener");
                      return res;
                    })
                  }
                  className={cn("mt-5 inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 font-semibold text-white shadow-lg shadow-[#ff4da6]/30", GRADIENT)}
                >
                  {busy === "join" ? <Loader2 className="size-4 animate-spin" /> : <Video className="size-4" />} Join video call
                </button>
              </div>
            ) : b.status === "completed" ? (
              role === "student" ? (
                <Feedback booking={b} onDone={(fb) => setB((x) => ({ ...x, feedback: fb }))} />
              ) : (
                <div className="rounded-2xl bg-teal/10 p-5 text-sm ring-1 ring-teal/30">
                  <p className="flex items-center gap-2 font-semibold">
                    <Check className="size-4 text-teal" /> Session complete. {formatPaise(b.price - Math.floor((b.price * b.commissionBps) / 10_000))} paid to your wallet.
                  </p>
                  {b.feedback ? (
                    <p className="mt-2 text-muted">
                      {"★".repeat(b.feedback.stars)} {b.feedback.text && `“${b.feedback.text}”`}
                    </p>
                  ) : (
                    <p className="mt-1 text-muted">Waiting for the learner&apos;s feedback.</p>
                  )}
                </div>
              )
            ) : (
              <p className="text-center text-sm text-muted">Wrapping up the session…</p>
            )}
          </div>
        </section>

        <Notice msg={msg} />

        <AnimatePresence mode="wait">
          {panel === "move" && (
            <Reschedule
              key="move"
              booking={b}
              onClose={() => setPanel(null)}
              onMove={async (slot) => {
                if (await run("move", () => rpc("mentorship.reschedule", b.id, slot.start), `Moved to ${fmtWhen(slot.start)}`)) {
                  setPanel(null);
                  await reload();
                }
              }}
              busy={busy === "move"}
            />
          )}
          {panel === "cancel" && (
            <CancelBox
              key="cancel"
              booking={b}
              role={role}
              now={now}
              busy={busy === "cancel"}
              onClose={() => setPanel(null)}
              onCancel={async (reason) => {
                if (await run("cancel", () => rpc("mentorship.cancel", b.id, reason), "Session cancelled")) {
                  setPanel(null);
                  refreshSummary();
                  await reload();
                }
              }}
            />
          )}
        </AnimatePresence>
      </div>

      <aside className="space-y-4">
        <div className="glass rounded-[24px] p-5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquareText className="size-4 text-[#ff4da6]" /> Agenda
          </p>
          <p className="mt-2 text-sm whitespace-pre-wrap text-muted">{b.agenda}</p>
          <div className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
            <p className="flex justify-between">
              <span className="text-muted">Price</span> <b>{formatPaise(b.price)}</b>
            </p>
            <p className="flex justify-between">
              <span className="text-muted">Booked</span> <span>{fmtDay(b.createdAt)}</span>
            </p>
            {b.reschedules > 0 && (
              <p className="flex justify-between">
                <span className="text-muted">Moved</span> <span>{b.reschedules}×</span>
              </p>
            )}
          </div>
        </div>

        {b.status === "confirmed" && phase !== "ended" && (
          <div className="glass space-y-2 rounded-[24px] p-5">
            <button type="button" disabled={!!moveBlock} onClick={() => setPanel("move")} className="flex w-full items-center justify-center gap-2 rounded-xl border border-line py-2.5 text-sm font-semibold hover:bg-fg/5 disabled:opacity-40">
              <CalendarSync className="size-4" /> Reschedule
            </button>
            {moveBlock && <p className="text-center text-xs text-muted">{moveBlock}</p>}
            {Date.parse(b.start) > now && (
              <button type="button" onClick={() => setPanel("cancel")} className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-rose hover:bg-rose/10">
                <X className="size-4" /> Cancel session
              </button>
            )}
            <p className="pt-1 text-center text-[11px] leading-relaxed text-muted">
              {role === "student" ? `Free changes up to 24h before (max ${MAX_RESCHEDULES} moves). Later cancellations aren't refunded.` : "If you cancel, the learner gets a full refund."}
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

function BookedBanner() {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="relative flex items-center gap-4 overflow-hidden rounded-[24px] bg-gradient-to-r from-teal/20 to-[#c04dff]/20 p-5 ring-1 ring-teal/40">
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute size-1.5 rounded-full"
          style={{ left: `${8 + i * 6.5}%`, top: "50%", background: ["#c04dff", "#ff4da6", "#2ee6c5", "#ffb800"][i % 4] }}
          initial={{ y: 0, opacity: 1 }}
          animate={{ y: [0, -40 - (i % 4) * 12, 30], x: (i % 2 ? 1 : -1) * (10 + i), opacity: [1, 1, 0] }}
          transition={{ duration: 1.6, delay: i * 0.03, ease: "easeOut" }}
        />
      ))}
      <span className="relative grid size-12 place-items-center rounded-2xl bg-teal text-black">
        <PartyPopper className="size-6" />
      </span>
      <div className="relative">
        <p className="font-display text-lg font-bold">You&apos;re booked!</p>
        <p className="text-sm text-muted">We&apos;ve sent a confirmation and will remind you 24 hours and 15 minutes before.</p>
      </div>
    </motion.div>
  );
}

function Countdown({ ms, openAt }: { ms: number; openAt: number }) {
  const total = 7 * 24 * 3600_000;
  const pct = Math.max(0.04, 1 - Math.min(ms, total) / total);
  const r = 70;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative size-44">
        <svg viewBox="0 0 160 160" className="size-full -rotate-90">
          <circle cx="80" cy="80" r={r} className="fill-none stroke-fg/10" strokeWidth="10" />
          <motion.circle cx="80" cy="80" r={r} fill="none" stroke="url(#mg)" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct) }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} />
          <defs>
            <linearGradient id="mg" x1="0" x2="1">
              <stop offset="0" stopColor="#c04dff" />
              <stop offset="1" stopColor="#ff4da6" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">Starts in</p>
            <p className="font-display text-3xl font-bold tabular-nums">{countdown(ms)}</p>
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted">The call room opens in {countdown(openAt)} (10 minutes before the start).</p>
    </div>
  );
}

function Feedback({ booking, onDone }: { booking: Booking; onDone: (fb: NonNullable<Booking["feedback"]>) => void }) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (booking.feedback)
    return (
      <div className="text-center">
        <p className="font-display text-xl font-bold">Thanks for the feedback!</p>
        <p className="mt-1 text-2xl text-saffron">{"★".repeat(booking.feedback.stars)}</p>
        {booking.feedback.text && <p className="mt-1 text-sm text-muted">“{booking.feedback.text}”</p>}
      </div>
    );
  return (
    <div className="mx-auto max-w-md text-center">
      <p className="font-display text-xl font-bold">How was your session?</p>
      <div className="mt-3 flex justify-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <motion.button key={i} type="button" whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }} onMouseEnter={() => setHover(i)} onClick={() => setStars(i)} aria-label={`${i} star${i > 1 ? "s" : ""}`}>
            <Star className={cn("size-9 transition-colors", i <= (hover || stars) ? "fill-saffron text-saffron" : "text-fg/20")} />
          </motion.button>
        ))}
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={800} placeholder="What helped most? (optional)" className="mt-4 w-full rounded-2xl bg-fg/[0.04] p-3.5 text-sm ring-1 ring-line outline-none focus:ring-[#ff4da6]/60" />
      {err && <p className="mt-2 text-sm text-rose">{err}</p>}
      <button
        type="button"
        disabled={!stars || busy}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          try {
            const res = await rpc("mentorship.feedback", booking.id, { stars, text });
            if (res.ok) onDone({ stars, text: text.trim(), at: new Date().toISOString() });
            else setErr(res.error);
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Something went wrong");
          }
          setBusy(false);
        }}
        className={cn("mt-3 inline-flex items-center gap-2 rounded-2xl px-6 py-3 font-semibold text-white disabled:opacity-50", GRADIENT)}
      >
        {busy && <Loader2 className="size-4 animate-spin" />} Send feedback
      </button>
    </div>
  );
}

function Reschedule({ booking, onClose, onMove, busy }: { booking: Booking; onClose: () => void; onMove: (slot: Range) => void; busy: boolean }) {
  const [days, setDays] = useState<Day[] | null>(null);
  const [slot, setSlot] = useState<Range | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    rpc("mentorship.slots", booking.mentorId, booking.id)
      .then((res) => (res.ok ? setDays(res.days) : setErr(res.error)))
      .catch(() => setErr("Couldn't load the calendar"));
  }, [booking.mentorId, booking.id]);
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="glass rounded-[28px] p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-display text-lg font-bold">Pick a new time</p>
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-full hover:bg-fg/5">
          <X className="size-4" />
        </button>
      </div>
      {err ? <p className="text-sm text-rose">{err}</p> : !days ? <Loader2 className="mx-auto size-6 animate-spin text-muted" /> : <SlotPicker days={days} value={slot?.start ?? null} onChange={setSlot} />}
      {slot && (
        <button type="button" disabled={busy} onClick={() => onMove(slot)} className={cn("mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-semibold text-white", GRADIENT)}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <CalendarSync className="size-4" />} Move to {fmtWhen(slot.start)}
        </button>
      )}
    </motion.section>
  );
}

function CancelBox({ booking, role, now, busy, onClose, onCancel }: { booking: Booking; role: "student" | "mentor"; now: number; busy: boolean; onClose: () => void; onCancel: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  const { refund } = cancelSplit(booking, role, now);
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="rounded-[28px] border border-rose/40 bg-rose/[0.06] p-5 sm:p-6">
      <p className="font-display text-lg font-bold">Cancel this session?</p>
      <p className="mt-1 text-sm text-muted">
        {role === "mentor"
          ? `The learner gets a full refund of ${formatPaise(booking.price)}.`
          : refund
            ? `You'll get a full refund of ${formatPaise(refund)} to your wallet.`
            : `It's less than 24 hours to the start, so there's no refund. The mentor keeps ${formatPaise(booking.price)} for the reserved time.`}
      </p>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} placeholder={role === "mentor" ? "Reason for the learner (required)" : "Reason (optional)"} className="mt-3 w-full rounded-2xl bg-fg/[0.04] p-3 text-sm ring-1 ring-line outline-none" />
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-line py-2.5 text-sm font-semibold hover:bg-fg/5">
          Keep it
        </button>
        <button type="button" disabled={busy || (role === "mentor" && reason.trim().length < 5)} onClick={() => onCancel(reason)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {busy && <Loader2 className="size-4 animate-spin" />} Cancel session
        </button>
      </div>
    </motion.section>
  );
}
