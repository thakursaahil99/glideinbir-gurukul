"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Award, CheckCircle2, ChevronLeft, ChevronRight, Circle, FileText, Lock, PlayCircle, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import type { CourseView, LectureView } from "../access";
import { mediaUrl } from "../urls";
import { formatDuration } from "../logic";
import { ProgressBar } from "./bits";
import { VideoPlayer } from "./player";
import { rpc } from "@/lib/rpc";

export interface LearnProps {
  course: CourseView;
  lectureId: string;
  startAt: number;
  completedIds: string[];
  tracking: boolean;
  certificateCode: string | null;
}

export function LearnView({ course, lectureId, startAt, completedIds, tracking, certificateCode }: LearnProps) {
  const [done, setDone] = useState(() => new Set(completedIds));
  const [cert, setCert] = useState<string | null>(null);
  const [, start] = useTransition();

  const flat = useMemo(() => course.sections.flatMap((s) => s.lectures), [course]);
  const index = flat.findIndex((l) => l.id === lectureId);
  const lecture = flat[index]!;
  const prev = flat.slice(0, index).reverse().find((l) => !l.locked);
  const next = flat.slice(index + 1).find((l) => !l.locked);
  const percent = flat.length ? Math.floor((flat.filter((l) => done.has(l.id)).length / flat.length) * 100) : 0;

  const save = useCallback(
    async (positionSec: number, completed?: boolean) => {
      if (!tracking) return;
      if (completed) setDone((d) => new Set(d).add(lectureId));
      const res = await rpc("courses.progress", { courseId: course.id, lectureId, positionSec, completed });
      if (res.certificate && !certificateCode) setCert(res.certificate);
    },
    [tracking, course.id, lectureId, certificateCode],
  );

  const toggleComplete = () =>
    start(async () => {
      const now = !done.has(lectureId);
      setDone((d) => {
        const n = new Set(d);
        if (now) n.add(lectureId);
        else n.delete(lectureId);
        return n;
      });
      const res = await rpc("courses.progress", { courseId: course.id, lectureId, positionSec: 0, completed: now });
      if (res.certificate && !certificateCode) setCert(res.certificate);
    });

  const src = lecture.video?.kind === "upload" ? mediaUrl(course.id, lecture.video.src) : (lecture.video?.src ?? "");

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link href={`/courses/${course.slug}`} className="glass grid size-10 place-items-center rounded-full" aria-label="Back to course">
          <ChevronLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted">{course.title}</p>
          <h1 className="truncate font-display text-xl font-bold">{lecture.title}</h1>
        </div>
        {tracking && (
          <div className="w-44">
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-muted">Your progress</span>
              <b>{percent}%</b>
            </div>
            <ProgressBar value={percent} />
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <motion.div
            key={lecture.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.5 }}
            className="aspect-video overflow-hidden rounded-[24px] bg-black shadow-[0_30px_80px_-30px_var(--glow)] ring-1 ring-line"
          >
            {lecture.video ? (
              <VideoPlayer
                video={lecture.video}
                src={src}
                startAt={startAt}
                durationSec={lecture.durationSec}
                onProgress={(pos, ended) => void save(pos, ended ? true : undefined)}
              />
            ) : (
              <div className="grid size-full place-items-center text-white/60">This lecture has no video yet.</div>
            )}
          </motion.div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {tracking && (
              <button
                type="button"
                onClick={toggleComplete}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
                  done.has(lecture.id) ? "bg-teal/15 text-teal" : "glass hover:bg-fg/5",
                )}
              >
                {done.has(lecture.id) ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
                {done.has(lecture.id) ? "Completed" : "Mark as complete"}
              </button>
            )}
            {lecture.notes && (
              <a href={lecture.notes.url} target="_blank" rel="noopener" className="glass flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-fg/5">
                <FileText className="size-4 text-saffron" /> {lecture.notes.name}
              </a>
            )}
            <div className="ml-auto flex gap-2">
              {prev && (
                <Link href={`/courses/${course.slug}/learn/${prev.id}`} className="glass flex items-center gap-1 rounded-xl px-4 py-2.5 text-sm font-semibold">
                  <ChevronLeft className="size-4" /> Previous
                </Link>
              )}
              {next && (
                <Link
                  href={`/courses/${course.slug}/learn/${next.id}`}
                  className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-saffron via-rose to-primary px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Next <ChevronRight className="size-4" />
                </Link>
              )}
            </div>
          </div>
          {!tracking && (
            <p className="mt-4 rounded-2xl border border-line p-4 text-sm text-muted">
              {lecture.preview ? "You're watching a free preview. " : "You're viewing as the course owner. "}
              Progress is tracked for enrolled learners.
            </p>
          )}
          {(certificateCode || cert) && (
            <a
              href={`/api/courses/certificate/${certificateCode ?? cert}`}
              className="mt-4 flex items-center gap-3 rounded-2xl border border-saffron/40 bg-saffron/10 p-4 text-sm font-semibold"
            >
              <Award className="size-5 text-saffron" /> You earned a certificate. Download it ({certificateCode ?? cert})
            </a>
          )}
        </div>

        <Sidebar course={course} current={lecture.id} done={done} />
      </div>

      <AnimatePresence>{cert && <Celebration code={cert} onClose={() => setCert(null)} />}</AnimatePresence>
    </div>
  );
}

