"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Building2, GraduationCap, Presentation, Store, Users, Zap } from "lucide-react";
import { useState } from "react";
import { SectionHeading } from "@/components/motion/effects";
import { useSite } from "@/core/site/site-context";
import { cn } from "@/lib/utils";

/** Icon and colours per role position; the words come from the admin panel. */
const ROLE_STYLE = [
  { icon: GraduationCap, colors: ["#ff8a00", "#ff4d6d"] },
  { icon: Zap, colors: ["#ffb800", "#ff5e3a"] },
  { icon: Presentation, colors: ["#5b47ff", "#00c2ff"] },
  { icon: Users, colors: ["#c04dff", "#ff4da6"] },
  { icon: Store, colors: ["#00b89c", "#7ddc5a"] },
  { icon: Building2, colors: ["#3d8bff", "#2ee6c5"] },
];

export function Personas() {
  const { personas } = useSite();
  const roles = personas.roles.map((r, i) => ({ ...r, ...ROLE_STYLE[i % ROLE_STYLE.length] }));
  const [active, setActive] = useState(0);
  return (
    <section id="for-you" className="relative py-28 sm:py-36">
      <div className="container-x">
        <SectionHeading eyebrow={personas.eyebrow} title={personas.title} sub={personas.sub} />

        <div className="mt-16 flex flex-col gap-3 lg:h-[440px] lg:flex-row">
          {roles.map((r, i) => {
            const on = i === active;
            const grad = `linear-gradient(160deg, ${r.colors[0]}, ${r.colors[1]})`;
            return (
              <motion.button
                key={r.role}
                layout
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                aria-expanded={on}
                transition={{ layout: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }}
                className={cn(
                  "relative overflow-hidden rounded-[28px] text-left ring-1 ring-line",
                  on ? "lg:flex-[4]" : "glass lg:flex-1",
                )}
                style={on ? { background: grad } : undefined}
              >
                <motion.div layout="position" className={cn("flex h-full flex-col p-6", on ? "text-white" : "")}>
                  <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl", on ? "bg-white/20" : "")} style={on ? undefined : { background: grad }}>
                    <r.icon className="size-6 text-white" />
                  </span>
                  <span
                    className={cn(
                      "mt-4 font-display text-2xl font-bold tracking-tight whitespace-nowrap",
                      !on && "lg:mt-auto lg:[writing-mode:vertical-rl] lg:rotate-180",
                    )}
                  >
                    {r.role}
                  </span>
                  <AnimatePresence>
                    {on && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0, transition: { delay: 0.25 } }}
                        exit={{ opacity: 0 }}
                        className="mt-auto pt-6"
                      >
                        <p className="font-display text-3xl leading-tight font-bold sm:text-4xl">{r.line}</p>
                        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                          {r.perks.map((p, j) => (
                            <motion.li
                              key={p}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0, transition: { delay: 0.35 + j * 0.06 } }}
                              className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-sm font-medium backdrop-blur"
                            >
                              <span className="size-1.5 rounded-full bg-white" />
                              {p}
                            </motion.li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
