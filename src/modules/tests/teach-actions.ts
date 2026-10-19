"use server";

import { randomUUID } from "node:crypto";
import { requireUser } from "@/core/auth/current";
import { canTeach, ownsOrAdmin, testsEnabled } from "./access";
import { publishProblems, uniqueSlug } from "./logic";
import { testDraftSchema } from "./schema";
import { deleteTest, getTest, insertTest, listAttempts, listTests, updateTest } from "./store";
import type { Test } from "./types";

export interface TeachResult {
  ok: boolean;
  error?: string;
  problems?: string[];
}

async function teacher() {
  const user = await requireUser("/tests/teach");
  return canTeach(user) && (await testsEnabled()) ? user : null;
}

async function owned(id: unknown) {
  const user = await teacher();
  if (!user || typeof id !== "string") return null;
  const test = await getTest(id);
  return test && ownsOrAdmin(test, user) ? test : null;
}

export async function createTestAction(rawTitle: unknown): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await teacher();
  if (!user) return { ok: false, error: "Only instructors can create tests" };
  const title = (typeof rawTitle === "string" ? rawTitle : "").trim().slice(0, 120);
  if (title.length < 3) return { ok: false, error: "Give the test a title of at least 3 characters" };
  const now = new Date().toISOString();
  const test: Test = {
    id: randomUUID(),
    slug: uniqueSlug(title, new Set((await listTests()).map((t) => t.slug))),
    instructorId: user.id,
    title,
    description: "",
    exam: "Other",
    durationMin: 30,
    price: 0,
    colors: ["#5b47ff", "#00c2ff"],
    instructions: [
      "Each question shows its marks and negative marks.",
      "You can switch sections and change answers until you submit.",
      "The test submits automatically when the timer reaches zero.",
    ],
    sections: [{ id: randomUUID(), title: "Section 1", questions: [] }],
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
  await insertTest(test);
  return { ok: true, id: test.id };
}

export async function saveTestAction(id: unknown, draft: unknown): Promise<TeachResult> {
  const test = await owned(id);
  if (!test) return { ok: false, error: "Test not found" };
  const parsed = testDraftSchema.safeParse(draft);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: i ? `${i.path.filter((p) => typeof p !== "symbol").join(" › ")}: ${i.message}` : "Invalid input" };
  }
  const { priceRupees, ...rest } = parsed.data;
  const next: Test = { ...test, ...rest, price: priceRupees * 100 };
  if (test.status === "published") {
    const problems = publishProblems(next);
    if (problems.length) return { ok: false, error: "A published test must stay complete", problems };
    // Once people have attempted it, the questions are frozen so scores stay comparable.
    if ((await listAttempts({ testId: test.id })).length && JSON.stringify(next.sections) !== JSON.stringify(test.sections))
      return { ok: false, error: "Learners have already attempted this test, so its questions can't change. Duplicate it into a new test instead." };
  }
  await updateTest(test.id, () => next);
  return { ok: true };
}

export async function setTestStatusAction(id: unknown, status: unknown): Promise<TeachResult> {
  const test = await owned(id);
  if (!test) return { ok: false, error: "Test not found" };
  if (status !== "published" && status !== "draft") return { ok: false, error: "Invalid status" };
  if (status === "published") {
    const problems = publishProblems(test);
    if (problems.length) return { ok: false, error: "Not ready to publish", problems };
  }
  await updateTest(test.id, (t) => ({ ...t, status, publishedAt: status === "published" ? (t.publishedAt ?? new Date().toISOString()) : t.publishedAt }));
  return { ok: true };
}

export async function deleteTestAction(id: unknown): Promise<TeachResult> {
  const test = await owned(id);
  if (!test) return { ok: false, error: "Test not found" };
  if ((await listAttempts({ testId: test.id })).length) return { ok: false, error: "This test has attempts. Unpublish it instead so results stay available." };
  await deleteTest(test.id);
  return { ok: true };
}
