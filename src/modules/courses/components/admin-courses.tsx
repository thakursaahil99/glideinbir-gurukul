"use client";

import { Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Card, TextField } from "@/components/admin/fields";
import { cn, formatPaise } from "@/lib/utils";
import type { CourseStatus } from "../types";
import { rpc } from "@/lib/rpc";

export interface AdminCourseRow {
  id: string;
  slug: string;
  title: string;
  instructorName: string;
  status: CourseStatus;
  price: number;
  students: number;
  revenue: number;
  demo: boolean;
}

export function AdminCourses({ rows, commissionPercent }: { rows: AdminCourseRow[]; commissionPercent: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [pct, setPct] = useState(String(commissionPercent));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = (key: string, job: () => Promise<{ ok: boolean; error?: string }>, ok: string) => {
    setBusy(key);
    start(async () => {
      const res = await job();
      setMsg(res.ok ? { ok: true, text: ok } : { ok: false, text: res.error ?? "Failed" });
      setBusy(null);
      // New URL = reliable re-fetch (a same-URL refresh after an action could be dropped).
      if (res.ok) router.replace(`/admin/courses?updated=${Date.now()}`, { scroll: false });
    });
  };

  return (
    <div className="grid gap-5">
      {msg && <p role="status" className={cn("rounded-2xl border p-3 text-sm", msg.ok ? "border-teal/40 bg-teal/10" : "border-rose/40 bg-rose/10")}>{msg.text}</p>}

      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Platform commission" description="Taken from every paid course sale and credited to the platform account. Applies to new sales.">
          <TextField label="Commission (%)" type="number" min={0} max={90} value={pct} onChange={setPct} />
          <Button className="w-fit" disabled={pending} onClick={() => run("commission", () => rpc("admin.commission", Number(pct)), `Commission set to ${pct}%`)}>
            {busy === "commission" && <Loader2 className="size-4 animate-spin" />} Save
          </Button>
        </Card>
        <Card title="Demo courses" description="Adds 3 sample courses (one free, two paid) with short public test videos, owned by you. Each is labelled Demo; skips any already loaded.">
          <Button
            className="w-fit"
            disabled={pending}
            onClick={() =>
              run(
                "demo",
                async () => {
                  const r = await rpc("admin.loadDemo");
                  return { ok: r.ok, error: r.added ? undefined : "Demo courses are already loaded" };
                },
                "Demo courses added",
              )
            }
          >
            {busy === "demo" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Load demo courses
          </Button>
        </Card>
      </div>

      <Card title={`All courses (${rows.length})`}>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No courses yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs text-muted uppercase">
                <tr>
                  <th className="pb-3 font-semibold">Course</th>
                  <th className="pb-3 font-semibold">Instructor</th>
                  <th className="pb-3 font-semibold">Price</th>
                  <th className="pb-3 font-semibold">Students</th>
                  <th className="pb-3 font-semibold">Sales</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 pr-3">
                      <Link href={`/courses/${r.slug}`} className="font-semibold hover:underline">
                        {r.title}
                      </Link>
                      {r.demo && <span className="ml-2 rounded-full bg-saffron/15 px-1.5 py-0.5 text-[10px] font-bold text-saffron">Demo</span>}
                    </td>
                    <td className="py-3 text-muted">{r.instructorName}</td>
                    <td className="py-3">{r.price ? formatPaise(r.price) : "Free"}</td>
                    <td className="py-3 tabular-nums">{r.students}</td>
                    <td className="py-3 tabular-nums">{formatPaise(r.revenue)}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <label className="sr-only" htmlFor={`st-${r.id}`}>
                          Status of {r.title}
                        </label>
                        <select
                          id={`st-${r.id}`}
                          value={r.status}
                          disabled={pending}
                          onChange={(e) => run(r.id, () => rpc("admin.courseStatus", r.id, e.target.value), `${r.title} is now ${e.target.value}`)}
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
