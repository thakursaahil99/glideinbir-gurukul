"use client";

import { motion } from "framer-motion";
import { ArrowRight, Download, Library as LibraryIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { rpc } from "@/lib/rpc";
import { cn, formatPaise } from "@/lib/utils";
import type { NoteCard } from "../queries";
import { GRADIENT, NoteCover, Notice } from "./bits";

type Item = NoteCard & { purchasedAt: string; paid: number };

export function Library({ items }: { items: Item[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!items.length)
    return (
      <div className="glass rounded-[28px] p-12 text-center">
        <motion.span animate={{ rotate: [0, -6, 6, 0] }} transition={{ duration: 2.6, repeat: Infinity }} className={cn("mx-auto grid size-16 place-items-center rounded-3xl text-white", GRADIENT)}>
          <LibraryIcon className="size-7" />
        </motion.span>
        <p className="mt-4 font-display text-xl font-bold">Your library is empty</p>
        <p className="mt-1 text-sm text-muted">Notes you buy or grab for free live here, ready to download.</p>
        <Link href="/notes" className={cn("mt-5 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white", GRADIENT)}>
          Browse notes <ArrowRight className="size-4" />
        </Link>
      </div>
    );

  return (
    <div className="space-y-4">
      <Notice msg={msg} />
      <ul className="grid gap-4 sm:grid-cols-2">
        {items.map((n, i) => (
          <motion.li key={n.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }} className="glass flex gap-4 rounded-[24px] p-4">
            <Link href={`/notes/${n.id}`} className="w-24 shrink-0">
              <NoteCover title={n.title} subject={n.subject} pages={n.pages} coverUrl={n.coverUrl} className="aspect-[3/4]" />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <Link href={`/notes/${n.id}`} className="line-clamp-2 font-semibold hover:text-[#2ee6c5]">
                {n.title}
              </Link>
              <p className="mt-0.5 text-xs text-muted">
                {n.vendorName} · {n.pages} pages · {n.paid ? formatPaise(n.paid) : "Free"}
              </p>
              <p className="text-xs text-muted">Added {new Date(n.purchasedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
              <button
                type="button"
                disabled={!!busy}
                onClick={async () => {
                  setBusy(n.id);
                  setMsg(null);
                  try {
                    const res = await rpc("notes.download", n.id);
                    if (res.ok) window.location.href = res.url;
                    else setMsg({ ok: false, text: res.error });
                  } catch (e) {
                    setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong" });
                  }
                  setBusy(null);
                }}
                className={cn("mt-auto flex w-fit items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60", GRADIENT)}
              >
                {busy === n.id ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Download
              </button>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
