"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { STAGE_LABEL } from "../logic";
import type { Stage } from "../types";

export const GRADIENT = "bg-gradient-to-r from-[#3d8bff] to-[#2ee6c5]";
export const INPUT = "w-full rounded-xl bg-fg/[0.05] px-3 py-2.5 text-sm ring-1 ring-line outline-none placeholder:text-muted focus:ring-[#3d8bff]/70";

export function JobsTabs({ isRecruiter }: { isRecruiter: boolean }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/jobs", label: "Find jobs", active: pathname === "/jobs" || /^\/jobs\/[0-9a-f-]{36}$/.test(pathname) },
    { href: "/jobs/applications", label: "My applications", active: pathname.startsWith("/jobs/applications") },
    { href: "/jobs/profile", label: "Profile", active: pathname.startsWith("/jobs/profile") },
    { href: "/jobs/recruit", label: isRecruiter ? "Recruiter hub" : "Hire", active: pathname.startsWith("/jobs/recruit") },
  ];
  return (
    <nav className="glass inline-flex max-w-full overflow-x-auto rounded-2xl p-1 [scrollbar-width:none]" aria-label="Jobs sections">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.active ? "page" : undefined} className={cn("relative shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-colors", t.active ? "text-white" : "text-muted hover:text-fg")}>
          {t.active && <motion.span layoutId="jobs-tab" className={cn("absolute inset-0 rounded-xl", GRADIENT)} transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
          <span className="relative">{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}

/** Company initials on a colour picked from the name (no uploaded logos needed). */
const PALETTES = [
  ["#3d8bff", "#2ee6c5"],
  ["#5b47ff", "#00c2ff"],
  ["#ff8a00", "#ff4d6d"],
  ["#00b89c", "#7ddc5a"],
  ["#c04dff", "#ff4da6"],
  ["#ffb800", "#ff5e3a"],
];
export function CompanyMark({ name, logo, size = "md" }: { name: string; logo?: string | null; size?: "sm" | "md" | "lg" }) {
  const box = size === "sm" ? "size-10 rounded-xl text-sm" : size === "md" ? "size-12 rounded-2xl text-base" : "size-16 rounded-2xl text-xl";
  if (logo)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logo} alt="" loading="lazy" referrerPolicy="no-referrer" className={cn("shrink-0 bg-white object-contain p-1", box)} />
    );
  const [a, b] = PALETTES[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % PALETTES.length]!;
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center font-display font-bold text-white", box)} style={{ backgroundImage: `linear-gradient(135deg, ${a}, ${b})` }}>
      {name
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join("")}
    </span>
  );
}

/** Circular skill-match meter. */
export function MatchRing({ score, size = 52 }: { score: number | null; size?: number }) {
  if (score === null) return null;
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  const color = score >= 70 ? "#2ee6c5" : score >= 40 ? "#ffb800" : "#ff4d6d";
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} title={`${score}% skill match`}>
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth="5" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - score / 100) }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
      </svg>
      <span className="relative text-[11px] font-bold tabular-nums" style={{ color }}>
        {score}%
      </span>
    </span>
  );
}

const STAGE_STYLE: Record<Stage, string> = {
  applied: "bg-[#3d8bff]/15 text-[#6aa6ff]",
  shortlisted: "bg-saffron/15 text-saffron",
  interview: "bg-[#c04dff]/15 text-[#d17aff]",
  hired: "bg-teal/15 text-teal",
  rejected: "bg-fg/10 text-muted",
};
export function StageBadge({ stage, withdrawn }: { stage: Stage; withdrawn?: boolean }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap", withdrawn ? "bg-fg/10 text-muted" : STAGE_STYLE[stage])}>{withdrawn ? "Withdrawn" : STAGE_LABEL[stage]}</span>;
}

export function Notice({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <motion.p role="status" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className={cn("rounded-2xl border p-3 text-sm", msg.ok ? "border-teal/40 bg-teal/10" : "border-rose/40 bg-rose/10")}>
      {msg.text}
    </motion.p>
  );
}

export function ago(iso: string, now: number) {
  const d = Math.max(0, Math.floor((now - Date.parse(iso)) / 86_400_000));
  return d === 0 ? "Today" : d === 1 ? "Yesterday" : d < 30 ? `${d} days ago` : `${Math.floor(d / 30)} mo ago`;
}

/** Comma/Enter separated skill chips. */
export function SkillInput({ value, onChange, placeholder, suggestions = [] }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; suggestions?: string[] }) {
  const add = (raw: string) => {
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && s.length <= 30 && !value.some((v) => v.toLowerCase() === s.toLowerCase()));
    if (parts.length) onChange([...value, ...parts].slice(0, 20));
  };
  const open = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase())).slice(0, 10);
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {value.map((s) => (
          <span key={s} className="flex items-center gap-1 rounded-lg bg-[#3d8bff]/15 py-1 pr-1 pl-2.5 text-xs font-semibold text-[#8ab8ff]">
            {s}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== s))} aria-label={`Remove ${s}`} className="grid size-4 place-items-center rounded hover:bg-fg/10">
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        aria-label="Add a skill"
        placeholder={placeholder ?? "Type a skill and press Enter"}
        className={cn(INPUT, "mt-2")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(e.currentTarget.value);
            e.currentTarget.value = "";
          }
        }}
        onBlur={(e) => {
          add(e.currentTarget.value);
          e.currentTarget.value = "";
        }}
      />
      {open.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {open.map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="rounded-lg px-2 py-0.5 text-xs text-muted ring-1 ring-line hover:text-fg">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
