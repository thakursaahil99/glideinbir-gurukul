"use client";

import { motion } from "framer-motion";
import {
  Atom,
  BadgeCheck,
  BookOpen,
  BrainCircuit,
  Briefcase,
  Code2,
  GraduationCap,
  Landmark,
  Languages,
  Palette,
  School,
  Star,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BirdMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import type { Category } from "../types";

export const CATEGORY_ICON: Record<Category, LucideIcon> = {
  "Engineering (JEE)": Atom,
  "Medical (NEET)": Stethoscope,
  "Civil Services": Landmark,
  "Government Exams": BadgeCheck,
  "School (6–12)": School,
  Programming: Code2,
  "Data & AI": BrainCircuit,
  Design: Palette,
  Business: Briefcase,
  Languages: Languages,
  Other: BookOpen,
};

/** Generated cover art: brand gradient, category glyph and a faint bird. No image uploads needed. */
export function CourseCover({
  colors,
  category,
  className,
  big = false,
}: {
  colors: [string, string];
  category: Category;
  className?: string;
  big?: boolean;
}) {
  const Icon = CATEGORY_ICON[category] ?? GraduationCap;
  return (
    <div
      className={cn("relative isolate overflow-hidden", className)}
      style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}
      aria-hidden
    >
      <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:18px_18px]" />
      <div className="absolute -right-6 -bottom-8 size-2/3 rounded-full bg-white/15 blur-2xl" />
      <Icon className={cn("absolute text-white/90 drop-shadow-lg", big ? "top-1/2 left-1/2 size-24 -translate-x-1/2 -translate-y-1/2" : "bottom-4 left-4 size-10")} strokeWidth={1.6} />
      <BirdMark mono className={cn("absolute text-white/20", big ? "top-6 right-8 w-24" : "top-3 right-4 w-12")} />
    </div>
  );
}

export function Stars({ value, size = "size-4", className }: { value: number; size?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.max(0, Math.min(1, value - n + 1));
        return (
          <span key={n} className={cn("relative", size)}>
            <Star className={cn("absolute inset-0 text-fg/20", size)} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={cn("fill-saffron text-saffron", size)} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Your rating" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <motion.button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
        >
          <Star className={cn("size-7 transition-colors", n <= shown ? "fill-saffron text-saffron" : "text-fg/25")} />
        </motion.button>
      ))}
    </div>
  );
}

export function CoursesTabs({ canTeach }: { canTeach: boolean }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/courses", label: "Browse", active: pathname === "/courses" },
    { href: "/courses/my", label: "My learning", active: pathname.startsWith("/courses/my") },
    ...(canTeach ? [{ href: "/courses/teach", label: "Teach", active: pathname.startsWith("/courses/teach") }] : []),
  ];
  return (
    <nav className="glass inline-flex rounded-2xl p-1" aria-label="Courses sections">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          className={cn("relative rounded-xl px-4 py-2 text-sm font-semibold transition-colors", t.active ? "text-white" : "text-muted hover:text-fg")}
        >
          {t.active && (
            <motion.span layoutId="courses-tab" className="absolute inset-0 rounded-xl bg-gradient-to-r from-saffron via-rose to-primary" transition={{ type: "spring", stiffness: 380, damping: 32 }} />
          )}
          <span className="relative">{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-fg/10", className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-teal to-primary"
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
