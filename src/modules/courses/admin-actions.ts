"use server";

import { z } from "zod";
import { requireAdmin } from "@/core/auth/current";
import { demoCourses } from "./demo";
import { insertCourse, listCourses, saveCourseSettings, updateCourse } from "./store";

/**
 * No revalidatePath: every page is force-dynamic, so navigations always fetch fresh
 * data, and applying a revalidated tree in place was intermittently not committed
 * (leaving buttons stuck "pending"). The client re-fetches by navigating instead.
 */
const refresh = () => {};

export async function adminSetCourseStatusAction(id: unknown, status: unknown): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const parsed = z.object({ id: z.string().uuid(), status: z.enum(["published", "draft", "archived"]) }).safeParse({ id, status });
  if (!parsed.success) return { ok: false, error: "Invalid request" };
  const updated = await updateCourse(parsed.data.id, (c) => ({
    ...c,
    status: parsed.data.status,
    publishedAt: parsed.data.status === "published" ? (c.publishedAt ?? new Date().toISOString()) : c.publishedAt,
  }));
  if (!updated) return { ok: false, error: "Course not found" };
  refresh();
  return { ok: true };
}

export async function saveCommissionAction(percent: unknown): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const parsed = z.number().min(0).max(90, "Keep commission at or below 90%").safeParse(percent);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  await saveCourseSettings({ commissionBps: Math.round(parsed.data * 100) });
  refresh();
  return { ok: true };
}

export async function loadDemoCoursesAction(): Promise<{ ok: boolean; added: number }> {
  const admin = await requireAdmin();
  const taken = new Set((await listCourses()).map((c) => c.slug));
  const fresh = demoCourses(admin.id, taken);
  for (const c of fresh) await insertCourse(c);
  refresh();
  return { ok: true, added: fresh.length };
}
