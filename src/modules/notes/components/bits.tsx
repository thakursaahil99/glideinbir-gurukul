"use client";

import { motion } from "framer-motion";
import { FileText, Star } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { coverColors } from "../logic";

export const GRADIENT = "bg-gradient-to-r from-[#00b89c] to-[#7ddc5a]";
export const INPUT = "w-full rounded-xl bg-fg/[0.05] px-3 py-2.5 text-sm ring-1 ring-line outline-none placeholder:text-muted focus:ring-[#00b89c]/70";

export function NotesTabs({ canSell }: { canSell: boolean }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/notes", label: "Marketplace", active: !pathname.startsWith("/notes/library") && !pathname.startsWith("/notes/sell") },
    { href: "/notes/library", label: "My library", active: pathname.startsWith("/notes/library") },
    { href: "/notes/sell", label: canSell ? "Seller hub" : "Sell notes", active: pathname.startsWith("/notes/sell") },
  ];
  return (
    <nav className="glass inline-flex rounded-2xl p-1" aria-label="Notes sections">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.active ? "page" : undefined} className={cn("relative rounded-xl px-4 py-2 text-sm font-semibold transition-colors", t.active ? "text-white" : "text-muted hover:text-fg")}>
          {t.active && <motion.span layoutId="notes-tab" className={cn("absolute inset-0 rounded-xl", GRADIENT)} transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
          <span className="relative">{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}

/**
 * A "stack of paper" cover: the vendor's image if there is one, otherwise a generated
 * design from the subject colours and title.
 */
export function NoteCover({ title, subject, pages, coverUrl, className, big, mini }: { title: string; subject: string; pages: number; coverUrl: string | null; className?: string; big?: boolean; mini?: boolean }) {
  const [a, b] = coverColors(subject);
  if (mini)
    return (
      <div aria-hidden className={cn("relative overflow-hidden rounded-lg shadow ring-1 ring-black/10", className)} style={coverUrl ? undefined : { backgroundImage: `linear-gradient(145deg, ${a}, ${b})` }}>
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="size-full object-cover" />
        ) : (
          <FileText className="absolute inset-0 m-auto size-5 text-white/80" />
        )}
      </div>
    );
  return (
    <div className={cn("relative", className)}>
      {/* Paper stack behind the cover */}
      <span className="absolute inset-0 translate-x-2 translate-y-2 rotate-2 rounded-2xl bg-fg/10" />
      <span className="absolute inset-0 translate-x-1 translate-y-1 rotate-1 rounded-2xl bg-fg/15" />
      <div className="relative h-full overflow-hidden rounded-2xl shadow-xl ring-1 ring-black/10" style={coverUrl ? undefined : { backgroundImage: `linear-gradient(145deg, ${a}, ${b})` }}>
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex h-full flex-col p-4 text-white">
            <span className="w-fit rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase backdrop-blur">{subject}</span>
            <p className={cn("mt-auto font-display leading-tight font-bold drop-shadow", big ? "line-clamp-5 text-2xl" : "line-clamp-4 text-base")}>{title}</p>
            <span className="mt-3 h-1 w-10 rounded-full bg-white/70" />
            {/* Ruled lines for the notebook feel */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[repeating-linear-gradient(transparent_0_22px,rgba(255,255,255,0.08)_22px_23px)]" />
          </div>
        )}
        <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
          <FileText className="size-3" /> {pages}p
        </span>
      </div>
    </div>
  );
}

export function Stars({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  return (
    <span className="inline-flex" aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn(size === "sm" ? "size-3.5" : "size-5", i <= Math.round(value) ? "fill-saffron text-saffron" : "text-fg/20")} />
      ))}
    </span>
  );
}

export function Notice({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <motion.p role="status" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className={cn("rounded-2xl border p-3 text-sm", msg.ok ? "border-teal/40 bg-teal/10" : "border-rose/40 bg-rose/10")}>
      {msg.text}
    </motion.p>
  );
}

/** PUT a file with upload progress (fetch can't report upload progress). */
export function uploadWithProgress(url: string, file: File, onProgress: (pct: number) => void): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, data });
    };
    xhr.onerror = () => resolve({ ok: false, data: { error: "Network error. Check your connection." } });
    xhr.send(file);
  });
}
