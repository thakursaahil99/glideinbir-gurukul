"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarX2, ChevronLeft, ChevronRight, Sun, Sunrise, Sunset } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { fmtTime, istHour, istWeekday, type Range } from "../logic";
import { WEEKDAYS } from "../types";

export interface Day {
  date: string;
  slots: Range[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const PARTS = [
  { label: "Morning", icon: Sunrise, test: (h: number) => h < 12 },
  { label: "Afternoon", icon: Sun, test: (h: number) => h >= 12 && h < 17 },
  { label: "Evening", icon: Sunset, test: (h: number) => h >= 17 },
];

/** Date strip + slot grid. All times are shown in IST. */
export function SlotPicker({ days, value, onChange }: { days: Day[]; value: string | null; onChange: (slot: Range) => void }) {
  const firstOpen = days.find((d) => d.slots.length)?.date ?? days[0]?.date ?? "";
  const [date, setDate] = useState(() => (value ? (days.find((d) => d.slots.some((s) => s.start === value))?.date ?? firstOpen) : firstOpen));
  const strip = useRef<HTMLDivElement>(null);
  const day = days.find((d) => d.date === date);

  // Keep the chosen day in view (scrolls the strip only, never the page).
  useEffect(() => {
    const el = strip.current;
    const btn = el?.querySelector<HTMLElement>(`[data-date="${date}"]`);
    if (el && btn) el.scrollTo({ left: btn.offsetLeft - el.clientWidth / 2 + btn.clientWidth / 2, behavior: "smooth" });
  }, [date]);

  if (!days.some((d) => d.slots.length))
    return (
      <div className="rounded-[22px] border border-dashed border-line p-8 text-center">
        <CalendarX2 className="mx-auto size-8 text-muted" />
        <p className="mt-3 font-semibold">No free slots in the next 3 weeks</p>
        <p className="text-sm text-muted">This mentor is fully booked. Check back soon.</p>
      </div>
    );

  const scroll = (dir: number) => strip.current?.scrollBy({ left: dir * 280, behavior: "smooth" });

  return (
    <div className="space-y-5">
      <div className="relative">
        <button type="button" onClick={() => scroll(-1)} aria-label="Earlier dates" className="absolute top-1/2 -left-3 z-10 hidden size-8 -translate-y-1/2 place-items-center rounded-full bg-card-solid ring-1 ring-line sm:grid">
          <ChevronLeft className="size-4" />
        </button>
        <div ref={strip} className="relative -mx-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex snap-x gap-2 overflow-x-auto px-1 py-1" role="listbox" aria-label="Pick a date">
          {days.map((d) => {
            const active = d.date === date;
            const n = d.slots.length;
            return (
              <button
                key={d.date}
                data-date={d.date}
                type="button"
                role="option"
                aria-selected={active}
                disabled={!n}
                onClick={() => setDate(d.date)}
                className={cn("relative flex w-[68px] shrink-0 snap-start flex-col items-center rounded-2xl py-2.5 text-center transition-colors disabled:opacity-35", active ? "text-white" : "bg-fg/[0.04] ring-1 ring-line hover:bg-fg/[0.08]")}
              >
                {active && <motion.span layoutId="slot-day" className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#c04dff] to-[#ff4da6] shadow-lg shadow-[#c04dff]/30" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <span className="relative text-[11px] font-semibold tracking-wide uppercase opacity-80">{WEEKDAYS[istWeekday(d.date)]}</span>
                <span className="relative font-display text-xl font-bold">{Number(d.date.slice(8))}</span>
                <span className="relative text-[11px] opacity-80">{MONTHS[Number(d.date.slice(5, 7)) - 1]}</span>
                <span className={cn("relative mt-1 h-1 w-5 rounded-full", n ? (active ? "bg-white/80" : "bg-[#ff4da6]") : "bg-transparent")} />
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => scroll(1)} aria-label="Later dates" className="absolute top-1/2 -right-3 z-10 hidden size-8 -translate-y-1/2 place-items-center rounded-full bg-card-solid ring-1 ring-line sm:grid">
          <ChevronRight className="size-4" />
        </button>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={date} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="space-y-4">
          {PARTS.map((part) => {
            const slots = (day?.slots ?? []).filter((s) => part.test(istHour(s.start)));
            if (!slots.length) return null;
            return (
              <div key={part.label}>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
                  <part.icon className="size-3.5" /> {part.label}
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((s, i) => {
                    const active = s.start === value;
                    return (
                      <motion.button
                        key={s.start}
                        type="button"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.02 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onChange(s)}
                        aria-pressed={active}
                        className={cn("rounded-xl py-2.5 text-sm font-semibold tabular-nums transition-all", active ? "bg-gradient-to-r from-[#c04dff] to-[#ff4da6] text-white shadow-lg shadow-[#ff4da6]/30" : "bg-fg/[0.04] ring-1 ring-line hover:ring-[#ff4da6]/60")}
                      >
                        {fmtTime(s.start)}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>
      <p className="text-xs text-muted">All times are India Standard Time (IST).</p>
    </div>
  );
}
