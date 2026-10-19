import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const dir = mkdtempSync(path.join(tmpdir(), "gg-store-"));
type Store = typeof import("@/core/db/json-store");
let a: Store;
let b: Store;

beforeAll(async () => {
  vi.spyOn(process, "cwd").mockReturnValue(dir);
  a = await import("@/core/db/json-store");
  // A second, separate copy of the module, like Next.js can load per route bundle.
  vi.resetModules();
  b = await import("@/core/db/json-store");
});

afterAll(() => {
  vi.restoreAllMocks();
  rmSync(dir, { recursive: true, force: true });
});

const count = (raw: unknown) => (typeof raw === "number" ? raw : 0);

describe("json-store", () => {
  it("serialises concurrent read-modify-write across module copies (no lost updates)", async () => {
    expect(a).not.toBe(b);
    await Promise.all(Array.from({ length: 60 }, (_, i) => (i % 2 ? a : b).updateJson("counter.json", count, (n) => n + 1)));
    expect(await a.readJson("counter.json")).toBe(60);
  });

  it("never leaves temp files behind", () => {
    expect(readdirSync(path.join(dir, "data")).filter((f) => f.endsWith(".tmp"))).toEqual([]);
  });

  it("a failed change writes nothing", async () => {
    await expect(a.updateJson("counter.json", count, () => { throw new Error("boom"); })).rejects.toThrow("boom");
    expect(await b.readJson("counter.json")).toBe(60);
  });

  it("returns undefined for a missing file", async () => {
    expect(await a.readJson("nope.json")).toBeUndefined();
  });
});
