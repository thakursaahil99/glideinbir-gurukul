"use client";

import { animate, motion, useInView, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import { Feather, Rocket, Sprout, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BirdMark } from "@/components/brand/logo";
import { Reveal, SectionHeading } from "@/components/motion/effects";
import { useSite } from "@/core/site/site-context";

/* ---------------- Marquee ---------------- */

export function Marquee() {
  const { marquee } = useSite();
  if (!marquee.rowA.length && !marquee.rowB.length) return null;
  return (
    <section aria-label="Exams and skills covered" className="relative overflow-hidden border-y border-line py-8">
      {marquee.rowA.length > 0 && <MarqueeRow items={marquee.rowA} className="animate-marquee" />}
      {marquee.rowB.length > 0 && <MarqueeRow items={marquee.rowB} className="mt-4 animate-marquee-rev" outline />}
    </section>
  );
}

function MarqueeRow({ items, className, outline }: { items: string[]; className: string; outline?: boolean }) {
  const list = [...items, ...items];
  return (
    <div className="mask-x flex overflow-hidden">
      <div className={`flex shrink-0 items-center gap-10 pr-10 hover:[animation-play-state:paused] ${className}`}>
        {list.map((t, i) => (
          <span key={i} className="flex items-center gap-10 whitespace-nowrap">
            <span
              className={`font-display text-3xl font-bold tracking-tight sm:text-5xl ${
                outline ? "text-transparent [-webkit-text-stroke:1px_var(--muted)]" : ""
              }`}
            >
              {t}
            </span>
            <BirdMark className="w-7 opacity-70" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Journey (scroll-linked flight) ---------------- */

/** Icon and colour per step position; the words come from the admin panel. */
const STEP_STYLE = [
  { icon: Wallet, color: "var(--teal)" },
  { icon: Feather, color: "var(--saffron)" },
  { icon: Rocket, color: "var(--rose)" },
  { icon: Sprout, color: "var(--primary)" },
];

export function Journey() {
  const { journey } = useSite();
  const steps = journey.steps.map((s, i) => ({ ...s, ...STEP_STYLE[i % STEP_STYLE.length] }));
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 65%", "end 55%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 22 });
  const birdTop = useTransform(progress, [0, 1], ["0%", "100%"]);
  const birdRotate = useTransform(progress, [0, 0.5, 1], [80, 100, 80]);

  return (
    <section id="journey" className="relative py-28 sm:py-36">
      <div className="container-x grid gap-16 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <SectionHeading
            align="left"
            eyebrow={journey.eyebrow}
            title={journey.title}
            sub={journey.sub}
          />
          {journey.quote && (
            <Reveal delay={0.3} className="mt-10 hidden lg:block">
              <p className="font-deva text-3xl text-muted">{journey.quote}</p>
              {journey.quoteMeaning && <p className="mt-1 text-sm text-muted">&ldquo;{journey.quoteMeaning}&rdquo;</p>}
            </Reveal>
          )}
        </div>

        <div ref={ref} className="relative pl-12 sm:pl-16">
          <div className="absolute top-0 bottom-0 left-4 w-px bg-line sm:left-6" />
          <motion.div
            className="absolute top-0 bottom-0 left-4 w-[3px] -translate-x-px origin-top rounded-full bg-gradient-to-b from-teal via-rose to-primary sm:left-6"
            style={{ scaleY: progress }}
          />
          <motion.div className="absolute left-4 z-10 -translate-x-1/2 -translate-y-1/2 sm:left-6" style={{ top: birdTop }}>
            <motion.div style={{ rotate: birdRotate }} className="rounded-full bg-bg p-1.5 shadow-[0_0_30px_var(--glow)]">
              <BirdMark className="w-8" />
            </motion.div>
          </motion.div>

          <div className="space-y-10">
            {steps.map((s, i) => (
              <motion.article
                key={i}
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-120px" }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="glass group relative overflow-hidden rounded-[28px] p-7 sm:p-9"
              >
                <span className="pointer-events-none absolute -top-6 -right-2 font-display text-[9rem] leading-none font-black text-fg/[0.04] transition-transform duration-700 group-hover:-translate-y-2">
                  0{i + 1}
                </span>
                <span
                  className="grid size-12 place-items-center rounded-2xl text-white"
                  style={{ background: s.color, boxShadow: `0 14px 30px -12px ${s.color}` }}
                >
                  <s.icon className="size-6" />
                </span>
                <p className="mt-6 text-xs font-bold tracking-[0.3em] uppercase" style={{ color: s.color }}>
                  {s.kicker}
                </p>
                <h3 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">{s.title}</h3>
                <p className="mt-3 max-w-lg text-muted">{s.body}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Stats ---------------- */

const STAT_COLS = ["", "lg:grid-cols-1", "lg:grid-cols-2", "lg:grid-cols-3", "lg:grid-cols-4"];

export function Stats() {
  const { stats } = useSite();
  return (
    <section className="py-10">
      <div className="container-x">
        <div className={`glass grid grid-cols-2 divide-line overflow-hidden rounded-[32px] lg:divide-x ${STAT_COLS[stats.length]}`}>
          {stats.map((s, i) => (
            <div key={i} className="relative p-8 text-center sm:p-10">
              <p className="font-display text-5xl font-extrabold tracking-tight sm:text-6xl">
                <span className="text-gradient">
                  {s.prefix}
                  <Counter to={s.value} delay={i * 0.12} />
                  {s.suffix}
                </span>
              </p>
              <p className="mt-2 text-sm text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Counter({ to, delay = 0 }: { to: number; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, to, { duration: 1.6, delay, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setDisplay(Math.round(v)) });
    return () => controls.stop();
  }, [inView, mv, to, delay]);
  return <span ref={ref}>{display}</span>;
}
