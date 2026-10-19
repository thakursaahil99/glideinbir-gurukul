"use client";

import { motion, useScroll, useTransform, type Variants } from "framer-motion";
import { ArrowRight, Flame, Play, Wallet, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { BirdMark } from "@/components/brand/logo";
import { Magnetic } from "@/components/motion/effects";
import { useIntroDone } from "@/components/motion/intro-loader";
import { Rich } from "@/components/ui/rich";
import type { ModuleDef } from "@/core/module-registry";
import { useModules, useSite } from "@/core/site/site-context";
import { Starfield } from "./starfield";

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } } };
const rise: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: EASE } },
};
const word: Variants = { hidden: { y: "110%", rotate: 4 }, show: { y: 0, rotate: 0, transition: { duration: 0.9, ease: EASE } } };

const WORD_CLASSES = ["", "text-gradient animate-gradient", "text-gradient-cool"];

export function Hero() {
  const { hero } = useSite();
  const modules = useModules();
  const ready = useIntroDone();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const opacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);
  const orbitY = useTransform(scrollYProgress, [0, 1], [0, -90]);

  return (
    <section ref={ref} className="relative isolate flex min-h-[100svh] items-center overflow-hidden pt-28 pb-20">
      <HeroBackground />
      <FlightPath play={ready} />

      <motion.div style={{ y, opacity, scale }} className="container-x relative grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
        <motion.div variants={container} initial="hidden" animate={ready ? "show" : "hidden"}>
          <motion.div variants={rise}>
            <span className="glass shimmer-border inline-flex items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-xs font-medium sm:text-sm">
              {hero.badgeTag && (
                <span className="rounded-full bg-gradient-to-r from-saffron to-rose px-2 py-0.5 text-[11px] font-bold text-white">{hero.badgeTag}</span>
              )}
              {hero.badge}
            </span>
          </motion.div>

          <h1 className="mt-7 font-display text-[clamp(3.4rem,10vw,8rem)] leading-[0.88] font-extrabold tracking-[-0.04em]">
            {hero.words.map((w, i) => (
              <span key={i} className="block overflow-hidden pb-[0.08em]">
                <motion.span variants={word} className={`inline-block ${WORD_CLASSES[i]}`}>
                  {w}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p variants={rise} className="mt-7 max-w-xl text-lg text-pretty text-muted sm:text-xl">
            <Rich text={hero.intro} />
          </motion.p>

          <motion.div variants={rise} className="mt-9 flex flex-wrap items-center gap-4">
            <Magnetic>
              <Link
                href="/signup"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-saffron via-rose to-primary bg-[length:200%_100%] px-7 py-4 font-semibold text-white shadow-[0_20px_50px_-12px_var(--glow)] transition-[background-position] duration-700 hover:bg-right"
              >
                {hero.primaryCta}
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Magnetic>
            <Magnetic strength={0.25}>
              <a href="#modules" className="glass group inline-flex items-center gap-3 rounded-2xl px-5 py-4 font-semibold">
                <span className="grid size-8 place-items-center rounded-full bg-fg text-bg transition-transform group-hover:scale-110">
                  <Play className="size-3.5 fill-current" />
                </span>
                {hero.secondaryCta}
              </a>
            </Magnetic>
          </motion.div>

          <motion.div variants={rise} className="mt-10 flex items-center gap-4 text-sm text-muted">
            <div className="flex -space-x-2">
              {modules.slice(0, 5).map((m) => (
                <span
                  key={m.key}
                  className="grid size-9 place-items-center rounded-full ring-2 ring-bg"
                  style={{ background: `linear-gradient(135deg, ${m.colors[0]}, ${m.colors[1]})` }}
                >
                  <m.icon className="size-4 text-white" />
                </span>
              ))}
            </div>
            <span>
              <Rich text={hero.footnote} boldClassName="text-fg" />
            </span>
          </motion.div>
        </motion.div>

        <motion.div
          style={{ y: orbitY }}
          initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
          animate={ready ? { opacity: 1, scale: 1, rotate: 0 } : {}}
          transition={{ duration: 1.4, ease: EASE, delay: 0.3 }}
        >
          <OrbitVisual />
        </motion.div>
      </motion.div>

      <motion.a
        href="#modules"
        aria-label="Scroll to modules"
        initial={{ opacity: 0 }}
        animate={ready ? { opacity: 1 } : {}}
        transition={{ delay: 1.4 }}
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[10px] tracking-[0.3em] text-muted uppercase sm:flex"
      >
        Scroll
        <span className="relative h-10 w-6 rounded-full border border-line">
          <motion.span
            className="absolute top-1.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-fg"
            animate={{ y: [0, 16, 0], opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />
        </span>
      </motion.a>
    </section>
  );
}

function HeroBackground() {
  return (
    <div aria-hidden className="absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-grid mask-radial opacity-60" />
      <div className="absolute top-[-20%] left-[-10%] size-[55vmax] animate-aurora rounded-full bg-primary/25 blur-[120px]" />
      <div
        className="absolute right-[-15%] bottom-[-25%] size-[50vmax] animate-aurora rounded-full bg-rose/20 blur-[120px]"
        style={{ animationDelay: "-6s" }}
      />
      <div
        className="absolute top-[30%] left-[40%] size-[30vmax] animate-aurora rounded-full bg-saffron/15 blur-[120px]"
        style={{ animationDelay: "-12s" }}
      />
      <Starfield />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
}

/** A dotted flight trail that draws itself, with a bird gliding along it on loop. */
function FlightPath({ play }: { play: boolean }) {
  const motionRef = useRef<SVGAnimateMotionElement>(null);
  useEffect(() => {
    if (play) motionRef.current?.beginElement();
  }, [play]);
  const d = "M-80 760 C 260 640, 360 860, 640 600 S 1040 260, 1180 380 S 1420 220, 1560 60";
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 -z-[5] size-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="trail" x1="0" x2="1">
          <stop offset="0" style={{ stopColor: "var(--saffron)" }} stopOpacity="0" />
          <stop offset="0.4" style={{ stopColor: "var(--rose)" }} />
          <stop offset="1" style={{ stopColor: "var(--primary)" }} />
        </linearGradient>
        <linearGradient id="trail-bird" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" style={{ stopColor: "var(--saffron)" }} />
          <stop offset="0.5" style={{ stopColor: "var(--rose)" }} />
          <stop offset="1" style={{ stopColor: "var(--primary)" }} />
        </linearGradient>
      </defs>
      <motion.path
        id="flight"
        d={d}
        fill="none"
        stroke="url(#trail)"
        strokeWidth="2"
        strokeDasharray="2 10"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={play ? { pathLength: 1, opacity: 0.55 } : {}}
        transition={{ duration: 2.6, ease: "easeInOut" }}
      />
      <g>
        <g transform="translate(-24 -18) scale(0.75)" fill="url(#trail-bird)">
          <path d="M2 23C13 15 23 15 30 21C35 9 47 2 62 3C51 8 43 16 39 26C37 31 32 33 27 30C21 27 12 24 2 23Z" />
          <path opacity="0.55" d="M27 30L19 37L31 33Z" />
        </g>
        <animateMotion ref={motionRef} dur="11s" begin="indefinite" repeatCount="indefinite" rotate="auto" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1" keyPoints="0;1">
          <mpath href="#flight" />
        </animateMotion>
      </g>
    </svg>
  );
}

function OrbitVisual() {
  const modules = useModules();
  const inner = modules.slice(0, 3);
  const outer = modules.slice(3);
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[540px]">
      {/* Rings */}
      <div className="absolute inset-[6%] rounded-full border border-dashed border-line" />
      <div className="absolute inset-[24%] rounded-full border border-line" />
      <div className="absolute inset-[40%] rounded-full bg-[conic-gradient(from_0deg,var(--saffron),var(--rose),var(--primary),var(--teal),var(--saffron))] opacity-20 blur-2xl" />

      {/* Core */}
      <div className="absolute inset-[38%] grid place-items-center rounded-full glass shadow-[0_0_80px_-10px_var(--glow)]">
        <span className="absolute inset-0 animate-ping-slow rounded-full border border-primary/40" />
        <motion.div animate={{ y: [0, -6, 0], rotate: [0, -4, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
          <BirdMark className="w-[62%] min-w-14 mx-auto" />
        </motion.div>
      </div>

      <Ring items={inner} inset="24%" spin="animate-spin-rev" counter="animate-spin-slow" />
      <Ring items={outer} inset="6%" spin="animate-spin-slow" counter="animate-spin-rev" />

      {/* Floating status cards */}
      <FloatCard className="top-[4%] -left-[2%] sm:-left-[8%]" delay="0s" r="-4deg">
        <Zap className="size-4 text-saffron" />
        <span>
          Tutor matched <b className="text-fg">· 42s</b>
        </span>
      </FloatCard>
      <FloatCard className="right-[-2%] bottom-[16%] sm:right-[-6%]" delay="-2s" r="3deg">
        <Flame className="size-4 text-rose" />
        <span>
          Streak <b className="text-fg">12 days</b>
        </span>
      </FloatCard>
      <FloatCard className="bottom-[2%] left-[6%]" delay="-4s" r="-2deg">
        <Wallet className="size-4 text-teal" />
        <span>
          Wallet <b className="text-fg">+₹500</b>
        </span>
      </FloatCard>
    </div>
  );
}

function Ring({
  items,
  inset,
  spin,
  counter,
}: {
  items: ModuleDef[];
  inset: string;
  spin: string;
  counter: string;
}) {
  return (
    <div className={`absolute ${spin}`} style={{ inset }}>
      {items.map((m, i) => {
        const angle = (i / items.length) * Math.PI * 2 - Math.PI / 2;
        const left = 50 + Math.cos(angle) * 50;
        const top = 50 + Math.sin(angle) * 50;
        return (
          <div key={m.key} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${left}%`, top: `${top}%` }}>
            <div className={counter}>
              <div className="group relative">
                <span
                  className="grid size-12 place-items-center rounded-2xl text-white shadow-lg ring-1 ring-white/20 transition-transform duration-300 group-hover:scale-125 sm:size-14"
                  style={{
                    background: `linear-gradient(135deg, ${m.colors[0]}, ${m.colors[1]})`,
                    boxShadow: `0 12px 30px -8px ${m.colors[0]}88`,
                  }}
                >
                  <m.icon className="size-5 sm:size-6" />
                </span>
                <span className="glass pointer-events-none absolute top-full left-1/2 mt-2 -translate-x-1/2 rounded-lg px-2 py-1 text-[11px] font-semibold whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100">
                  {m.name}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FloatCard({ children, className, delay, r }: { children: React.ReactNode; className: string; delay: string; r: string }) {
  return (
    <div
      className={`glass absolute z-10 flex animate-float items-center gap-2 rounded-2xl px-3.5 py-2.5 text-xs text-muted shadow-xl sm:text-sm ${className}`}
      style={{ animationDelay: delay, ["--r" as string]: r }}
    >
      {children}
    </div>
  );
}
