import { headers } from "next/headers";

/**
 * Fixed-window, in-memory rate limiter. Good enough for one server process;
 * swap for Upstash/Redis when running several instances.
 */
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const slot = hits.get(key);
  if (!slot || slot.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    if (hits.size > 10_000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    return { ok: true, retryAfterSec: 0 };
  }
  slot.count++;
  return { ok: slot.count <= limit, retryAfterSec: Math.ceil((slot.resetAt - now) / 1000) };
}

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}
