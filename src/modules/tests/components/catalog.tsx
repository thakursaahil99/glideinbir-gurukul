"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { EXAMS } from "../types";
import { TestCard, type TestCardData } from "./bits";

export function TestFilters({ total }: { total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(sp.get("q") ?? "");

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    start(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  useEffect(() => {
    if ((sp.get("q") ?? "") === q) return;
    const t = setTimeout(() => set("q", q.trim() || null), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="glass flex min-w-64 flex-1 items-center gap-2 rounded-2xl px-4 py-3">
          <Search className="size-5 text-muted" />
          <span className="sr-only">Search tests</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search mock tests…" className="w-full bg-transparent outline-none placeholder:text-muted" />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="text-muted hover:text-fg">
              <X className="size-4" />
            </button>
          )}
        </label>
        <label className="sr-only" htmlFor="price">
          Price
        </label>
        <select id="price" value={sp.get("price") ?? ""} onChange={(e) => set("price", e.target.value || null)} className="glass rounded-2xl px-4 py-3 text-sm font-semibold">
          <option value="">Free & paid</option>
          <option value="free">Free only</option>
          <option value="paid">Paid only</option>
        </select>
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {[null, ...EXAMS].map((e) => {
          const on = (sp.get("exam") ?? null) === e;
          return (
            <button
              key={e ?? "all"}
              type="button"
              aria-pressed={on}
              onClick={() => set("exam", on ? null : e)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                on ? "border-transparent bg-fg text-bg" : "border-line text-muted hover:bg-fg/5 hover:text-fg",
              )}
            >
              {e ?? "All exams"}
            </button>
          );
        })}
      </div>
      <p className={cn("text-sm text-muted transition-opacity", pending && "opacity-50")} aria-live="polite">
        {total} test{total === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export function TestGrid({ items, empty }: { items: TestCardData[]; empty: string }) {
  if (!items.length)
    return (
      <div className="glass rounded-[28px] px-6 py-16 text-center">
        <p className="font-display text-2xl font-bold">No tests here</p>
        <p className="mt-2 text-muted">{empty}</p>
      </div>
    );
  return (
    <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((t, i) => (
        <TestCard key={t.id} t={t} index={i} />
      ))}
    </ul>
  );
}
