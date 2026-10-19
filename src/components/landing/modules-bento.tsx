"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { SectionHeading } from "@/components/motion/effects";
import type { ModuleDef } from "@/core/module-registry";
import { useModules, useSite } from "@/core/site/site-context";
import { cn } from "@/lib/utils";
import { ModuleVisual } from "./module-visuals";

const LAYOUT: Record<string, string> = {
  courses: "lg:col-span-2 lg:row-span-2",
  doubts: "lg:col-span-2",
  tests: "lg:col-span-1",
  notes: "lg:col-span-1",
  mentorship: "lg:col-span-1",
  code: "lg:col-span-2",
  jobs: "lg:col-span-1",
};

export function ModulesBento() {
  const { modulesSection } = useSite();
  const modules = useModules();
  return (
    <section id="modules" className="relative py-28 sm:py-36">
      <div className="container-x">
        <SectionHeading eyebrow={modulesSection.eyebrow} title={modulesSection.title} sub={modulesSection.sub} />
        <div className="mt-16 grid auto-rows-[minmax(250px,auto)] gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((m, i) => (
            <TiltCard key={m.key} m={m} index={i} className={LAYOUT[m.key]} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TiltCard({ m, index, className }: { m: ModuleDef; index: number; className?: string }) {
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const px = useMotionValue(-400);
  const py = useMotionValue(-400);
  const rx = useSpring(useTransform(my, [0, 1], [6, -6]), { stiffness: 180, damping: 18 });
  const ry = useSpring(useTransform(mx, [0, 1], [-8, 8]), { stiffness: 180, damping: 18 });
  const spotlight = useMotionTemplate`radial-gradient(420px circle at ${px}px ${py}px, ${m.colors[0]}2e, transparent 65%)`;
  const big = m.key === "courses";

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.8, delay: (index % 4) * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className={cn("[perspective:1200px]", className)}
    >
      <motion.div
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          mx.set((e.clientX - r.left) / r.width);
          my.set((e.clientY - r.top) / r.height);
          px.set(e.clientX - r.left);
          py.set(e.clientY - r.top);
        }}
        onPointerLeave={() => {
          mx.set(0.5);
          my.set(0.5);
          px.set(-400);
          py.set(-400);
        }}
        className="glass group relative flex h-full flex-col overflow-hidden rounded-[28px] p-6 sm:p-7"
      >
        <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: spotlight }} />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 size-56 rounded-full opacity-25 blur-3xl transition-opacity duration-500 group-hover:opacity-50"
          style={{ background: `linear-gradient(135deg, ${m.colors[0]}, ${m.colors[1]})` }}
        />

        <div className="relative flex items-start justify-between gap-4" style={{ transform: "translateZ(30px)" }}>
          <span
            className="grid size-12 place-items-center rounded-2xl text-white shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6"
            style={{ background: `linear-gradient(135deg, ${m.colors[0]}, ${m.colors[1]})`, boxShadow: `0 14px 30px -10px ${m.colors[0]}` }}
          >
            <m.icon className="size-6" />
          </span>
          <span className="rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold text-muted">
            {m.enabled ? m.style : "Coming soon"}
          </span>
        </div>

        <div className="relative mt-5" style={{ transform: "translateZ(20px)" }}>
          <h3 className={cn("font-display font-bold tracking-tight", big ? "text-3xl sm:text-4xl" : "text-2xl")}>{m.name}</h3>
          <p className="mt-2 text-sm text-muted sm:text-base">{big ? m.description : m.tagline}</p>
        </div>

        <div className="relative mt-auto pt-6" style={{ transform: "translateZ(40px)" }}>
          <ModuleVisual k={m.key} colors={m.colors} />
        </div>

        <Link
          href={m.href}
          aria-label={`Open ${m.name}`}
          className="absolute right-5 bottom-5 z-10 grid size-10 translate-y-3 place-items-center rounded-full bg-fg text-bg opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100"
        >
          <ArrowUpRight className="size-5" />
        </Link>
      </motion.div>
    </motion.div>
  );
}
