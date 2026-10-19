"use client";

import { motion } from "framer-motion";
import { ArrowRight, Mail } from "lucide-react";
import Link from "next/link";
import { BirdMark, Logo } from "@/components/brand/logo";
import { Magnetic } from "@/components/motion/effects";
import { useModules, useSite } from "@/core/site/site-context";

const FLOCK = [
  { x: 0, y: 0, s: 1 },
  { x: -46, y: 26, s: 0.8 },
  { x: -46, y: -26, s: 0.8 },
  { x: -90, y: 50, s: 0.62 },
  { x: -90, y: -50, s: 0.62 },
];

export function CTA() {
  const { cta } = useSite();
  return (
    <section id="join" className="relative py-28 sm:py-36">
      <div className="container-x">
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-[40px] p-[1.5px]"
        >
          {/* Rotating conic border */}
          <div className="absolute inset-[-100%] animate-spin-slow bg-[conic-gradient(from_0deg,var(--saffron),var(--rose),var(--primary),var(--teal),var(--saffron))]" />
          <div className="relative overflow-hidden rounded-[39px] bg-bg px-6 py-20 text-center sm:px-16 sm:py-28">
            <div className="absolute inset-0 bg-grid mask-radial opacity-50" />
            <div className="absolute top-1/2 left-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[120px]" />

            {/* Flock gliding across */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute top-[22%] left-0"
              initial={{ x: "-20vw" }}
              animate={{ x: "120vw", y: [0, -30, 10, -20, 0] }}
              transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
            >
              {FLOCK.map((b, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{ left: b.x, top: b.y, scale: b.s }}
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 1.2 + i * 0.2, repeat: Infinity }}
                >
                  <BirdMark className="w-12 opacity-80" />
                </motion.div>
              ))}
            </motion.div>

            <div className="relative">
              {cta.kicker && <p className="font-deva text-2xl text-muted sm:text-3xl">{cta.kicker}</p>}
              <h2 className="mx-auto mt-4 max-w-3xl font-display text-5xl leading-[0.95] font-extrabold tracking-tight sm:text-7xl">
                {cta.title} {cta.highlight && <span className="text-gradient animate-gradient">{cta.highlight}</span>}
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg text-muted">{cta.body}</p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Magnetic>
                  <Link
                    href="/signup"
                    className="group inline-flex items-center gap-2 rounded-2xl bg-fg px-8 py-4 font-semibold text-bg transition-shadow hover:shadow-[0_20px_60px_-10px_var(--glow)]"
                  >
                    {cta.primary}
                    <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Magnetic>
                <Link href="/dashboard" className="glass rounded-2xl px-6 py-4 font-semibold">
                  {cta.secondary}
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function Footer() {
  const { brand } = useSite();
  const modules = useModules();
  return (
    <footer className="relative border-t border-line pt-20 pb-10">
      <div className="container-x">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-5 max-w-xs text-sm text-muted">{brand.footerBlurb}</p>
            <form className="mt-6 flex max-w-sm gap-2" onSubmit={(e) => e.preventDefault()}>
              <label htmlFor="newsletter" className="sr-only">
                Email
              </label>
              <div className="glass flex flex-1 items-center gap-2 rounded-xl px-3">
                <Mail className="size-4 text-muted" />
                <input id="newsletter" type="email" placeholder="you@email.com" className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted" />
              </div>
              <button className="rounded-xl bg-gradient-to-r from-saffron to-rose px-4 text-sm font-semibold text-white">Notify me</button>
            </form>
          </div>
          <FooterCol title="Modules" links={modules.map((m) => ({ href: m.href, label: m.name }))} />
          <FooterCol
            title="Teach & earn"
            links={[
              { href: "/signup", label: "Become a tutor" },
              { href: "/signup", label: "Become a mentor" },
              { href: "/signup", label: "Sell notes" },
              { href: "/signup", label: "Hire talent" },
            ]}
          />
          <FooterCol
            title="Gurukul"
            links={[
              { href: "#journey", label: "How it works" },
              { href: "/dashboard", label: "Dashboard" },
              { href: "/admin", label: "Admin" },
              { href: "/login", label: "Log in" },
            ]}
          />
        </div>

        <div className="mt-20 overflow-hidden">
          <motion.p
            initial={{ y: "60%", opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-center font-display text-[17vw] leading-[0.8] font-black tracking-[-0.06em] text-fg/[0.06] select-none"
          >
            {brand.name.split(" ")[0]?.toUpperCase()}
          </motion.p>
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-line pt-8 text-xs text-muted sm:flex-row">
          <p>
            © {new Date().getFullYear()} {brand.name}. All rights reserved.
          </p>
          <p>{brand.madeIn}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="text-xs font-bold tracking-[0.25em] text-muted uppercase">{title}</p>
      <ul className="mt-5 space-y-3 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="group relative inline-block">
              {l.label}
              <span className="absolute -bottom-0.5 left-0 h-px w-full origin-right scale-x-0 bg-fg transition-transform duration-300 group-hover:origin-left group-hover:scale-x-100" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
