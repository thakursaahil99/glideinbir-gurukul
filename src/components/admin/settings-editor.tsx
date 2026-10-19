"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { rpc } from "@/lib/rpc";
import type { SiteContent } from "@/core/site/schema";
import { AreaField, Button, Card, TextField, Toggle } from "./fields";
import { SectionEditor } from "./section-editor";

export function BrandEditor({ initial }: { initial: SiteContent["brand"] }) {
  return (
    <SectionEditor section="brand" initial={initial}>
      {(v, set) => (
        <>
          <Card title="Brand" description="The name appears in the logo, page titles and footer.">
            <TextField label="Site name" hint="First word is the big logo word" value={v.name} onChange={(x) => set({ ...v, name: x })} maxLength={40} />
            <AreaField label="Footer blurb" value={v.footerBlurb} onChange={(x) => set({ ...v, footerBlurb: x })} rows={2} />
            <TextField label="Footer credit line" value={v.madeIn} onChange={(x) => set({ ...v, madeIn: x })} maxLength={60} />
          </Card>
          <Card title="Announcement bar" description="A coloured strip above the landing page menu.">
            <Toggle
              label={v.announcement.enabled ? "Showing" : "Hidden"}
              checked={v.announcement.enabled}
              onChange={(x) => set({ ...v, announcement: { ...v.announcement, enabled: x } })}
            />
            <TextField label="Text" value={v.announcement.text} onChange={(x) => set({ ...v, announcement: { ...v.announcement, text: x } })} maxLength={160} />
            <TextField
              label="Link"
              hint="e.g. /signup or https://…"
              value={v.announcement.href}
              onChange={(x) => set({ ...v, announcement: { ...v.announcement, href: x } })}
              maxLength={200}
            />
          </Card>
        </>
      )}
    </SectionEditor>
  );
}

export function PasswordForm() {
  const [v, setV] = useState({ current: "", next: "", confirm: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card title="Change your password">
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Current password" type="password" autoComplete="current-password" value={v.current} onChange={(x) => setV({ ...v, current: x })} />
        <TextField label="New password" type="password" autoComplete="new-password" value={v.next} onChange={(x) => setV({ ...v, next: x })} />
        <TextField label="Confirm new" type="password" autoComplete="new-password" value={v.confirm} onChange={(x) => setV({ ...v, confirm: x })} />
      </div>
      {msg && (
        <p role="status" className={msg.ok ? "text-sm text-teal" : "text-sm text-rose"}>
          {msg.text}
        </p>
      )}
      <Button
        className="w-fit"
        disabled={pending || !v.current || !v.next}
        onClick={() =>
          startTransition(async () => {
            const res = await rpc("admin.changePassword", v);
            setMsg(res.ok ? { ok: true, text: "Password changed." } : { ok: false, text: res.error ?? "Could not change password" });
            if (res.ok) setV({ current: "", next: "", confirm: "" });
          })
        }
      >
        {pending && <Loader2 className="size-4 animate-spin" />} Update password
      </Button>
    </Card>
  );
}
