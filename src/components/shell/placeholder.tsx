"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { BirdMark } from "@/components/brand/logo";
import type { ModuleKey } from "@/core/module-registry";
import { useModule } from "@/core/site/site-context";

/** Under-construction screen for a module until its build phase lands. */
export function ModulePlaceholder({ moduleKey }: { moduleKey: ModuleKey }) {
  const m = useModule(moduleKey);
  const grad = `linear-gradient(135deg, ${m.colors[0]}, ${m.colors[1]})`;
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Dashboard
      </Link>
      <div className="glass relative mt-4 overflow-hidden rounded-[32px] p-8 sm:p-12">
        <div aria-hidden className="absolute -top-32 -right-32 size-96 animate-aurora rounded-full opacity-30 blur-3xl" style={{ background: grad }} />
        <motion.span
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          className="relative grid size-16 place-items-center rounded-3xl text-white shadow-xl"
          style={{ background: grad }}
        >
          <m.icon className="size-8" />
        </motion.span>
        <p className="relative mt-6 flex items-center gap-2 text-xs font-bold tracking-[0.25em] text-muted uppercase">
          {!m.enabled && <Lock className="size-3.5" />} {m.style} · Phase {m.phase}
        </p>
        <h1 className="relative mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">{m.name}</h1>
        <p className="relative mt-3 max-w-xl text-lg text-muted">{m.description}</p>

        <ul className="relative mt-8 flex flex-wrap gap-2">
          {m.features.map((f, i) => (
            <motion.li
              key={f}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.06 }}
              className="rounded-full border border-line bg-fg/[0.03] px-3.5 py-1.5 text-sm"
            >
              {f}
            </motion.li>
          ))}
        </ul>

        <div className="relative mt-10 flex items-center gap-4 rounded-2xl border border-dashed border-line p-5">
          <motion.div animate={{ x: [0, 8, 0], y: [0, -4, 0] }} transition={{ duration: 3, repeat: Infinity }}>
            <BirdMark className="w-10" />
          </motion.div>
          <p className="text-sm text-muted">
            {m.enabled
              ? `This module is next in line. It gets built in Phase ${m.phase}.`
              : `Coming soon. This module unlocks in Phase ${m.phase}.`}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Generic empty state for core pages that arrive in Phase 1. */
export function CorePlaceholder({ title, body, icon }: { title: string; body: string; icon: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass flex flex-col items-center rounded-[32px] px-6 py-16 text-center"
      >
        <span className="grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-saffron via-rose to-primary text-white">{icon}</span>
        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-md text-muted">{body}</p>
        <p className="mt-6 rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted">Arrives in Phase 1 · Core</p>
      </motion.div>
    </div>
  );
}
