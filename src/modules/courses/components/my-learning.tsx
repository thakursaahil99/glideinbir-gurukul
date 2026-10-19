"use client";

import { motion } from "framer-motion";
import { Award, BookOpen, PlayCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { certificateUrl } from "../urls";
import type { Category } from "../types";
import { CourseCover, ProgressBar } from "./bits";

export interface LearningItem {
  id: string;
  slug: string;
  title: string;
  category: Category;
  colors: [string, string];
  instructorName: string;
  progress: number;
  resumeLectureId: string | null;
  resumeTitle: string | null;
  certificateCode: string | null;
  lastActivity: string;
}

export function MyLearning({ items }: { items: LearningItem[] }) {
  if (items.length === 0)
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-[28px] px-6 py-16 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-saffron via-rose to-primary text-white">
          <BookOpen className="size-8" />
        </span>
        <p className="mt-5 font-display text-2xl font-bold">Your shelf is empty</p>
        <p className="mt-2 text-muted">Courses you enroll in will show up here with your progress.</p>
        <Link href="/courses" className="mt-6 inline-block rounded-2xl bg-fg px-6 py-3 font-semibold text-bg">
          Browse courses
        </Link>
      </motion.div>
    );

  const certs = items.filter((i) => i.certificateCode);
  return (
    <div className="space-y-8">
      <ul className="grid gap-4 md:grid-cols-2">
        {items.map((c, i) => (
          <motion.li
            key={c.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, ease: [0.22, 1, 0.36, 1], duration: 0.6 }}
            className="glass group flex gap-4 overflow-hidden rounded-[24px] p-4"
          >
            <CourseCover colors={c.colors} category={c.category} className="hidden aspect-square w-28 shrink-0 rounded-2xl sm:block" />
            <div className="flex min-w-0 flex-1 flex-col">
              <Link href={`/courses/${c.slug}`} className="line-clamp-2 font-display text-lg leading-snug font-bold hover:underline">
                {c.title}
              </Link>
              <p className="text-xs text-muted">{c.instructorName}</p>
              <div className="mt-3 flex items-center gap-3">
                <ProgressBar value={c.progress} className="flex-1" />
                <b className="text-sm tabular-nums">{c.progress}%</b>
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                {c.resumeLectureId && (
                  <Link
                    href={`/courses/${c.slug}/learn/${c.resumeLectureId}`}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-saffron via-rose to-primary px-3.5 py-2 text-sm font-semibold text-white"
                    title={c.resumeTitle ?? undefined}
                  >
                    <PlayCircle className="size-4" /> {c.progress === 0 ? "Start" : c.progress === 100 ? "Rewatch" : "Continue"}
                  </Link>
                )}
                {c.certificateCode && (
                  <a href={certificateUrl(c.certificateCode)} className="flex items-center gap-1.5 rounded-xl border border-saffron/40 px-3.5 py-2 text-sm font-semibold text-saffron">
                    <Award className="size-4" /> Certificate
                  </a>
                )}
              </div>
            </div>
          </motion.li>
        ))}
      </ul>

      {certs.length > 0 && (
        <section>
          <h2 className="font-display text-2xl font-bold">Certificates</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {certs.map((c) => (
              <li key={c.certificateCode} className="glass relative overflow-hidden rounded-[20px] p-5">
                <div className="absolute -top-8 -right-8 size-24 rounded-full opacity-30 blur-2xl" style={{ background: c.colors[0] }} />
                <Award className="size-7 text-saffron" />
                <p className="mt-3 line-clamp-2 font-semibold">{c.title}</p>
                <p className="mt-1 font-mono text-xs text-muted">{c.certificateCode}</p>
                <div className="mt-4 flex gap-3 text-sm font-semibold">
                  <a href={certificateUrl(c.certificateCode!)} className="text-primary hover:underline">
                    Download PDF
                  </a>
                  <Link href={`/verify/${c.certificateCode}`} className="flex items-center gap-1 text-muted hover:text-fg">
                    <ShieldCheck className="size-4" /> Verify link
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
