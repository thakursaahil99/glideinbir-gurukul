"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { rpc } from "@/lib/rpc";
import { cn } from "@/lib/utils";
import type { DoubtView } from "../service";
import type { DoubtMessage, DoubtStatus } from "../types";

export function DoubtsTabs({ isTutor }: { isTutor: boolean }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/doubts", label: "Ask a doubt", active: pathname === "/doubts" },
    { href: "/doubts/history", label: "My doubts", active: pathname.startsWith("/doubts/history") },
    ...(isTutor ? [{ href: "/doubts/tutor", label: "Tutor desk", active: pathname.startsWith("/doubts/tutor") }] : []),
  ];
  return (
    <nav className="glass inline-flex rounded-2xl p-1" aria-label="Doubts sections">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.active ? "page" : undefined} className={cn("relative rounded-xl px-4 py-2 text-sm font-semibold transition-colors", t.active ? "text-white" : "text-muted hover:text-fg")}>
          {t.active && <motion.span layoutId="doubts-tab" className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#ffb800] to-[#ff5e3a]" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
          <span className="relative">{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}

const STATUS: Record<DoubtStatus, [string, string]> = {
  requested: ["Finding a tutor", "bg-saffron/15 text-saffron"],
  accepted: ["Tutor assigned", "bg-primary/15 text-primary"],
  in_progress: ["Live", "bg-teal/15 text-teal"],
  completed: ["Completed", "bg-fg/10 text-fg"],
  cancelled: ["Cancelled", "bg-fg/10 text-muted"],
  expired: ["Expired", "bg-rose/15 text-rose"],
};

export function StatusBadge({ status }: { status: DoubtStatus }) {
  const [label, cls] = STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold", cls)}>
      {status === "in_progress" && <span className="size-1.5 animate-pulse rounded-full bg-teal" />}
      {label}
    </span>
  );
}

/** Ticks once a second; returns "now" corrected for the device's clock skew. */
export function useNow(serverNow?: number) {
  const skew = useRef(serverNow ? serverNow - Date.now() : 0);
  const [now, setNow] = useState(() => Date.now() + skew.current);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + skew.current), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export const mmss = (sec: number) => `${Math.floor(Math.max(0, sec) / 60)}:${String(Math.floor(Math.max(0, sec) % 60)).padStart(2, "0")}`;

/**
 * Live state of one doubt: Server-Sent Events for instant updates, plus a slow
 * poll as a safety net (and an immediate re-read when a deadline passes, which
 * lets the server apply expiry / the session limit).
 */
export function useLiveDoubt(id: string, initial: { doubt: DoubtView; messages: DoubtMessage[] }) {
  const [doubt, setDoubt] = useState(initial.doubt);
  const [messages, setMessages] = useState(initial.messages);
  const [live, setLive] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await rpc("doubts.get", id);
      if (res.ok) {
        setDoubt(res.doubt);
        setMessages((m) => (res.messages.length >= m.length ? res.messages : m));
      }
    } catch {}
  }, [id]);

  useEffect(() => {
    const es = new EventSource(`/api/doubts/stream?doubt=${id}`);
    es.addEventListener("hello", () => {
      setLive(true);
      void refresh(); // catch anything missed while (re)connecting
    });
    es.addEventListener("doubt", (e) => setDoubt(JSON.parse((e as MessageEvent).data)));
    es.addEventListener("message", (e) => {
      const m = JSON.parse((e as MessageEvent).data) as DoubtMessage;
      setMessages((all) => (all.some((x) => x.id === m.id) ? all : [...all, m]));
    });
    es.onerror = () => setLive(false);
    const poll = setInterval(refresh, 10_000);
    return () => {
      es.close();
      clearInterval(poll);
    };
  }, [id, refresh]);

  return { doubt, messages, live, refresh, setDoubt };
}
