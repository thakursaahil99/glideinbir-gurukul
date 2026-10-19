"use client";

import { Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, TextField } from "@/components/admin/fields";
import { rpc } from "@/lib/rpc";
import { cn, formatPaise } from "@/lib/utils";
import type { TestStatus } from "../types";

export interface AdminTestRow {
  id: string;
  slug: string;
  title: string;
  instructorName: string;
  status: TestStatus;
  price: number;
  questions: number;
  attempts: number;
  revenue: number;
  demo: boolean;
}

export function AdminTests({ rows, commissionPercent }: { rows: AdminTestRow[]; commissionPercent: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [pct, setPct] = useState(String(commissionPercent));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async (key: string, job: () => Promise<{ ok: boolean; error?: string }>, ok: string) => {
    setBusy(key);
    try {
      const res = await job();
      setMsg(res.ok ? { ok: true, text: ok } : { ok: false, text: res.error ?? "Failed" });
      // New URL = reliable re-fetch of the table.
      if (res.ok) router.replace(`/admin/tests?updated=${Date.now()}`, { scroll: false });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Failed" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-5">
      {msg && <p role="status" className={cn("rounded-2xl border p-3 text-sm", msg.ok ? "border-teal/40 bg-teal/10" : "border-rose/40 bg-rose/10")}>{msg.text}</p>}
      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Platform commission" description="Taken from every paid test sale. Applies to new sales.">
          <TextField label="Commission (%)" type="number" min={0} max={90} value={pct} onChange={setPct} />
          <Button className="w-fit" disabled={!!busy} onClick={() => run("commission", () => rpc("testsAdmin.commission", Number(pct)), `Commission set to ${pct}%`)}>
            {busy === "commission" && <Loader2 className="size-4 animate-spin" />} Save
          </Button>
        </Card>
        <Card title="Demo tests" description="Adds a free JEE mini mock and a paid SSC reasoning test (₹49), owned by you and labelled Demo. Skips any already loaded.">
          <Button className="w-fit" disabled={!!busy} onClick={() => run("demo", () => rpc("testsAdmin.loadDemo"), "Demo tests added")}>
            {busy === "demo" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Load demo tests
          </Button>
        </Card>
      </div>
      <Card title={`All tests (${rows.length})`}>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No tests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs text-muted uppercase">
                <tr>
                  <th className="pb-3 font-semibold">Test</th>
                  <th className="pb-3 font-semibold">Instructor</th>
                  <th className="pb-3 font-semibold">Price</th>
                  <th className="pb-3 font-semibold">Questions</th>
                  <th className="pb-3 font-semibold">Attempts</th>
                  <th className="pb-3 font-semibold">Sales</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 pr-3">
                      <Link href={`/tests/${r.slug}`} className="font-semibold hover:underline">
                        {r.title}
                      </Link>
                      {r.demo && <span className="ml-2 rounded-full bg-saffron/15 px-1.5 py-0.5 text-[10px] font-bold text-saffron">Demo</span>}
                    </td>
                    <td className="py-3 text-muted">{r.instructorName}</td>
                    <td className="py-3">{r.price ? formatPaise(r.price) : "Free"}</td>
                    <td className="py-3 tabular-nums">{r.questions}</td>
                    <td className="py-3 tabular-nums">{r.attempts}</td>
                    <td className="py-3 tabular-nums">{formatPaise(r.revenue)}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <label className="sr-only" htmlFor={`ts-${r.id}`}>
                          Status of {r.title}
                        </label>
                        <select
                          id={`ts-${r.id}`}
                          value={r.status}
                          disabled={!!busy}
                          onChange={(e) => run(r.id, () => rpc("testsAdmin.status", r.id, e.target.value), `${r.title} is now ${e.target.value}`)}
                          className="rounded-lg border border-line bg-card px-2 py-1.5 text-xs capitalize"
                        >
                          {["published", "draft", "archived"].map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        {busy === r.id && <Loader2 className="size-4 animate-spin text-muted" />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
