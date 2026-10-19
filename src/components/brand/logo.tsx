"use client";

import Link from "next/link";
import { useSite } from "@/core/site/site-context";
import { cn } from "@/lib/utils";

/** The gliding-bird mark. Pure SVG so it can be animated anywhere. */
export function BirdMark({ className, mono = false }: { className?: string; mono?: boolean }) {
  return (
    <svg viewBox="0 0 64 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="gg-bird" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" style={{ stopColor: "var(--saffron)" }} />
          <stop offset="50%" style={{ stopColor: "var(--rose)" }} />
          <stop offset="100%" style={{ stopColor: "var(--primary)" }} />
        </linearGradient>
      </defs>
      <path
        fill={mono ? "currentColor" : "url(#gg-bird)"}
        d="M2 23C13 15 23 15 30 21C35 9 47 2 62 3C51 8 43 16 39 26C37 31 32 33 27 30C21 27 12 24 2 23Z"
      />
      <path fill={mono ? "currentColor" : "url(#gg-bird)"} opacity="0.55" d="M27 30L19 37L31 33Z" />
    </svg>
  );
}

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  const { name } = useSite().brand;
  const [first, ...rest] = name.split(" ");
  return (
    <Link href={href} className={cn("group flex items-center gap-2.5", className)} aria-label={`${name} home`}>
      <span className="relative grid size-10 place-items-center rounded-2xl bg-fg/5 ring-1 ring-line transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110">
        <BirdMark className="w-7" />
      </span>
      <span className="leading-none">
        <span className="block font-display text-lg font-bold tracking-tight">{first}</span>
        {rest.length > 0 && <span className="block text-[10px] font-semibold tracking-[0.32em] text-muted uppercase">{rest.join(" ")}</span>}
      </span>
    </Link>
  );
}
