"use client";

import { motion } from "framer-motion";
import { Clock, FileQuestion, Timer, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BirdMark } from "@/components/brand/logo";
import { cn, formatPaise } from "@/lib/utils";
import type { Exam } from "../types";

/** Generated cover: gradient, a stopwatch ring and the exam name. */
export function TestCover({ colors, exam, className, big = false }: { colors: [string, string]; exam: Exam; className?: string; big?: boolean }) {
  return (
    <div className={cn("relative isolate overflow-hidden", className)} style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }} aria-hidden>
      <div className="absolute inset-0 opacity-25 [background-image:repeating-linear-gradient(135deg,white_0_1px,transparent_1px_14px)]" />
      <div className={cn("absolute rounded-full border-white/30", big ? "-right-10 -bottom-10 size-56 border-[22px]" : "-right-6 -bottom-6 size-28 border-[12px]")} />
      <Timer className={cn("absolute text-white/90 drop-shadow-lg", big ? "top-1/2 left-1/2 size-20 -translate-x-1/2 -translate-y-1/2" : "bottom-4 left-4 size-9")} strokeWidth={1.6} />
      <span className={cn("absolute rounded-full bg-black/25 font-bold text-white backdrop-blur", big ? "top-5 left-5 px-3 py-1 text-sm" : "top-3 left-3 px-2 py-0.5 text-[11px]")}>{exam}</span>
      <BirdMark mono className={cn("absolute text-white/20", big ? "top-6 right-8 w-24" : "top-3 right-4 w-12")} />
    </div>
  );
}

export function TestsTabs({ canTeach }: { canTeach: boolean }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/tests", label: "Browse", active: pathname === "/tests" },
    { href: "/tests/my", label: "My tests", active: pathname.startsWith("/tests/my") },
    ...(canTeach ? [{ href: "/tests/teach", label: "Teach", active: pathname.startsWith("/tests/teach") }] : []),
  ];
  return (
    <nav className="glass inline-flex rounded-2xl p-1" aria-label="Test series sections">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          className={cn("relative rounded-xl px-4 py-2 text-sm font-semibold transition-colors", t.active ? "text-white" : "text-muted hover:text-fg")}
        >
          {t.active && <motion.span layoutId="tests-tab" className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-[#00c2ff]" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
          <span className="relative">{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}

export interface TestCardData {
  id: string;
  slug: string;
  title: string;
  exam: Exam;
  colors: [string, string];
  price: number;
  durationMin: number;
  questions: number;
  maxScore: number;
  attempts: number;
  demo?: boolean;
  /** "submitted" | "in_progress" | null for the viewer */
  myStatus: "submitted" | "in_progress" | null;
  owned: boolean;
}

export function TestCard({ t, index = 0 }: { t: TestCardData; index?: number }) {
  return (
    <motion.li initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 9) * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
      <Link href={`/tests/${t.slug}`} className="glass group flex h-full flex-col overflow-hidden rounded-[24px] transition-transform duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_60px_-20px_var(--glow)]">
        <div className="relative">
          <TestCover colors={t.colors} exam={t.exam} className="aspect-[16/8] transition-transform duration-700 group-hover:scale-105" />
          <span className="absolute top-3 right-3 flex gap-1.5">
            {t.demo && <span className="rounded-full bg-black/40 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur">Demo</span>}
            {t.myStatus === "submitted" && <span className="rounded-full bg-teal px-2 py-0.5 text-[11px] font-bold text-black">Attempted</span>}
            {t.myStatus === "in_progress" && <span className="rounded-full bg-saffron px-2 py-0.5 text-[11px] font-bold text-black">In progress</span>}
          </span>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h3 className="line-clamp-2 font-display text-lg leading-snug font-bold">{t.title}</h3>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <FileQuestion className="size-3.5" /> {t.questions} questions
            </span>
            <span className="flex items-center gap-1.5">
              <Trophy className="size-3.5" /> {t.maxScore} marks
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" /> {t.durationMin} min
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5" /> {t.attempts} attempted
            </span>
          </div>
          <p className="mt-auto pt-4 font-display text-xl font-bold">{t.price && !t.owned ? formatPaise(t.price) : <span className="text-teal">{t.price ? "Unlocked" : "Free"}</span>}</p>
        </div>
      </Link>
    </motion.li>
  );
}

export function Stat({ icon: Icon, label, value, tint = "text-primary" }: { icon: typeof Clock; label: string; value: string; tint?: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <Icon className={cn("size-5", tint)} />
      <p className="mt-2 font-display text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
