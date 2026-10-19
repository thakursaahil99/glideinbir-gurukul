import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/current";
import { rateLimit } from "@/core/security/rate-limit";
import { IMAGE_TYPES, imageMagicOk, MAX_IMAGE_BYTES, UPLOAD_DIR } from "@/modules/doubts/media";

/**
 * PUT the raw image (png/jpg/webp, ≤ 5 MB). It lands in the learner's private staging
 * folder; asking the doubt moves it next to the doubt. Returns the file id.
 */
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  if (!rateLimit(`doubt-img:${user.id}`, 20, 10 * 60_000).ok) return NextResponse.json({ error: "Too many uploads" }, { status: 429 });

  const ext = IMAGE_TYPES[(req.headers.get("content-type") ?? "").split(";")[0]!.trim()];
  if (!ext) return NextResponse.json({ error: "Use a PNG, JPG or WebP image" }, { status: 415 });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_IMAGE_BYTES) return NextResponse.json({ error: "Image must be under 5 MB" }, { status: 413 });

  // Small file: buffer it with a hard cap, then check its real type.
  const reader = req.body?.getReader();
  if (!reader) return NextResponse.json({ error: "Empty file" }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_IMAGE_BYTES) {
      await reader.cancel();
      return NextResponse.json({ error: "Image must be under 5 MB" }, { status: 413 });
    }
    chunks.push(value);
  }
  const buf = Buffer.concat(chunks);
  if (!buf.length || !imageMagicOk(ext, buf)) return NextResponse.json({ error: "That file isn't a real image" }, { status: 415 });

  const dir = path.join(UPLOAD_DIR, "staging", user.id);
  await fs.mkdir(dir, { recursive: true });
  const file = `${randomUUID()}.${ext}`;
  await fs.writeFile(path.join(dir, file), buf);
  return NextResponse.json({ file });
}
