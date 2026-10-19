"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { VERDICT_INFO } from "../logic";
import type { Difficulty, Verdict } from "../types";

export const GRADIENT = "bg-gradient-to-r from-[#2ee6c5] to-[#5b47ff]";

export function CodeTabs({ canAuthor }: { canAuthor: boolean }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/code", label: "Problems", active: pathname === "/code" },
    { href: "/code/leaderboard", label: "Leaderboard", active: pathname.startsWith("/code/leaderboard") },
    ...(canAuthor ? [{ href: "/code/manage", label: "My problems", active: pathname.startsWith("/code/manage") }] : []),
  ];
  return (
    <nav className="glass inline-flex rounded-2xl p-1" aria-label="Coding sections">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.active ? "page" : undefined} className={cn("relative rounded-xl px-4 py-2 text-sm font-semibold transition-colors", t.active ? "text-white" : "text-muted hover:text-fg")}>
          {t.active && <motion.span layoutId="code-tab" className={cn("absolute inset-0 rounded-xl", GRADIENT)} transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
          <span className="relative">{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}

export const DIFF_STYLE: Record<Difficulty, string> = {
  easy: "text-teal",
  medium: "text-saffron",
  hard: "text-rose",
};

export function DifficultyBadge({ d, className }: { d: Difficulty; className?: string }) {
  return <span className={cn("text-xs font-bold capitalize", DIFF_STYLE[d], className)}>{d}</span>;
}

const TONE = { good: "bg-teal/15 text-teal", bad: "bg-rose/15 text-rose", warn: "bg-saffron/15 text-saffron" };
export function VerdictBadge({ v, short }: { v: Verdict; short?: boolean }) {
  const info = VERDICT_INFO[v];
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap", TONE[info.tone])}>{short ? info.short : info.label}</span>;
}

/* ---------------- Tiny markdown (no HTML, no innerHTML) ---------------- */

function inline(text: string, key: string): ReactNode[] {
  // `code`, **bold**, *italic*
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    const k = `${key}-${i}`;
    if (p.startsWith("`") && p.endsWith("`") && p.length > 1) return <code key={k} className="rounded-md bg-fg/[0.08] px-1.5 py-0.5 font-mono text-[0.85em]">{p.slice(1, -1)}</code>;
    if (p.startsWith("**") && p.endsWith("**") && p.length > 3) return <strong key={k}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <em key={k}>{p.slice(1, -1)}</em>;
    return <Fragment key={k}>{p}</Fragment>;
  });
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const key = `b${i}`;
    if (line.startsWith("```")) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith("```")) body.push(lines[i++]!);
      i++;
      out.push(
        <pre key={key} className="overflow-x-auto rounded-xl bg-fg/[0.06] p-3 font-mono text-[13px] leading-relaxed">
          {body.join("\n")}
        </pre>,
      );
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const size = h[1]!.length === 1 ? "text-xl" : h[1]!.length === 2 ? "text-lg" : "text-base";
      out.push(
        <p key={key} className={cn("mt-5 mb-1 font-display font-bold", size)}>
          {inline(h[2]!, key)}
        </p>,
      );
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i]!)) items.push(lines[i++]!.replace(/^\s*[-*]\s+/, ""));
      out.push(
        <ul key={key} className="my-2 list-disc space-y-1 pl-5">
          {items.map((it, j) => (
            <li key={j}>{inline(it, `${key}-${j}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    if (line.startsWith("> ")) {
      out.push(
        <p key={key} className="my-3 rounded-r-xl border-l-4 border-[#5b47ff] bg-[#5b47ff]/10 px-3 py-2 text-sm">
          {inline(line.slice(2), key)}
        </p>,
      );
      i++;
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !/^(#{1,3}\s|```|\s*[-*]\s|> )/.test(lines[i]!)) para.push(lines[i++]!);
    out.push(
      <p key={key} className="my-2 leading-relaxed">
        {inline(para.join(" "), key)}
      </p>,
    );
  }
  return <div className={cn("text-[15px]", className)}>{out}</div>;
}
