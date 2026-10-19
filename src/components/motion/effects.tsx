"use client";

import { motion, useMotionValue, useScroll, useSpring, type HTMLMotionProps } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Gradient bar at the top of the page that tracks scroll progress. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.3 });
  return (
    <motion.div
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[70] h-[3px] origin-left bg-gradient-to-r from-saffron via-rose to-primary"
    />
  );
}

/** Soft glow that trails the cursor (mouse/trackpad only). */
export function CursorGlow() {
  const x = useMotionValue(-500);
  const y = useMotionValue(-500);
  const sx = useSpring(x, { stiffness: 140, damping: 20 });
  const sy = useSpring(y, { stiffness: 140, damping: 20 });
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!matchMedia("(pointer: fine)").matches) return;
    setEnabled(true);
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [x, y]);

  if (!enabled) return null;
  return (
    <motion.div
      aria-hidden
      style={{ x: sx, y: sy }}
      className="pointer-events-none fixed top-0 left-0 z-0 -ml-[300px] -mt-[300px] size-[600px] rounded-full bg-[radial-gradient(circle,var(--glow),transparent_65%)] opacity-70"
    />
  );
}

/** Element that leans toward the cursor, then springs back. */
export function Magnetic({
  children,
  strength = 0.35,
  className,
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(0, { stiffness: 200, damping: 14, mass: 0.4 });
  const y = useSpring(0, { stiffness: 200, damping: 14, mass: 0.4 });
  return (
    <motion.div
      ref={ref}
      style={{ x, y }}
      className={cn("inline-block", className)}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * strength);
        y.set((e.clientY - r.top - r.height / 2) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/** Fade + rise into view once. */
export function Reveal({ delay = 0, className, children, ...rest }: HTMLMotionProps<"div"> & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 36, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Section eyebrow + headline with a word-by-word reveal. */
export function SectionHeading({
  eyebrow,
  title,
  sub,
  className,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  className?: string;
  align?: "center" | "left";
}) {
  const words = title.split(" ");
  return (
    <div className={cn(align === "center" ? "mx-auto text-center" : "", "max-w-3xl", className)}>
      <Reveal>
        <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-[0.2em] text-muted uppercase">
          <span className="size-1.5 rounded-full bg-gradient-to-r from-saffron to-rose" />
          {eyebrow}
        </span>
      </Reveal>
      <h2 className="mt-5 font-display text-4xl leading-[1.02] font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
        {words.map((w, i) => (
          <span key={i} className="inline-block overflow-hidden pb-1 align-bottom">
            <motion.span
              className="inline-block"
              initial={{ y: "105%" }}
              whileInView={{ y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            >
              {w}&nbsp;
            </motion.span>
          </span>
        ))}
      </h2>
      {sub && (
        <Reveal delay={0.2}>
          <p className="mt-5 text-lg text-pretty text-muted">{sub}</p>
        </Reveal>
      )}
    </div>
  );
}
