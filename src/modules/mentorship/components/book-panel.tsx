"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck2, Loader2, ShieldCheck, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { rpc } from "@/lib/rpc";
import { refreshSummary } from "@/lib/summary";
import { cn, formatPaise } from "@/lib/utils";
import { fmtDay, fmtTime, type Range } from "../logic";
import { GRADIENT, Notice } from "./bits";
import { SlotPicker, type Day } from "./slot-picker";

export function BookPanel({ mentor, days: initialDays, balance, isSelf }: { mentor: { userId: string; name: string; price: number; sessionMin: number }; days: Day[]; balance: number; isSelf: boolean }) {
  const router = useRouter();
  const [days, setDays] = useState(initialDays);
  const [slot, setSlot] = useState<Range | null>(null);
  const [agenda, setAgenda] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const short = Math.max(0, mentor.price - balance);

  async function bookIt() {
    if (!slot) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await rpc("mentorship.book", { mentorId: mentor.userId, start: slot.start, agenda });
      if (res.ok) {
        refreshSummary();
        router.push(`/mentorship/bookings/${res.id}?booked=1`);
        return;
      }
      setMsg({ ok: false, text: res.error });
      // The slot may have just gone: show the fresh calendar.
      const fresh = await rpc("mentorship.slots", mentor.userId);
      if (fresh.ok) {
        setDays(fresh.days);
        if (!fresh.days.some((d) => d.slots.some((s) => s.start === slot.start))) setSlot(null);
      }
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong" });
    }
    setBusy(false);
  }

  return (
    <div className="min-w-0 space-y-5">
      <section className="glass rounded-[28px] p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <CalendarCheck2 className="size-5 text-[#ff4da6]" /> Pick a time
        </h2>
        <p className="mb-5 text-sm text-muted">
          {mentor.sessionMin}-minute 1-on-1 video call with {mentor.name}.
        </p>
        <SlotPicker days={days} value={slot?.start ?? null} onChange={setSlot} />
      </section>

      <AnimatePresence>
        {slot && (
          <motion.section initial={{ opacity: 0, y: 20, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="glass space-y-4 rounded-[28px] p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-gradient-to-r from-[#c04dff]/15 to-[#ff4da6]/15 p-4 ring-1 ring-[#ff4da6]/30">
                <div className="flex-1">
                  <p className="text-xs font-semibold tracking-wide text-muted uppercase">Your session</p>
                  <p className="font-display text-lg font-bold">
                    {fmtDay(slot.start)} · {fmtTime(slot.start)} – {fmtTime(slot.end)} IST
                  </p>
                </div>
                <p className="font-display text-3xl font-bold">{formatPaise(mentor.price)}</p>
              </div>

              <label className="block">
                <span className="text-sm font-semibold">What would you like to discuss?</span>
                <textarea value={agenda} onChange={(e) => setAgenda(e.target.value)} rows={3} maxLength={600} placeholder="e.g. Review my resume for SDE internships, and how to prepare for DSA rounds in 2 months." className="mt-1.5 w-full rounded-2xl bg-fg/[0.04] p-3.5 text-sm ring-1 ring-line outline-none focus:ring-[#ff4da6]/60" />
              </label>

              <ul className="space-y-1.5 text-xs text-muted">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-teal" /> Your money is held safely and released to the mentor only after the session.
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-teal" /> Free cancellation or reschedule up to 24 hours before. Full refund if the mentor cancels.
                </li>
              </ul>

              <Notice msg={msg} />

              {isSelf ? (
                <p className="text-sm text-muted">This is your own profile. Learners book you from here.</p>
              ) : short > 0 ? (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-saffron/40 bg-saffron/10 p-3.5 text-sm">
                  <Wallet className="size-4 text-saffron" />
                  <span className="flex-1">
                    Wallet balance {formatPaise(balance)}. Add {formatPaise(short)} more to book.
                  </span>
                  <Link href="/wallet" className="rounded-xl bg-fg px-3.5 py-2 font-semibold text-bg">
                    Add money
                  </Link>
                </div>
              ) : (
                <button type="button" disabled={busy || agenda.trim().length < 10} onClick={bookIt} className={cn("flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-white shadow-lg shadow-[#ff4da6]/25 transition-opacity disabled:opacity-50", GRADIENT)}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <CalendarCheck2 className="size-4" />} Book &amp; pay {formatPaise(mentor.price)} from wallet
                </button>
              )}
              {!isSelf && short === 0 && agenda.trim().length < 10 && <p className="text-center text-xs text-muted">Add a short agenda (10+ characters) to continue.</p>}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
