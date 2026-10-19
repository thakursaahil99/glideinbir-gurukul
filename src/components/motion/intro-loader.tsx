"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, useSyncExternalStore } from "react";
import { BirdMark } from "@/components/brand/logo";

// Tiny store so the hero can wait for the intro curtain before animating in.
let introDone = false;
const listeners = new Set<() => void>();
function markIntroDone() {
  introDone = true;
  listeners.forEach((l) => l());
}
export function useIntroDone() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => introDone,
    () => false,
  );
}

const WORD = "GLIDEINBIR".split("");
const EASE = [0.76, 0, 0.24, 1] as const;

export function IntroLoader() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("gg-intro") === "1";
      sessionStorage.setItem("gg-intro", "1");
    } catch {}
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduced) {
      setShow(false);
      markIntroDone();
      return;
    }
    document.documentElement.style.overflow = "hidden";
    const t = setTimeout(() => {
      setShow(false);
      document.documentElement.style.overflow = "";
      setTimeout(markIntroDone, 350);
    }, 2300);
    return () => {
      clearTimeout(t);
      document.documentElement.style.overflow = "";
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="intro"
          className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-bg"
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          initial={{ clipPath: "inset(0 0 0% 0)" }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <div className="pointer-events-none absolute -top-1/3 left-1/2 size-[70vmax] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
          <div className="relative flex flex-col items-center">
            <motion.div
              initial={{ x: "-45vw", y: "18vh", rotate: -18, scale: 0.6, opacity: 0 }}
              animate={{ x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
                <BirdMark className="w-24 drop-shadow-[0_10px_40px_var(--glow)]" />
              </motion.div>
            </motion.div>
            <div className="mt-6 flex overflow-hidden font-display text-4xl font-bold tracking-[0.18em] sm:text-6xl">
              {WORD.map((ch, i) => (
                <motion.span
                  key={i}
                  initial={{ y: "110%" }}
                  animate={{ y: 0 }}
                  transition={{ delay: 0.55 + i * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="inline-block"
                >
                  {ch}
                </motion.span>
              ))}
            </div>
            <motion.div
              className="mt-4 h-px w-56 origin-left bg-gradient-to-r from-saffron via-rose to-primary"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 1.1, duration: 0.9, ease: EASE }}
            />
            <motion.p
              className="mt-4 text-xs font-semibold tracking-[0.5em] text-muted uppercase"
              initial={{ opacity: 0, letterSpacing: "0.2em" }}
              animate={{ opacity: 1, letterSpacing: "0.5em" }}
              transition={{ delay: 1.3, duration: 0.8 }}
            >
              Learn · Soar · Grow
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
