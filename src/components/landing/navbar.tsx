"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useSite } from "@/core/site/site-context";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#modules", label: "Modules" },
  { href: "#journey", label: "Journey" },
  { href: "#for-you", label: "For you" },
  { href: "#join", label: "Join" },
];

export function Navbar() {
  const { announcement } = useSite().brand;
  const showAnnouncement = announcement.enabled && announcement.text.length > 0;
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 24);
    setHidden(y > 400 && y > prev && !open);
  });

  return (
    <motion.header
      animate={{ y: hidden ? -110 : 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-3 z-50 px-3"
    >
      {showAnnouncement && (
        <Link
          href={announcement.href || "#"}
          className="mx-auto mb-2 flex max-w-6xl items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-saffron via-rose to-primary px-4 py-2 text-center text-xs font-semibold text-white sm:text-sm"
        >
          {announcement.text}
          {announcement.href && <ArrowRight className="size-3.5 shrink-0" />}
        </Link>
      )}
      <nav
        className={cn(
          "mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-3 py-2 transition-all duration-500 sm:px-4",
          scrolled ? "glass shadow-[0_10px_40px_-10px_rgba(0,0,0,0.35)]" : "border border-transparent",
        )}
      >
        <Logo />

        <ul className="hidden items-center md:flex" onMouseLeave={() => setHovered(null)}>
          {LINKS.map((l) => (
            <li key={l.href} className="relative">
              <a
                href={l.href}
                onMouseEnter={() => setHovered(l.href)}
                className="relative z-10 block px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-fg"
              >
                {l.label}
              </a>
              {hovered === l.href && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-xl bg-fg/[0.07]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="hidden px-3 text-sm font-medium text-muted hover:text-fg sm:block">
            Log in
          </Link>
          <Link
            href="/signup"
            className="group relative hidden items-center gap-1.5 overflow-hidden rounded-xl bg-fg px-4 py-2.5 text-sm font-semibold text-bg sm:inline-flex"
          >
            <span className="absolute inset-0 translate-y-full bg-gradient-to-r from-saffron via-rose to-primary transition-transform duration-500 group-hover:translate-y-0" />
            <span className="relative">Start soaring</span>
            <ArrowRight className="relative size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <button
            className="glass grid size-10 place-items-center rounded-full md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            className="glass mx-auto mt-2 max-w-6xl rounded-2xl p-3 md:hidden"
          >
            {LINKS.map((l, i) => (
              <motion.a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="block rounded-xl px-4 py-3 font-display text-lg font-semibold hover:bg-fg/5"
              >
                {l.label}
              </motion.a>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link href="/login" className="rounded-xl border border-line py-3 text-center text-sm font-semibold">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-xl bg-gradient-to-r from-saffron via-rose to-primary py-3 text-center text-sm font-semibold text-white"
              >
                Sign up
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
