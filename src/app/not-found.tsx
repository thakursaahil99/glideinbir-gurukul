import Link from "next/link";
import { BirdMark } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <div className="relative grid min-h-svh place-items-center overflow-hidden px-4 text-center">
      <div className="absolute top-1/2 left-1/2 size-[60vmax] -translate-x-1/2 -translate-y-1/2 animate-aurora rounded-full bg-primary/15 blur-[120px]" />
      <div className="relative">
        <p className="font-display text-[28vw] leading-none font-black tracking-tighter text-fg/[0.07] sm:text-[14rem]">404</p>
        <BirdMark className="mx-auto -mt-16 w-20 animate-float sm:-mt-24" />
        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">This bird flew off course</h1>
        <p className="mt-2 text-muted">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/" className="mt-8 inline-block rounded-xl bg-gradient-to-r from-saffron via-rose to-primary px-6 py-3 font-semibold text-white">
          Fly back home
        </Link>
      </div>
    </div>
  );
}
