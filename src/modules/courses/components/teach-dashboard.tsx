"use client";

import { motion } from "framer-motion";
import { IndianRupee, Loader2, Pencil, Plus, Star, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn, formatPaise } from "@/lib/utils";
import type { Category, CourseStatus } from "../types";
import { CourseCover } from "./bits";
import { rpc } from "@/lib/rpc";

export interface TeachRow {
  id: string;
  slug: string;
  title: string;
  category: Category;
  colors: [string, string];
  status: CourseStatus;
  price: number;
  students: number;
  rating: number;
  reviews: number;
  earned: number;
  updatedAt: string;
}

const STATUS_CLS: Record<CourseStatus, string> = {
  published: "bg-teal/15 text-teal",
  draft: "bg-saffron/15 text-saffron",
  archived: "bg-fg/10 text-muted",
};

export function TeachDashboard({ rows, commissionPercent }: { rows: TeachRow[]; commissionPercent: number }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const students = rows.reduce((s, r) => s + r.students, 0);
  const earned = rows.reduce((s, r) => s + r.earned, 0);
  const rated = rows.filter((r) => r.reviews > 0);
  const rating = rated.length ? rated.reduce((s, r) => s + r.rating * r.reviews, 0) / rated.reduce((s, r) => s + r.reviews, 0) : 0;

  const stats = [
    { icon: IndianRupee, label: "Total earnings", value: formatPaise(earned), tint: "text-teal" },
    { icon: Users, label: "Students", value: String(students), tint: "text-primary" },
    { icon: Star, label: "Average rating", value: rating ? rating.toFixed(1) : "—", tint: "text-saffron" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="glass rounded-[24px] p-5">
            <s.icon className={cn("size-5", s.tint)} />
            <p className="mt-3 font-display text-3xl font-bold tabular-nums">{s.value}</p>
            <p className="text-sm text-muted">{s.label}</p>
          </motion.div>
        ))}
      </div>
      <p className="text-xs text-muted">
        Earnings land in your wallet the moment a student buys. Platform commission is {commissionPercent}% per sale.
      </p>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const title = String(new FormData(e.currentTarget).get("title") ?? "");
          setCreating(true);
          setError(null);
          try {
            const res = await rpc("teach.create", title);
            if (res.ok) router.push(`/courses/teach/${res.id}`);
            else setError(res.error);
          } finally {
            setCreating(false);
          }
        }}
        className="glass flex flex-wrap items-center gap-3 rounded-[24px] p-4"
      >
        <label htmlFor="new-title" className="sr-only">
          New course title
        </label>
        <input
          id="new-title"
          name="title"
          required
          minLength={3}
          maxLength={120}
          placeholder="Title of your new course, e.g. Organic Chemistry in 30 days"
          className="min-w-64 flex-1 rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <button disabled={creating} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-saffron via-rose to-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Create course
        </button>
        {error && <p className="w-full text-sm text-rose">{error}</p>}
      </form>

      {rows.length === 0 ? (
        <div className="glass rounded-[28px] px-6 py-14 text-center">
          <p className="font-display text-2xl font-bold">Your first course starts here</p>
          <p className="mt-2 text-muted">Give it a title above. You can add sections, videos and notes next.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r, i) => (
            <motion.li
              key={r.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass flex flex-wrap items-center gap-4 rounded-[22px] p-4"
            >
              <CourseCover colors={r.colors} category={r.category} className="aspect-video w-32 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold capitalize", STATUS_CLS[r.status])}>{r.status}</span>
                  <span className="text-xs text-muted">{r.price ? formatPaise(r.price) : "Free"}</span>
                </div>
                <p className="mt-1 truncate font-display text-lg font-bold">{r.title}</p>
                <p className="text-xs text-muted">
                  {r.students} students · {r.reviews ? `${r.rating.toFixed(1)}★ (${r.reviews})` : "no ratings"} · earned {formatPaise(r.earned)}
                </p>
              </div>
              <div className="flex gap-2">
                {r.status === "published" && (
                  <Link href={`/courses/${r.slug}`} className="rounded-xl border border-line px-3.5 py-2 text-sm font-semibold hover:bg-fg/5">
                    View
                  </Link>
                )}
                <Link href={`/courses/teach/${r.id}`} className="flex items-center gap-1.5 rounded-xl bg-fg px-3.5 py-2 text-sm font-semibold text-bg">
                  <Pencil className="size-4" /> Edit
                </Link>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}

