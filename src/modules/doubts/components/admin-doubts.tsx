"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button, Card, TextField } from "@/components/admin/fields";
import { rpc } from "@/lib/rpc";
import { cn, formatPaise } from "@/lib/utils";

export function DoubtCommission({ percent }: { percent: number }) {
  const [pct, setPct] = useState(String(percent));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <Card title="Platform commission" description="Taken from each completed doubt session before paying the tutor.">
      <TextField label="Commission (%)" type="number" min={0} max={90} value={pct} onChange={setPct} />
      {msg && <p className={cn("text-sm", msg.ok ? "text-teal" : "text-rose")}>{msg.text}</p>}
      <Button
        className="w-fit"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const res = await rpc("doubtsAdmin.commission", Number(pct));
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

export const money = formatPaise;
