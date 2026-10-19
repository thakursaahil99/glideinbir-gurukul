"use client";

import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { NotebookPen, Search, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cn, formatPaise } from "@/lib/utils";
import type { NoteCard } from "../queries";
import { NOTE_SUBJECTS } from "../types";
import { GRADIENT, NoteCover, Stars } from "./bits";

const SORTS = { popular: "Most popular", rating: "Top rated", new: "Newest", low: "Price: low to high", high: "Price: high to low" } as const;
type Sort = keyof typeof SORTS;

export function Marketplace({ notes, owned }: { notes: NoteCard[]; owned: string[] }) {
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("popular");
  const [free, setFree] = useState(false);
  const ownedSet = useMemo(() => new Set(owned), [owned]);
  const subjects = NOTE_SUBJECTS.filter((s) => notes.some((n) => n.subject === s));

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = notes.filter((n) => (!subject || n.subject === subject) && (!free || n.price === 0) && (!needle || `${n.title} ${n.vendorName} ${n.tags.join(" ")} ${n.subject}`.toLowerCase().includes(needle)));
    const by: Record<Sort, (a: NoteCard, b: NoteCard) => number> = {
      popular: (a, b) => b.sales - a.sales || (b.rating ?? 0) - (a.rating ?? 0),
      rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.ratings - a.ratings,
      new: (a, b) => b.createdAt.localeCompare(a.createdAt),
      low: (a, b) => a.price - b.price,
      high: (a, b) => b.price - a.price,
    };
    return list.sort(by[sort]);
  }, [notes, q, subject, free, sort]);

  if (!notes.length)
    return (
      <div className="glass rounded-[28px] p-12 text-center">
        <motion.span animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }} className={cn("mx-auto grid size-16 place-items-center rounded-3xl text-white", GRADIENT)}>
          <NotebookPen className="size-7" />
        </motion.span>
        <p className="mt-4 font-display text-xl font-bold">The shelves are empty, for now</p>
        <p className="mt-1 text-sm text-muted">Toppers are uploading their notes. Have great notes yourself?</p>
        <Link href="/notes/sell" className={cn("mt-5 inline-flex rounded-2xl px-5 py-3 text-sm font-semibold text-white", GRADIENT)}>
          Start selling
        </Link>
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="glass flex flex-1 items-center gap-2 rounded-2xl px-4 py-3">
          <Search className="size-4 text-muted" />
          <span className="sr-only">Search notes</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes, topics or sellers…" className="w-full bg-transparent text-sm outline-none placeholder:text-muted" />
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={() => setFree((f) => !f)} aria-pressed={free} className={cn("rounded-2xl px-4 py-3 text-sm font-semibold ring-1 transition-colors", free ? "bg-teal/15 text-teal ring-teal/40" : "glass ring-line")}>
            Free only
          </button>
          <label className="glass flex items-center rounded-2xl px-3">
            <span className="sr-only">Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="bg-transparent py-3 text-sm font-semibold outline-none">
              {Object.entries(SORTS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {[null, ...subjects].map((s) => (
          <button key={s ?? "all"} type="button" onClick={() => setSubject(s)} className={cn("relative rounded-full px-3.5 py-1.5 text-xs font-semibold", subject === s ? "text-white" : "bg-fg/[0.05] text-muted ring-1 ring-line hover:text-fg")}>
            {subject === s && <motion.span layoutId="notes-subject" className={cn("absolute inset-0 rounded-full", GRADIENT)} />}
            <span className="relative">{s ?? "All subjects"}</span>
          </button>
        ))}
      </div>

      <motion.div layout className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {shown.map((n, i) => (
            <motion.div key={n.id} layout initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }} transition={{ delay: Math.min(i, 10) * 0.03 }}>
              <TiltCard note={n} owned={ownedSet.has(n.id)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      {!shown.length && <p className="py-10 text-center text-sm text-muted">No notes match. Try another subject or search.</p>}
    </div>
  );
}

/** The cover leans toward the cursor; cheap 3D that respects reduced motion via the spring. */
function TiltCard({ note: n, owned }: { note: NoteCard; owned: boolean }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rx = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 18 });
  const ry = useSpring(useTransform(x, [-0.5, 0.5], [-10, 10]), { stiffness: 200, damping: 18 });
  return (
    <Link
      href={`/notes/${n.id}`}
      className="group block"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width - 0.5);
        y.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      <motion.div style={{ rotateX: rx, rotateY: ry, transformPerspective: 800 }}>
        <NoteCover title={n.title} subject={n.subject} pages={n.pages} coverUrl={n.coverUrl} className="aspect-[3/4]" />
      </motion.div>
      <div className="mt-4 px-0.5">
        <p className="line-clamp-2 text-sm leading-snug font-semibold group-hover:text-[#2ee6c5]">{n.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted">{n.vendorName}</p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-xs text-muted">
            {n.rating ? (
              <>
                <Stars value={n.rating} /> {n.rating.toFixed(1)}
              </>
            ) : n.sales ? (
              <>
                <ShoppingBag className="size-3" /> {n.sales} sold
              </>
            ) : (
              <span className="rounded-full bg-[#00b89c]/15 px-1.5 font-semibold text-[#2ee6c5]">New</span>
            )}
          </span>
          <span className={cn("font-display font-bold", owned ? "text-sm text-teal" : n.price ? "" : "text-teal")}>{owned ? "Owned" : n.price ? formatPaise(n.price) : "Free"}</span>
        </div>
      </div>
    </Link>
  );
}
