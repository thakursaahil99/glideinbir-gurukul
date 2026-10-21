import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

/**
 * Safe-by-default headers. The CSP only covers framing, plugins and <base>:
 * a script/connect allow-list would have to track Razorpay checkout, YouTube,
 * LiveKit and Monaco workers, and a miss breaks payments silently.
 */
function securityHeaders(dev: boolean) {
  const headers = [
    { key: "Content-Security-Policy", value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'" },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "geolocation=(), browsing-topics=()" },
  ];
  // Browsers ignore HSTS over plain http, but keep localhost out of it anyway.
  if (!dev) headers.push({ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" });
  return headers;
}

export default function config(phase: string): NextConfig {
  const dev = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    // `next dev` gets its own output folder so a `next build` running at the
    // same time can't overwrite its files (that corrupts the dev server).
    distDir: dev ? ".next-dev" : ".next",
    poweredByHeader: false,
    async headers() {
      return [{ source: "/:path*", headers: securityHeaders(dev) }];
    },
  };
}
