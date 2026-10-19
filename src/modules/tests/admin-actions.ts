"use server";

import { z } from "zod";
import { requireAdmin } from "@/core/auth/current";
import { demoTests } from "./demo";
import { insertTest, listTests, saveTestSettings, updateTest } from "./store";

export async function adminSetTestStatusAction(id: unknown, status: unknown): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const parsed = z.object({ id: z.string().uuid(), status: z.enum(["published", "draft", "archived"]) }).safeParse({ id, status });
  if (!parsed.success) return { ok: false, error: "Invalid request" };
  const updated = await updateTest(parsed.data.id, (t) => ({
    ...t,
    status: parsed.data.status,
    publishedAt: parsed.data.status === "published" ? (t.publishedAt ?? new Date().toISOString()) : t.publishedAt,
  }));
  return updated ? { ok: true } : { ok: false, error: "Test not found" };
}

export async function saveTestCommissionAction(percent: unknown): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const parsed = z.number().min(0).max(90, "Keep commission at or below 90%").safeParse(percent);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  await saveTestSettings({ commissionBps: Math.round(parsed.data * 100) });
  return { ok: true };
}

export async function loadDemoTestsAction(): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  const fresh = demoTests(admin.id, new Set((await listTests()).map((t) => t.slug)));
  for (const t of fresh) await insertTest(t);
  return fresh.length ? { ok: true } : { ok: false, error: "Demo tests are already loaded" };
}
