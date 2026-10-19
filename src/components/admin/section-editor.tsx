"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, RotateCcw, Save } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { DEFAULT_SITE } from "@/core/site/defaults";
import type { SiteContent, SiteSection } from "@/core/site/schema";
import { rpc } from "@/lib/rpc";
import { Button } from "./fields";

/**
 * Holds one site section in local state, with a sticky save bar.
 * Children get the current value and a setter; the server validates on save.
 */
export function SectionEditor<K extends SiteSection>({
  section,
  initial,
  children,
}: {
  section: K;
  initial: SiteContent[K];
  children: (value: SiteContent[K], set: (next: SiteContent[K]) => void) => React.ReactNode;
}) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [version, setVersion] = useState(0);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const dirty = JSON.stringify(value) !== JSON.stringify(saved);

  useEffect(() => {
    if (status?.kind !== "ok") return;
    const t = setTimeout(() => setStatus(null), 2500);
    return () => clearTimeout(t);
  }, [status]);

  const save = () =>
    startTransition(async () => {
      const res = await rpc("admin.saveSection", section, value);
      if (res.ok) {
        setSaved(value);
        setStatus({ kind: "ok", text: "Saved. Live on the site now." });
      } else setStatus({ kind: "error", text: res.error ?? "Could not save" });
    });

  const reset = () => {
    if (!confirm("Reset this section to the original content? Your edits here will be lost.")) return;
    startTransition(async () => {
      const res = await rpc("admin.resetSection", section);
      if (res.ok) {
        setValue(DEFAULT_SITE[section]);
        setSaved(DEFAULT_SITE[section]);
        // Remount uncontrolled list editors so they show the restored text.
        setVersion((v) => v + 1);
        setStatus({ kind: "ok", text: "Restored to defaults." });
      } else setStatus({ kind: "error", text: res.error ?? "Could not reset" });
    });
  };

  return (
    <div className="pb-24">
      <div key={version} className="grid gap-5">
        {children(value, setValue)}
      </div>

      <div className="fixed inset-x-3 bottom-3 z-30 lg:left-[300px]">
        <div className="glass mx-auto flex max-w-5xl flex-wrap items-center gap-3 rounded-2xl px-4 py-3 shadow-xl">
          <AnimatePresence mode="wait">
            <motion.p
              key={status?.text ?? (dirty ? "dirty" : "clean")}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="status"
              className={`flex flex-1 items-center gap-2 text-sm ${status?.kind === "error" ? "text-rose" : "text-muted"}`}
            >
              {status?.kind === "ok" && <Check className="size-4 text-teal" />}
              {status?.text ?? (dirty ? "You have unsaved changes" : "All changes saved")}
            </motion.p>
          </AnimatePresence>
          <Button variant="ghost" onClick={reset} disabled={pending}>
            <RotateCcw className="size-4" /> Reset
          </Button>
          <Button onClick={save} disabled={pending || !dirty}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save
          </Button>
        </div>
      </div>
    </div>
  );
}
