"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "../types";

export const GRADIENT = "bg-gradient-to-r from-[#c04dff] to-[#ff4da6]";

export function MentorshipTabs({ isMentor }: { isMentor: boolean }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/mentorship", label: "Find a mentor", active: pathname === "/mentorship" || (!pathname.startsWith("/mentorship/bookings") && !pathname.startsWith("/mentorship/mentor")) },
    { href: "/mentorship/bookings", label: "My sessions", active: pathname.startsWith("/mentorship/bookings") },
    ...(isMentor ? [{ href: "/mentorship/mentor", label: "Mentor studio", active: pathname.startsWith("/mentorship/mentor") }] : []),
  ];
  return (
    <nav className="glass inline-flex rounded-2xl p-1" aria-label="Mentorship sections">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.active ? "page" : undefined} className={cn("relative rounded-xl px-4 py-2 text-sm font-semibold transition-colors", t.active ? "text-white" : "text-muted hover:text-fg")}>
          {t.active && <motion.span layoutId="mentorship-tab" className={cn("absolute inset-0 rounded-xl", GRADIENT)} transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
          <span className="relative">{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}

/** Initials on a gradient picked from the name, so every mentor looks distinct. */
const PALETTES = [
  ["#c04dff", "#ff4da6"],
  ["#5b47ff", "#00c2ff"],
  ["#ff8a00", "#ff4d6d"],
  ["#00b89c", "#7ddc5a"],
  ["#ffb800", "#ff5e3a"],
  ["#3d8bff", "#2ee6c5"],
];
export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  const [a, b] = PALETTES[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % PALETTES.length]!;
  return (
    <span
      aria-hidden
      style={{ backgroundImage: `linear-gradient(135deg, ${a}, ${b})` }}
      className={cn("grid shrink-0 place-items-center rounded-2xl font-display font-bold text-white shadow-lg", size === "sm" ? "size-10 text-sm" : size === "md" ? "size-14 text-lg" : "size-24 rounded-[28px] text-3xl")}
    >
      {initials}
    </span>
  );
}

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex", className)} aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("size-3.5", i <= Math.round(value) ? "fill-saffron text-saffron" : "text-fg/20")} />
      ))}
    </span>
  );
}

const STATUS: Record<BookingStatus, [string, string]> = {
  confirmed: ["Confirmed", "bg-teal/15 text-teal"],
  completed: ["Completed", "bg-fg/10 text-fg"],
  cancelled: ["Cancelled", "bg-rose/15 text-rose"],
};
export function StatusBadge({ status, live }: { status: BookingStatus; live?: boolean }) {
  const [label, cls] = live ? ["Room open", "bg-[#ff4da6]/15 text-[#ff6fb8]"] : STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold", cls)}>
      {live && <span className="size-1.5 animate-pulse rounded-full bg-[#ff4da6]" />}
      {label}
    </span>
  );
}

/** Ticks every second; corrected for the device's clock skew against the server. */
export function useNow(serverNow?: number) {
  const skew = useRef(serverNow ? serverNow - Date.now() : 0);
  const [now, setNow] = useState(() => Date.now() + skew.current);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + skew.current), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

/** "2d 4h", "3h 12m", "4:05". */
export function countdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function Notice({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <motion.p role="status" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className={cn("rounded-2xl border p-3 text-sm", msg.ok ? "border-teal/40 bg-teal/10" : "border-rose/40 bg-rose/10")}>
      {msg.text}
    </motion.p>
  );
}
