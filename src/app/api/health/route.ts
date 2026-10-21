import { constants } from "node:fs";
import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Uptime probe: 200 when the server is up and the data folder is writable. */
export async function GET() {
  const dir = path.join(process.cwd(), "data");
  let store = true;
  try {
    await mkdir(dir, { recursive: true });
    await access(dir, constants.W_OK);
  } catch {
    store = false;
  }
  return NextResponse.json(
    { ok: store, store: store ? "writable" : "not writable", uptime: Math.round(process.uptime()) },
    { status: store ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
