"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { BirdMark } from "@/components/brand/logo";

/** Shared body of the `error.tsx` boundaries (root, app shell, admin). */
export function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="grid min-h-[60svh] place-items-center px-4 text-center" role="alert">
      <div>
        <BirdMark className="mx-auto w-16 rotate-[160deg] opacity-80" />
        <h1 className="font-display mt-6 text-4xl font-bold tracking-tight">Turbulence ahead</h1>
        <p className="text-muted mt-2">Something went wrong on this page. Let&apos;s try that again.</p>
        {error.digest && <p className="text-muted mt-1 text-xs">Reference: {error.digest}</p>}
        <button
          onClick={reset}
          className="bg-fg text-bg mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold"
        >
          <RotateCcw className="size-4" /> Try again
        </button>
      </div>
    </div>
  );
}

/** Shared body of the `loading.tsx` boundaries. */
export function RouteLoading({ className = "min-h-[60svh]" }: { className?: string }) {
  return (
    <div className={`grid place-items-center ${className}`} role="status" aria-label="Loading">
      <div className="flex flex-col items-center gap-4">
        <BirdMark className="animate-float w-14" />
        <div className="bg-line h-1 w-32 overflow-hidden rounded-full">
          <div className="animate-shimmer h-full w-1/2 rounded-full bg-[linear-gradient(90deg,transparent,var(--primary),var(--rose),transparent)] bg-[length:200%_100%]" />
        </div>
      </div>
    </div>
  );
}
