"use client";

import { motion } from "framer-motion";
import { ArrowRight, CalendarHeart, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn, formatPaise } from "@/lib/utils";
import { fmtIST, fmtTime, phaseOf } from "../logic";
import type { Booking } from "../types";
import { Avatar, countdown, GRADIENT, StatusBadge, useNow } from "./bits";

export function MyBookings({ bookings, userId, serverNow }: { bookings: Booking[]; userId: string; serverNow: number }) {
  const now = useNow(serverNow);
  const upcoming = bookings.filter((b) => phaseOf(b, now) !== "ended").sort((a, b) => a.start.localeCompare(b.start));
  const past = bookings.filter((b) => phaseOf(b, now) === "ended").sort((a, b) => b.start.localeCompare(a.start));
  const [tab, setTab] = useState<"upcoming" | "past">(upcoming.length || !past.length ? "upcoming" : "past");
  const list = tab === "upcoming" ? upcoming : past;

  if (!bookings.length)
    return (
      <div className="glass rounded-[28px] p-12 text-center">
        <motion.span animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 2.4, repeat: Infinity }} className={cn("mx-auto grid size-16 place-items-center rounded-3xl text-white", GRADIENT)}>
          <CalendarHeart className="size-7" />
        </motion.span>
        <p className="mt-4 font-display text-xl font-bold">No sessions yet</p>
        <p className="mt-1 text-sm text-muted">Book a 1-on-1 with someone who&apos;s been where you want to go.</p>
        <Link href="/mentorship" className={cn("mt-5 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white", GRADIENT)}>
          Find a mentor <ArrowRight className="size-4" />
        </Link>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["upcoming", "past"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn("relative rounded-full px-4 py-1.5 text-sm font-semibold capitalize", tab === t ? "text-white" : "text-muted ring-1 ring-line hover:text-fg")}>
            {tab === t && <motion.span layoutId="mb-tab" className={cn("absolute inset-0 rounded-full", GRADIENT)} />}
            <span className="relative">
              {t} ({t === "upcoming" ? upcoming.length : past.length})
            </span>
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="glass rounded-[22px] p-8 text-center text-sm text-muted">{tab === "upcoming" ? "Nothing coming up." : "No past sessions."}</p>
      ) : (
        <ul className="space-y-3">
          {list.map((b, i) => {
            const asMentor = b.mentorId === userId;
            const other = asMentor ? b.studentName : b.mentorName;
            const phase = phaseOf(b, now);
            const ms = Date.parse(b.start) - now;
            return (
              <motion.li key={b.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }}>
                <Link href={`/mentorship/bookings/${b.id}`} className="glass group flex flex-wrap items-center gap-4 rounded-[24px] p-4 transition-transform hover:-translate-y-0.5 sm:flex-nowrap">
                  <div className={cn("grid w-16 shrink-0 place-items-center rounded-2xl py-2 text-center", phase === "ended" ? "bg-fg/[0.05]" : "bg-gradient-to-b from-[#c04dff]/25 to-[#ff4da6]/20")}>
                    <span className="text-[11px] font-semibold text-muted uppercase">{fmtIST(b.start, { weekday: "short" })}</span>
                    <span className="font-display text-xl leading-none font-bold">{fmtIST(b.start, { day: "numeric" })}</span>
                    <span className="text-[11px] text-muted">{fmtIST(b.start, { month: "short" })}</span>
                  </div>
                  <Avatar name={other} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {asMentor ? "Mentoring " : "With "}
                      {other}
                    </p>
                    <p className="text-sm text-muted">
                      {fmtTime(b.start)} – {fmtTime(b.end)} IST · {formatPaise(b.price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {b.feedback && (
                      <span className="flex items-center gap-1 text-sm text-saffron">
                        <Star className="size-4 fill-saffron" /> {b.feedback.stars}
                      </span>
                    )}
                    {phase === "upcoming" && <span className="text-sm font-semibold tabular-nums text-muted">in {countdown(ms)}</span>}
                    {b.status === "completed" && !b.feedback && !asMentor && <span className="text-xs font-semibold text-[#ff6fb8]">Rate it</span>}
                    <StatusBadge status={b.status} live={phase === "open"} />
                    <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
