import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { externalJobs } from "@/modules/jobs/remotive";
import { sendAlertDigests } from "@/modules/jobs/service";

export const dynamic = "force-dynamic";

/**
 * Daily job: emails job-alert digests and refreshes the remote listings if they're stale.
 * Call once a day with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  if (got.length !== want.length || !timingSafeEqual(got, want)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [alerts, external] = await Promise.all([sendAlertDigests(), externalJobs()]);
  return NextResponse.json({ ok: true, alertEmails: alerts, remoteJobs: external.jobs.length }, { headers: { "Cache-Control": "no-store" } });
}