function Sidebar({ course, current, done }: { course: CourseView; current: string; done: Set<string> }) {
  return (
    <aside className="glass h-fit max-h-[calc(100svh-8rem)] overflow-y-auto rounded-[24px] lg:sticky lg:top-24">
      <p className="sticky top-0 z-10 border-b border-line bg-card-solid/90 px-5 py-4 font-display font-bold backdrop-blur">Course content</p>
      {course.sections.map((s, si) => (
        <div key={s.id}>
          <p className="px-5 pt-4 pb-2 text-xs font-bold tracking-wider text-muted uppercase">
            {si + 1}. {s.title}
          </p>
          <ul>
            {s.lectures.map((l: LectureView) => {
              const active = l.id === current;
              const inner = (
                <>
                  {l.locked ? (
                    <Lock className="size-4 shrink-0 text-muted" />
                  ) : done.has(l.id) ? (
                    <CheckCircle2 className="size-4 shrink-0 text-teal" />
                  ) : active ? (
                    <PlayCircle className="size-4 shrink-0 text-primary" />
                  ) : (
                    <Circle className="size-4 shrink-0 text-muted" />
                  )}
                  <span className="flex-1">{l.title}</span>
                  <span className="text-xs text-muted tabular-nums">{formatDuration(l.durationSec)}</span>
                </>
              );
              const cls = cn("relative flex items-center gap-3 px-5 py-2.5 text-sm", active && "font-semibold");
              return (
                <li key={l.id}>
                  {l.locked ? (
                    <span className={cn(cls, "text-muted")}>{inner}</span>
                  ) : (
                    <Link href={`/courses/${course.slug}/learn/${l.id}`} className={cn(cls, "hover:bg-fg/[0.04]")}>
                      {active && <motion.span layoutId="learn-active" className="absolute inset-y-1 left-2 w-1 rounded-full bg-gradient-to-b from-saffron to-primary" />}
                      {inner}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </aside>
  );
}

const BITS = Array.from({ length: 28 }, (_, i) => ({ x: (i * 37) % 100, d: (i % 7) * 0.08, r: (i * 53) % 360, c: ["#ff8a00", "#ff4d6d", "#5b47ff", "#2ee6c5"][i % 4] }));

function Celebration({ code, onClose }: { code: string; onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label="Certificate earned"
    >
      {BITS.map((b, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute top-0 size-2.5 rounded-sm"
          style={{ left: `${b.x}%`, background: b.c }}
          initial={{ y: -20, rotate: 0, opacity: 1 }}
          animate={{ y: "100vh", rotate: b.r + 360, opacity: [1, 1, 0] }}
          transition={{ duration: 2.4, delay: b.d, ease: "easeIn" }}
        />
      ))}
      <motion.div
        initial={{ scale: 0.8, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        className="relative w-full max-w-md rounded-[28px] bg-card-solid p-8 text-center ring-1 ring-line"
      >
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-fg" aria-label="Close">
          <X className="size-5" />
        </button>
        <motion.span
          initial={{ rotate: -30, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="mx-auto grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-saffron via-rose to-primary text-white"
        >
          <Award className="size-10" />
        </motion.span>
        <h2 className="mt-5 font-display text-3xl font-bold">Course complete!</h2>
        <p className="mt-2 text-muted">You finished every lecture. Your certificate is ready.</p>
        <p className="mt-3 font-mono text-sm">{code}</p>
        <a href={`/api/courses/certificate/${code}`} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-saffron via-rose to-primary px-6 py-3 font-semibold text-white">
          <Award className="size-4" /> Download certificate
        </a>
      </motion.div>
    </motion.div>
  );
}
