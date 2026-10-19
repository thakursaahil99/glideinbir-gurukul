"use client";

import { RotateCcw } from "lucide-react";
import { BirdMark } from "@/components/brand/logo";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-[70svh] place-items-center px-4 text-center">
      <div>
        <BirdMark className="mx-auto w-16 rotate-[160deg] opacity-80" />
        <h1 className="mt-6 font-display text-4xl font-bold tracking-tight">Turbulence ahead</h1>
        <p className="mt-2 text-muted">Something went wrong on this page. Let&apos;s try that again.</p>
        <button onClick={reset} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-fg px-5 py-3 font-semibold text-bg">
          <RotateCcw className="size-4" /> Try again
        </button>
      </div>
    </div>
  );
}
