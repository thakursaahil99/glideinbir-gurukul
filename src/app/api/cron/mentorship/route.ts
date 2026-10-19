import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sweep } from "@/modules/mentorship/service";

export const dynamic = "force-dynamic";

/**
 * Scheduled job: sends due reminders (24h / 15 min) and completes ended sessions.
 * Call every 5 minutes with `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends
 * this header itself). Pages also settle bookings lazily when they're opened.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  if (got.length !== want.length || !timingSafeEqual(got, want)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, changed: await sweep() }, { headers: { "Cache-Control": "no-store" } });
}
