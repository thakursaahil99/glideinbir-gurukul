"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Clock, PlayCircle, Search, SlidersHorizontal, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { cn, formatPaise } from "@/lib/utils";
import { formatDuration } from "../logic";
import { CATEGORIES, LEVELS, type Category, type CourseStats, type Level } from "../types";
import { CourseCover, Stars } from "./bits";

export interface CardData {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: Category;
  level: Level;
  price: number;
  colors: [string, string];
  demo?: boolean;
  instructorName: string;
  lectures: number;
  durationSec: number;
  stats: CourseStats;
  enrolled: boolean;
}

const SORT_LABEL = { popular: "Most popular", rating: "Highest rated", newest: "Newest", "price-asc": "Price: low to high", "price-desc": "Price: high to low" } as const;

export function CatalogFilters({ total }: { total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [open, setOpen] = useState(false);

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    start(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  // Debounced search-as-you-type
  useEffect(() => {
    if ((sp.get("q") ?? "") === q) return;
    const t = setTimeout(() => set("q", q.trim() || null), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const active = ["category", "price", "rating", "level"].filter((k) => sp.get(k)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="glass flex min-w-64 flex-1 items-center gap-2 rounded-2xl px-4 py-3">
          <Search className="size-5 text-muted" />
          <span className="sr-only">Search courses</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses, topics, instructors…" className="w-full bg-transparent outline-none placeholder:text-muted" />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="text-muted hover:text-fg">
              <X className="size-4" />
            </button>
          )}
        </label>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={cn("glass flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold", (open || active) && "ring-1 ring-primary/50")}
        >
          <SlidersHorizontal className="size-4" /> Filters {active > 0 && <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] text-white">{active}</span>}
        </button>
        <label className="sr-only" htmlFor="sort">
          Sort by
        </label>
        <select
          id="sort"
          value={sp.get("sort") ?? "popular"}
          onChange={(e) => set("sort", e.target.value === "popular" ? null : e.target.value)}
          className="glass rounded-2xl px-4 py-3 text-sm font-semibold"
        >
          {Object.entries(SORT_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <Chip on={!sp.get("category")} onClick={() => set("category", null)}>
          All
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c} on={sp.get("category") === c} onClick={() => set("category", sp.get("category") === c ? null : c)}>
            {c}
          </Chip>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="glass grid gap-5 rounded-2xl p-5 sm:grid-cols-3">
              <Group label="Price">
                {[
                  [null, "Any"],
                  ["free", "Free"],
                  ["paid", "Paid"],
                ].map(([v, l]) => (
                  <Chip key={l} on={(sp.get("price") ?? null) === v} onClick={() => set("price", v)}>
                    {l}
                  </Chip>
                ))}
              </Group>
              <Group label="Rating">
                {[
                  [null, "Any"],
                  ["4.5", "4.5+"],
                  ["4", "4+"],
                  ["3", "3+"],
                ].map(([v, l]) => (
                  <Chip key={l} on={(sp.get("rating") ?? null) === v} onClick={() => set("rating", v)}>
                    {l}
                  </Chip>
                ))}
              </Group>
              <Group label="Level">
                <Chip on={!sp.get("level")} onClick={() => set("level", null)}>
                  Any
                </Chip>
                {LEVELS.map((l) => (
                  <Chip key={l} on={sp.get("level") === l} onClick={() => set("level", l)}>
                    <span className="capitalize">{l}</span>
                  </Chip>
                ))}
              </Group>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className={cn("text-sm text-muted transition-opacity", pending && "opacity-50")} aria-live="polite">
        {total} course{total === 1 ? "" : "s"}
        {active > 0 && (
          <button type="button" onClick={() => start(() => router.replace(pathname + (sp.get("q") ? `?q=${encodeURIComponent(sp.get("q")!)}` : ""), { scroll: false }))} className="ml-3 font-semibold text-primary hover:underline">
            Clear filters
          </button>
        )}
      </p>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold tracking-wider text-muted uppercase">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
        on ? "border-transparent bg-fg text-bg" : "border-line text-muted hover:bg-fg/5 hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

export function CourseGrid({ items }: { items: CardData[] }) {
  if (items.length === 0)
    return (
      <div className="glass rounded-[28px] px-6 py-16 text-center">
        <p className="font-display text-2xl font-bold">No courses match</p>
        <p className="mt-2 text-muted">Try a different search or clear the filters.</p>
      </div>
    );
  return (
    <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((c, i) => (
        <motion.li key={c.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 9) * 0.05, ease: [0.22, 1, 0.36, 1], duration: 0.6 }}>
          <CourseCard c={c} />
        </motion.li>
      ))}
    </ul>
  );
}

export function CourseCard({ c }: { c: CardData }) {
  return (
    <Link href={`/courses/${c.slug}`} className="glass group flex h-full flex-col overflow-hidden rounded-[24px] transition-transform duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_60px_-20px_var(--glow)]">
      <div className="relative">
        <CourseCover colors={c.colors} category={c.category} className="aspect-[16/9] transition-transform duration-700 group-hover:scale-105" />
        <span className="absolute top-3 left-3 flex gap-1.5">
          {c.demo && <span className="rounded-full bg-black/40 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur">Demo</span>}
          {c.enrolled && <span className="rounded-full bg-teal px-2 py-0.5 text-[11px] font-bold text-black">Enrolled</span>}
        </span>
        <span className="absolute right-3 bottom-3 grid size-11 translate-y-2 place-items-center rounded-full bg-white text-black opacity-0 shadow-lg transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <PlayCircle className="size-6" />
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">{c.category}</p>
        <h3 className="mt-1.5 line-clamp-2 font-display text-lg leading-snug font-bold">{c.title}</h3>
        <p className="mt-1 text-sm text-muted">{c.instructorName}</p>
        <div className="mt-2 flex items-center gap-1.5 text-sm">
          {c.stats.reviews > 0 ? (
            <>
              <b className="text-saffron">{c.stats.rating.toFixed(1)}</b>
              <Stars value={c.stats.rating} size="size-3.5" />
              <span className="text-muted">({c.stats.reviews})</span>
            </>
          ) : (
            <span className="text-xs text-muted">No ratings yet</span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" /> {formatDuration(c.durationSec)} · {c.lectures} lectures
          </span>
          <span className="flex items-center gap-1">
            <Users className="size-3.5" /> {c.stats.students}
          </span>
          <span className="capitalize">{c.level}</span>
        </div>
        <p className="mt-auto pt-4 font-display text-xl font-bold">{c.price ? formatPaise(c.price) : <span className="text-teal">Free</span>}</p>
      </div>
    </Link>
  );
}
