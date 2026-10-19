"use client";

import { AnimatePresence, motion, useInView } from "framer-motion";
import { Check, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ModuleKey } from "@/core/module-registry";

/** Tiny animated mock-UI per module, shown inside the bento cards. */
export function ModuleVisual({ k, colors }: { k: ModuleKey; colors: [string, string] }) {
  const grad = `linear-gradient(90deg, ${colors[0]}, ${colors[1]})`;
  switch (k) {
    case "courses":
      return <CoursesVisual grad={grad} />;
    case "tests":
      return <TestsVisual colors={colors} />;
    case "notes":
      return <NotesVisual grad={grad} />;
    case "doubts":
      return <DoubtsVisual colors={colors} />;
    case "mentorship":
      return <MentorVisual grad={grad} />;
    case "code":
      return <CodeVisual />;
    case "jobs":
      return <JobsVisual grad={grad} />;
  }
}

function useTicker(ms: number, max: number) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const t = setInterval(() => setI((v) => (v + 1) % max), ms);
    return () => clearInterval(t);
  }, [inView, ms, max]);
  return { ref, i };
}

function CoursesVisual({ grad }: { grad: string }) {
  const lectures = ["Intro to Kinematics", "Projectile motion", "Relative velocity", "Practice set"];
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-bg-2 ring-1 ring-line">
        <div className="absolute inset-0 opacity-40" style={{ background: `${grad}`, maskImage: "radial-gradient(circle at 70% 30%, #000, transparent 70%)" }} />
        <motion.span
          className="absolute top-1/2 left-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-black shadow-xl"
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Play className="ml-0.5 size-6 fill-current" />
        </motion.span>
        <div className="absolute inset-x-3 bottom-3 h-1.5 overflow-hidden rounded-full bg-white/20">
          <motion.div
            className="h-full rounded-full"
            style={{ background: grad }}
            initial={{ width: "8%" }}
            whileInView={{ width: ["8%", "72%"] }}
            transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 1, ease: "easeInOut" }}
          />
        </div>
      </div>
      <ul className="hidden space-y-2 sm:block">
        {lectures.map((l, i) => (
          <motion.li
            key={l}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.12 }}
            viewport={{ once: true }}
            className="flex items-center gap-3 rounded-xl bg-fg/[0.04] px-3 py-2 text-sm"
          >
            <span
              className="grid size-5 place-items-center rounded-full text-white"
              style={{ background: i < 2 ? grad : "var(--border)" }}
            >
              {i < 2 && <Check className="size-3" />}
            </span>
            <span className={i < 2 ? "text-muted line-through" : ""}>{l}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function TestsVisual({ colors }: { colors: [string, string] }) {
  const { ref, i } = useTicker(1000, 60);
  const secs = 59 - i;
  const palette = [2, 2, 1, 2, 0, 3, 2, 0, 0, 1, 0, 0];
  const tone = ["var(--border)", colors[0], "#2ee6c5", "#ffae3d"];
  return (
    <div ref={ref} className="flex items-center gap-4">
      <div className="relative size-20 shrink-0">
        <svg viewBox="0 0 80 80" className="size-full -rotate-90">
          <circle cx="40" cy="40" r="34" fill="none" stroke="var(--border)" strokeWidth="6" />
          <circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke={colors[1]}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={213.6}
            strokeDashoffset={213.6 * (1 - secs / 60)}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center font-mono text-sm font-bold tabular-nums">
          29:{String(secs).padStart(2, "0")}
        </span>
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {palette.map((p, n) => (
          <motion.span
            key={n}
            className="grid size-6 place-items-center rounded-md text-[10px] font-bold text-white"
            style={{ background: tone[(p + (n === i % 12 ? 1 : 0)) % 4] }}
            animate={n === i % 12 ? { scale: [1, 1.25, 1] } : {}}
          >
            {n + 1}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

function NotesVisual({ grad }: { grad: string }) {
  return (
    <div className="relative mx-auto h-28 w-24">
      {[0, 1, 2].map((n) => (
        <div
          key={n}
          className="absolute inset-0 origin-bottom rounded-xl bg-card-solid p-2.5 shadow-lg ring-1 ring-line transition-transform duration-500 group-hover:[transform:rotate(var(--rot))_translateX(var(--tx))]"
          style={{ ["--rot" as string]: `${(n - 1) * 14}deg`, ["--tx" as string]: `${(n - 1) * 18}px`, zIndex: n }}
        >
          <div className="h-2 w-2/3 rounded-full" style={{ background: grad }} />
          {[...Array(5)].map((_, j) => (
            <div key={j} className="mt-1.5 h-1 rounded-full bg-fg/10" style={{ width: `${90 - j * 12}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function DoubtsVisual({ colors }: { colors: [string, string] }) {
  const { ref, i } = useTicker(2200, 2);
  const matched = i === 1;
  return (
    <div ref={ref} className="flex items-center gap-5">
      <div className="relative grid size-24 shrink-0 place-items-center">
        {[0, 1, 2].map((n) => (
          <motion.span
            key={n}
            className="absolute inset-0 rounded-full border-2"
            style={{ borderColor: colors[0] }}
            animate={{ scale: [0.3, 1.1], opacity: [0.8, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, delay: n * 0.7, ease: "easeOut" }}
          />
        ))}
        <span className="relative grid size-10 place-items-center rounded-full font-bold text-white" style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}>
          ?
        </span>
        {["A", "R", "K"].map((t, n) => (
          <motion.span
            key={t}
            className="absolute grid size-6 place-items-center rounded-full bg-card-solid text-[10px] font-bold ring-1 ring-line"
            style={{ left: `${[8, 78, 60][n]}%`, top: `${[20, 10, 80][n]}%` }}
            animate={{ scale: matched && n === 1 ? 1.3 : 1, backgroundColor: matched && n === 1 ? "#2ee6c5" : "var(--card-solid)" }}
          >
            {t}
          </motion.span>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={matched ? "m" : "s"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="text-sm"
        >
          <p className="font-semibold">{matched ? "Matched with Rhea ✓" : "Finding a tutor…"}</p>
          <p className="text-muted">{matched ? "Physics · joining video call" : "Broadcasting to 14 online tutors"}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function MentorVisual({ grad }: { grad: string }) {
  const { ref, i } = useTicker(900, 12);
  return (
    <div ref={ref}>
      <div className="mb-2 grid grid-cols-4 text-center text-[10px] font-semibold text-muted uppercase">
        {["Mon", "Tue", "Wed", "Thu"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {[...Array(12)].map((_, n) => (
          <motion.span
            key={n}
            className="h-6 rounded-md ring-1 ring-line"
            animate={{ background: n === i ? grad : n % 5 === 2 ? "var(--border)" : "transparent" }}
            transition={{ duration: 0.4 }}
          />
        ))}
      </div>
    </div>
  );
}

const CODE = ["def two_sum(nums, t):", "  seen = {}", "  for i, n in enumerate(nums):", "    if t - n in seen:", "      return [seen[t-n], i]", "    seen[n] = i"];

function CodeVisual() {
  const { ref, i } = useTicker(110, CODE.join("\n").length + 30);
  const full = CODE.join("\n");
  const shown = full.slice(0, i);
  const done = i >= full.length;
  return (
    <div ref={ref} className="relative overflow-hidden rounded-2xl bg-[#0d0b22] p-4 font-mono text-[11px] leading-relaxed text-[#cfc9ff] ring-1 ring-white/10 sm:text-xs">
      <div className="mb-3 flex gap-1.5">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
      </div>
      <pre className="min-h-[7.5em] whitespace-pre-wrap">
        {shown}
        <span className="ml-px inline-block h-[1.1em] w-[2px] translate-y-[2px] animate-pulse bg-teal" />
      </pre>
      <AnimatePresence>
        {done && (
          <motion.span
            initial={{ opacity: 0, scale: 0.6, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-3 right-3 rounded-full bg-[#28c840]/15 px-2.5 py-1 font-sans text-[11px] font-bold text-[#28c840]"
          >
            ✓ Accepted · 48ms
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

function JobsVisual({ grad }: { grad: string }) {
  const stages = ["Applied", "Shortlisted", "Interview", "Hired"];
  const { ref, i } = useTicker(1300, stages.length);
  return (
    <div ref={ref} className="flex flex-wrap gap-2">
      {stages.map((s, n) => (
        <span key={s} className="relative rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-line">
          {n === i && (
            <motion.span layoutId="job-stage" className="absolute inset-0 rounded-full" style={{ background: grad }} transition={{ type: "spring", stiffness: 300, damping: 26 }} />
          )}
          <span className={`relative ${n === i ? "text-white" : "text-muted"}`}>{s}</span>
        </span>
      ))}
    </div>
  );
}
