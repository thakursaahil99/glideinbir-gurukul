import { BirdMark } from "@/components/brand/logo";

export default function Loading() {
  return (
    <div className="grid min-h-[60svh] place-items-center" role="status" aria-label="Loading">
      <div className="flex flex-col items-center gap-4">
        <BirdMark className="w-14 animate-float" />
        <div className="h-1 w-32 overflow-hidden rounded-full bg-line">
          <div className="h-full w-1/2 animate-shimmer rounded-full bg-[linear-gradient(90deg,transparent,var(--primary),var(--rose),transparent)] bg-[length:200%_100%]" />
        </div>
      </div>
    </div>
  );
}
