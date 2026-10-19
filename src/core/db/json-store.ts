import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Tiny JSON-file store under /data. Free, zero-setup persistence until the
 * Supabase migration. Writes are serialised through one in-process queue and
 * land atomically (write a uniquely named temp file, then rename).
 *
 * The queue lives on globalThis: Next.js can load this module more than once
 * per process (separate route bundles, dev reloads), and every copy must share
 * one queue or read-modify-write cycles could interleave. A single server
 * process is assumed; run several and you need a real database.
 */
const DATA_DIR = path.join(process.cwd(), "data");

const g = globalThis as typeof globalThis & { __ggJsonQueue?: Promise<unknown> };
g.__ggJsonQueue ??= Promise.resolve();

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = g.__ggJsonQueue!.then(job, job);
  g.__ggJsonQueue = run.catch(() => undefined);
  return run;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function readRaw(file: string): Promise<unknown> {
  for (let attempt = 0; ; attempt++) {
    try {
      return JSON.parse(await fs.readFile(path.join(DATA_DIR, file), "utf8"));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      // A rename racing the read (Windows) can surface as a busy file or a torn read; retry briefly.
      const transient = e instanceof SyntaxError || ["EBUSY", "EPERM", "EACCES"].includes((e as NodeJS.ErrnoException).code ?? "");
      if (!transient || attempt >= 4) throw e;
      await sleep(15 * (attempt + 1));
    }
  }
}

async function writeRaw(file: string, data: unknown) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const target = path.join(DATA_DIR, file);
  const tmp = `${target}.${process.pid}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  for (let attempt = 0; ; attempt++) {
    try {
      await fs.rename(tmp, target);
      return;
    } catch (e) {
      // Windows refuses to replace a file another handle has open; it clears in milliseconds.
      if (!["EBUSY", "EPERM", "EACCES"].includes((e as NodeJS.ErrnoException).code ?? "") || attempt >= 6) {
        await fs.rm(tmp, { force: true });
        throw e;
      }
      await sleep(20 * (attempt + 1));
    }
  }
}

/** Read a file; `undefined` when it does not exist yet. */
export function readJson(file: string): Promise<unknown> {
  return readRaw(file);
}

/** Read-modify-write under the write queue so concurrent updates never clobber each other. */
export function updateJson<T>(file: string, parse: (raw: unknown) => T, change: (current: T) => T): Promise<T> {
  return enqueue(async () => {
    const next = change(parse(await readRaw(file)));
    await writeRaw(file, next);
    return next;
  });
}
