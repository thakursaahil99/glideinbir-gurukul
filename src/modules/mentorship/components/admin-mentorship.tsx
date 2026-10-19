"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, TextField } from "@/components/admin/fields";
import { rpc } from "@/lib/rpc";
import { cn } from "@/lib/utils";

export function MentorshipCommission({ percent }: { percent: number }) {
  const [pct, setPct] = useState(String(percent));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <Card title="Platform commission" description="Taken from each mentorship payout. Applies to new bookings; existing ones keep the rate they were booked at.">
      <TextField label="Commission (%)" type="number" min={0} max={90} value={pct} onChange={setPct} />
      {msg && <p className={cn("text-sm", msg.ok ? "text-teal" : "text-rose")}>{msg.text}</p>}
      <Button
        className="w-fit"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const res = await rpc("mentorshipAdmin.commission", Number(pct));
            setMsg(res.ok ? { ok: true, text: `Commission set to ${pct}%` } : { ok: false, text: res.error ?? "Failed" });
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy && <Loader2 className="size-4 animate-spin" />} Save
      </Button>
    </Card>
  );
}

/** Full refund for a booking that hasn't been paid out (e.g. the mentor didn't show up). */
export function RefundButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (!window.confirm("Cancel this session and refund the learner in full?")) return;
          setBusy(true);
          setErr(null);
          try {
            const res = await rpc("mentorshipAdmin.cancel", id);
            if (res.ok) router.replace(`/admin/mentorship?updated=${Date.now()}`);
            else setErr(res.error);
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Failed");
          }
          setBusy(false);
        }}
        className="rounded-lg px-2 py-1 text-xs font-semibold text-rose hover:bg-rose/10 disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : "Cancel & refund"}
      </button>
      {err && <span className="text-xs text-rose">{err}</span>}
    </span>
  );
}
