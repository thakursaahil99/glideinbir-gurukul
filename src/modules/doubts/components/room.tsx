"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, CircleAlert, Loader2, Play, Send, Square, Star, Video, Wifi, WifiOff, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { refreshSummary } from "@/lib/summary";
import { rpc } from "@/lib/rpc";
import { cn, formatPaise } from "@/lib/utils";
import type { DoubtView } from "../service";
import type { DoubtMessage } from "../types";
import { mmss, StatusBadge, useLiveDoubt, useNow } from "./bits";

export interface RoomProps {
  initial: { doubt: DoubtView; messages: DoubtMessage[] };
  role: "student" | "tutor";
  meId: string;
  tutorsOnline: number;
  serverNow: number;
}

export function DoubtRoom({ initial, role, meId, tutorsOnline, serverNow }: RoomProps) {
  const { doubt: d, messages, live, refresh } = useLiveDoubt(initial.doubt.id, initial);
  const now = useNow(serverNow);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prevStatus = useRef(d.status);

  // When a deadline passes, ask the server: it applies expiry / the session limit.
  const expiresIn = Math.ceil((Date.parse(d.expiresAt) - now) / 1000);
  const endsAt = d.startedAt ? Date.parse(d.startedAt) + d.limitMin * 60_000 : null;
  const remaining = endsAt ? Math.ceil((endsAt - now) / 1000) : null;
  const elapsed = d.startedAt ? Math.floor((now - Date.parse(d.startedAt)) / 1000) : 0;
  const dueRefresh = (d.status === "requested" && expiresIn <= 0) || (d.status === "in_progress" && remaining !== null && remaining <= 0);
  useEffect(() => {
    if (!dueRefresh) return;
    const t = setTimeout(refresh, 800);
    return () => clearTimeout(t);
  }, [dueRefresh, refresh, now]);

  // Money moved: re-read the header wallet chip.
  useEffect(() => {
    if (prevStatus.current !== d.status && ["accepted", "completed", "cancelled"].includes(d.status)) refreshSummary();
    prevStatus.current = d.status;
  }, [d.status]);

  const act = async (key: string, job: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(key);
    setError(null);
    try {
      const res = await job();
      if (!res.ok) setError(res.error ?? "Something went wrong");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  const openVideo = async () => {
    setBusy("video");
    setError(null);
    try {
      const res = await rpc("doubts.video", d.id);
      if (res.ok) window.open(res.url, "_blank", "noopener");
      else setError(res.error);
    } finally {
      setBusy(null);
    }
  };

  const runningCost = d.ratePerMinute && d.startedAt && elapsed >= 60 ? Math.min(d.hold ?? 0, Math.ceil(elapsed / 60) * d.ratePerMinute) : 0;
  const chatOpen = d.status === "accepted" || d.status === "in_progress";
  const other = role === "student" ? d.tutorName : d.studentName;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link href={role === "tutor" ? "/doubts/tutor" : "/doubts/history"} className="glass grid size-10 place-items-center rounded-full" aria-label="Back">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">{d.subject} doubt</p>
          <h1 className="truncate font-display text-2xl font-bold">{other ? `With ${other}` : "Finding you a tutor"}</h1>
        </div>
        <StatusBadge status={d.status} />
        <span className={cn("flex items-center gap-1 text-xs", live ? "text-teal" : "text-muted")} title={live ? "Live updates on" : "Reconnecting… (checking every 10 s)"}>
          {live ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />} {live ? "Live" : "Reconnecting"}
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-5">
          {/* Question */}
          <div className="glass rounded-[24px] p-5">
            <p className="text-xs font-bold tracking-wider text-muted uppercase">Question · {d.studentName}</p>
            <p className="mt-2 whitespace-pre-wrap">{d.text}</p>
            {d.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.imageUrl} alt="Attached to the doubt" className="mt-3 max-h-80 rounded-xl ring-1 ring-line" />
            )}
          </div>

          {d.status === "requested" ? (
            <Searching expiresIn={expiresIn} tutorsOnline={tutorsOnline} role={role} busy={busy} onCancel={() => act("cancel", () => rpc("doubts.cancel", d.id))} onAccept={() => act("accept", () => rpc("doubtsTutor.accept", d.id))} />
          ) : (
            <Chat doubtId={d.id} messages={messages} meId={meId} open={chatOpen} />
          )}
        </div>

        {/* Side panel */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {(d.status === "accepted" || d.status === "in_progress") && (
            <div className="glass rounded-[24px] p-5">
              <p className="text-sm text-muted">{formatPaise(d.ratePerMinute ?? 0)}/min · up to {d.limitMin} min · {formatPaise(d.hold ?? 0)} held</p>
              {d.status === "in_progress" ? (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-2xl bg-fg/[0.04] p-3">
                      <p className="font-mono text-2xl font-bold tabular-nums">{mmss(elapsed)}</p>
                      <p className="text-xs text-muted">elapsed</p>
                    </div>
                    <div className={cn("rounded-2xl p-3", remaining !== null && remaining <= 60 ? "bg-rose/15 text-rose" : "bg-fg/[0.04]")}>
                      <p className="font-mono text-2xl font-bold tabular-nums">{mmss(remaining ?? 0)}</p>
                      <p className="text-xs opacity-70">left</p>
                    </div>
                  </div>
                  <p className="mt-3 text-center text-sm">
                    Cost so far <b className="font-display text-lg">{formatPaise(runningCost)}</b>
                    {elapsed < 60 && <span className="block text-xs text-teal">First minute is free</span>}
                  </p>
                  <button type="button" onClick={() => act("end", () => rpc("doubts.end", d.id))} disabled={!!busy} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-rose py-3 font-semibold text-white disabled:opacity-50">
                    {busy === "end" ? <Loader2 className="size-4 animate-spin" /> : <Square className="size-4 fill-current" />} End session
                  </button>
                </>
              ) : role === "tutor" ? (
                <button type="button" onClick={() => act("start", () => rpc("doubtsTutor.start", d.id))} disabled={!!busy} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal to-primary py-3 font-semibold text-white disabled:opacity-50">
                  {busy === "start" ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4 fill-current" />} Start session (clock starts)
                </button>
              ) : (
                <p className="mt-4 rounded-2xl bg-primary/10 p-3 text-sm">
                  Say hi and share details. The clock starts when <b>{d.tutorName}</b> starts the session.
                </p>
              )}
              <button type="button" onClick={openVideo} disabled={!!busy} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-line py-3 text-sm font-semibold hover:bg-fg/5">
                {busy === "video" ? <Loader2 className="size-4 animate-spin" /> : <Video className="size-4" />} Join video call
              </button>
              {d.status === "accepted" && (
                <button
                  type="button"
                  onClick={() => act("cancel", () => (role === "student" ? rpc("doubts.cancel", d.id) : rpc("doubts.end", d.id)))}
                  disabled={!!busy}
                  className="mt-3 w-full text-sm font-semibold text-muted hover:text-rose"
                >
                  Cancel (full refund)
                </button>
              )}
            </div>
          )}

          {(d.status === "completed" || d.status === "cancelled" || d.status === "expired") && <Summary d={d} role={role} onRated={refresh} />}

          <AnimatePresence>
            {error && (
              <motion.p role="status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 rounded-2xl border border-rose/40 bg-rose/10 p-3 text-sm">
                <CircleAlert className="size-4 shrink-0 text-rose" /> {error}
              </motion.p>
            )}
          </AnimatePresence>
        </aside>
      </div>
    </div>
  );
}

function Searching({ expiresIn, tutorsOnline, role, busy, onCancel, onAccept }: { expiresIn: number; tutorsOnline: number; role: "student" | "tutor"; busy: string | null; onCancel: () => void; onAccept: () => void }) {
  return (
    <div className="glass relative overflow-hidden rounded-[24px] px-6 py-12 text-center">
      <div className="relative mx-auto grid size-44 place-items-center">
        {[0, 1, 2, 3].map((i) => (
          <motion.span
            key={i}
            className="absolute inset-0 rounded-full border-2 border-[#ff5e3a]"
            initial={{ scale: 0.2, opacity: 0.9 }}
            animate={{ scale: 1.15, opacity: 0 }}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
          />
        ))}
        <motion.span
          className="absolute inset-4 rounded-full bg-[conic-gradient(from_0deg,transparent,rgba(255,94,58,0.35))]"
          animate={{ rotate: 360 }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
        />
        <span className="relative grid size-16 place-items-center rounded-full bg-gradient-to-br from-[#ffb800] to-[#ff5e3a] font-display text-2xl font-bold text-white shadow-xl">?</span>
      </div>
      {role === "student" ? (
        <>
          <p className="mt-6 font-display text-2xl font-bold">Finding you a tutor…</p>
          <p className="mt-1 text-sm text-muted">
            Sent to {tutorsOnline} online tutor{tutorsOnline === 1 ? "" : "s"}. Expires in <b className="font-mono tabular-nums">{mmss(expiresIn)}</b> if nobody accepts (free).
          </p>
          <button type="button" onClick={onCancel} disabled={!!busy} className="mt-6 inline-flex items-center gap-1.5 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold hover:bg-fg/5">
            {busy === "cancel" ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />} Cancel request
          </button>
        </>
      ) : (
        <>
          <p className="mt-6 font-display text-2xl font-bold">New doubt waiting</p>
          <p className="mt-1 text-sm text-muted">
            First tutor to accept wins · <span className="font-mono tabular-nums">{mmss(expiresIn)}</span> left
          </p>
          <button type="button" onClick={onAccept} disabled={!!busy} className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#ffb800] to-[#ff5e3a] px-5 py-3 text-sm font-semibold text-white">
            {busy === "accept" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Accept doubt
          </button>
        </>
      )}
    </div>
  );
}

function Chat({ doubtId, messages, meId, open }: { doubtId: string; messages: DoubtMessage[]; meId: string; open: boolean }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  // Braces matter: newer Chrome returns a Promise from scrollIntoView, and React would
  // treat a returned value as the effect's cleanup function and crash calling it.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length]);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setSending(true);
    setErr(null);
    try {
      const res = await rpc("doubts.message", doubtId, t);
      if (res.ok) setText("");
      else setErr(res.error);
    } catch {
      setErr("Couldn't send. Check your connection.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="glass flex h-[520px] flex-col rounded-[24px]">
      <div className="flex-1 space-y-3 overflow-y-auto p-5" aria-live="polite">
        {messages.map((m) =>
          m.role === "system" ? (
            <p key={m.id} className="mx-auto max-w-md rounded-full bg-fg/[0.05] px-4 py-1.5 text-center text-xs text-muted">
              {m.text}
            </p>
          ) : (
            <motion.div key={m.id} initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={cn("flex", m.senderId === meId ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] rounded-2xl px-4 py-2.5 text-sm", m.senderId === meId ? "rounded-br-md bg-gradient-to-r from-primary to-[#7a5cff] text-white" : "rounded-bl-md bg-fg/[0.07]")}>
                {m.senderId !== meId && <p className="mb-0.5 text-[11px] font-bold opacity-70">{m.senderName}</p>}
                <p className="whitespace-pre-wrap">{m.text}</p>
                <p className="mt-1 text-right text-[10px] opacity-60">{new Date(m.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</p>
              </div>
            </motion.div>
          ),
        )}
        <div ref={endRef} />
      </div>
      {open ? (
        <form
          className="flex gap-2 border-t border-line p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <label htmlFor="chat-input" className="sr-only">
            Message
          </label>
          <input id="chat-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Type a message…" autoComplete="off" className="min-w-0 flex-1 rounded-xl border border-line bg-card px-4 py-2.5 text-sm outline-none focus:border-primary" />
          <button disabled={sending || !text.trim()} className="grid size-11 place-items-center rounded-xl bg-fg text-bg disabled:opacity-40" aria-label="Send">
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </form>
      ) : (
        <p className="border-t border-line p-3 text-center text-xs text-muted">Chat is closed.</p>
      )}
      {err && <p className="px-4 pb-3 text-xs text-rose">{err}</p>}
    </div>
  );
}

function Summary({ d, role, onRated }: { d: DoubtView; role: "student" | "tutor"; onRated: () => void }) {
  const [stars, setStars] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (d.status === "expired" || (d.status === "cancelled" && !d.charged))
    return (
      <div className="glass rounded-[24px] p-5">
        <p className="font-display text-lg font-bold">{d.status === "expired" ? "No tutor accepted in time" : "Session cancelled"}</p>
        <p className="mt-1 text-sm text-muted">{d.cancelReason ?? "Nothing was charged."}</p>
        {d.refunded ? <p className="mt-2 text-sm text-teal">{formatPaise(d.refunded)} returned to the wallet.</p> : null}
        {role === "student" && (
          <Link href="/doubts" className="mt-4 inline-block rounded-xl bg-gradient-to-r from-[#ffb800] to-[#ff5e3a] px-4 py-2.5 text-sm font-semibold text-white">
            Ask again
          </Link>
        )}
      </div>
    );

  return (
    <div className="glass rounded-[24px] p-5">
      <p className="font-display text-lg font-bold">Session summary</p>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between"><dt className="text-muted">Billed minutes</dt><dd className="font-semibold">{d.billedMinutes}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">Charged</dt><dd className="font-semibold">{formatPaise(d.charged ?? 0)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">Returned to wallet</dt><dd className="font-semibold text-teal">{formatPaise(d.refunded ?? 0)}</dd></div>
      </dl>
      {d.rating ? (
        <div className="mt-4 rounded-2xl bg-fg/[0.04] p-3">
          <p className="flex gap-0.5">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={cn("size-4", n <= d.rating!.stars ? "fill-saffron text-saffron" : "text-fg/20")} />)}</p>
          {d.rating.text && <p className="mt-1 text-sm">{d.rating.text}</p>}
        </div>
      ) : role === "student" && d.status === "completed" ? (
        <div className="mt-4 border-t border-line pt-4">
          <p className="text-sm font-semibold">How was {d.tutorName}?</p>
          <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <motion.button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} whileHover={{ scale: 1.2 }} onClick={() => setStars(n)}>
                <Star className={cn("size-7", n <= stars ? "fill-saffron text-saffron" : "text-fg/25")} />
              </motion.button>
            ))}
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={500} rows={2} placeholder="Optional feedback" aria-label="Feedback" className="mt-2 w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
          {err && <p className="text-xs text-rose">{err}</p>}
          <button
            type="button"
            disabled={!stars || busy}
            onClick={async () => {
              setBusy(true);
              const res = await rpc("doubts.rate", d.id, { stars, text });
              setBusy(false);
              if (res.ok) onRated();
              else setErr(res.error);
            }}
            className="mt-2 rounded-xl bg-fg px-4 py-2 text-sm font-semibold text-bg disabled:opacity-40"
          >
            Submit rating
          </button>
        </div>
      ) : null}
    </div>
  );
}
