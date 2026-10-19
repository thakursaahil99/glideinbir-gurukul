"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, CalendarClock, Clock, Search, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cn, formatPaise } from "@/lib/utils";
import { fmtWhen } from "../logic";
import type { MentorCard } from "../queries";
import { Avatar, Stars } from "./bits";

export function MentorGrid({ mentors }: { mentors: MentorCard[] }) {
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState<string | null>(null);
  const topics = useMemo(() => [...new Set(mentors.flatMap((m) => m.expertise))].slice(0, 14), [mentors]);
  const shown = mentors.filter((m) => {
    const hay = `${m.name} ${m.headline} ${m.expertise.join(" ")}`.toLowerCase();
    return (!q || hay.includes(q.toLowerCase())) && (!topic || m.expertise.includes(topic));
  });

  if (!mentors.length)
    return (
      <div className="glass rounded-[28px] p-12 text-center">
        <motion.span animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }} className="mx-auto grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-[#c04dff] to-[#ff4da6] text-white">
          <Users className="size-7" />
        </motion.span>
        <p className="mt-4 font-display text-xl font-bold">Mentors are on their way</p>
        <p className="mt-1 text-sm text-muted">No mentor has opened their calendar yet. Check back soon.</p>
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="glass flex flex-1 items-center gap-2 rounded-2xl px-4 py-3">
          <Search className="size-4 text-muted" />
          <span className="sr-only">Search mentors</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, role or topic…" className="w-full bg-transparent text-sm outline-none placeholder:text-muted" />
        </label>
      </div>
      {topics.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {[null, ...topics].map((t) => (
            <button key={t ?? "all"} type="button" onClick={() => setTopic(t)} className={cn("relative rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors", topic === t ? "text-white" : "bg-fg/[0.05] text-muted ring-1 ring-line hover:text-fg")}>
              {topic === t && <motion.span layoutId="topic-pill" className="absolute inset-0 rounded-full bg-gradient-to-r from-[#c04dff] to-[#ff4da6]" />}
              <span className="relative">{t ?? "All topics"}</span>
            </button>
          ))}
        </div>
      )}

      <motion.div layout className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {shown.map((m, i) => (
            <motion.div key={m.userId} layout initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: Math.min(i, 8) * 0.04 }}>
              <Link href={`/mentorship/${m.userId}`} className="group glass relative flex h-full flex-col overflow-hidden rounded-[26px] p-5 transition-transform hover:-translate-y-1">
                <span className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full bg-[#ff4da6]/20 opacity-0 blur-3xl transition-opacity group-hover:opacity-100" />
                <div className="flex items-start gap-3.5">
                  <Avatar name={m.name} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 font-display text-lg leading-tight font-bold">
                      <span className="truncate">{m.name}</span>
                      <ArrowUpRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#ff4da6]" />
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted">{m.headline}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                  {m.rating ? (
                    <>
                      <Stars value={m.rating} /> <b className="text-fg">{m.rating.toFixed(1)}</b> ({m.ratings})
                    </>
                  ) : (
                    <span className="rounded-full bg-[#c04dff]/15 px-2 py-0.5 font-semibold text-[#d17aff]">New mentor</span>
                  )}
                  {m.sessions > 0 && <span>· {m.sessions} sessions</span>}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {m.expertise.slice(0, 4).map((t) => (
                    <span key={t} className="rounded-lg bg-fg/[0.05] px-2 py-0.5 text-xs">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                  <div className="text-xs text-muted">
                    <p className="flex items-center gap-1">
                      <Clock className="size-3.5" /> {m.sessionMin} min session
                    </p>
                    <p className={cn("mt-1 flex items-center gap-1", m.nextSlot ? "text-teal" : "")}>
                      <CalendarClock className="size-3.5" /> {m.nextSlot ? `Next: ${fmtWhen(m.nextSlot)}` : "Fully booked"}
                    </p>
                  </div>
                  <p className="font-display text-2xl font-bold">{formatPaise(m.price)}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      {!shown.length && <p className="py-10 text-center text-sm text-muted">No mentors match that search.</p>}
    </div>
  );
}
