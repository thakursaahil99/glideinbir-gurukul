import { randomUUID } from "node:crypto";
import { readJson, updateJson } from "@/core/db/json-store";
import type { Attempt, Test, TestPurchase, TestSettings } from "./types";

const F = {
  tests: "tests_tests.json",
  attempts: "tests_attempts.json",
  purchases: "tests_purchases.json",
  settings: "tests_settings.json",
};

const arr = <T>(raw: unknown): T[] => (Array.isArray(raw) ? (raw as T[]) : []);
const now = () => new Date().toISOString();

/* ---------------- Tests ---------------- */

export const listTests = async () => arr<Test>(await readJson(F.tests));
export const getTest = async (id: string) => (await listTests()).find((t) => t.id === id) ?? null;
export const getTestBySlug = async (slug: string) => (await listTests()).find((t) => t.slug === slug) ?? null;

export async function insertTest(test: Test) {
  await updateJson(F.tests, arr<Test>, (all) => [...all, test]);
  return test;
}

export async function updateTest(id: string, change: (t: Test) => Test) {
  let updated: Test | null = null;
  await updateJson(F.tests, arr<Test>, (all) =>
    all.map((t) => {
      if (t.id !== id) return t;
      updated = { ...change(t), id: t.id, instructorId: t.instructorId, createdAt: t.createdAt, updatedAt: now() };
      return updated;
    }),
  );
  return updated as Test | null;
}

export async function deleteTest(id: string) {
  await updateJson(F.tests, arr<Test>, (all) => all.filter((t) => t.id !== id));
}

/* ---------------- Purchases ---------------- */

export async function listPurchases(filter: { userId?: string; testId?: string } = {}) {
  return arr<TestPurchase>(await readJson(F.purchases)).filter((p) => (!filter.userId || p.userId === filter.userId) && (!filter.testId || p.testId === filter.testId));
}

export const hasPurchased = async (userId: string, testId: string) => (await listPurchases({ userId, testId })).length > 0;

export async function ensurePurchase(userId: string, testId: string, pricePaid: number) {
  let row: TestPurchase | undefined;
  await updateJson(F.purchases, arr<TestPurchase>, (all) => {
    row = all.find((p) => p.userId === userId && p.testId === testId);
    if (row) return all;
    row = { id: randomUUID(), userId, testId, pricePaid, createdAt: now() };
    return [...all, row];
  });
  return row!;
}

/* ---------------- Attempts ---------------- */

export async function listAttempts(filter: { userId?: string; testId?: string } = {}) {
  return arr<Attempt>(await readJson(F.attempts)).filter((a) => (!filter.userId || a.userId === filter.userId) && (!filter.testId || a.testId === filter.testId));
}

export const getAttempt = async (id: string) => arr<Attempt>(await readJson(F.attempts)).find((a) => a.id === id) ?? null;

/**
 * One attempt per learner per test. Returns the existing one if there is any,
 * so a double click or a second tab can't start a second clock.
 */
export async function startAttempt(input: { testId: string; userId: string; userName: string; durationMin: number }) {
  let attempt: Attempt | undefined;
  let created = false;
  await updateJson(F.attempts, arr<Attempt>, (all) => {
    attempt = all.find((a) => a.testId === input.testId && a.userId === input.userId);
    if (attempt) return all;
    const start = new Date();
    attempt = {
      id: randomUUID(),
      testId: input.testId,
      userId: input.userId,
      userName: input.userName,
      startedAt: start.toISOString(),
      deadline: new Date(start.getTime() + input.durationMin * 60_000).toISOString(),
      status: "in_progress",
      answers: {},
      marked: [],
      timeSpent: {},
    };
    created = true;
    return [...all, attempt];
  });
  return { attempt: attempt!, created };
}

/** Applies `change` only while the attempt is still in progress; returns the stored attempt. */
export async function updateAttempt(id: string, change: (a: Attempt) => Attempt) {
  let out: Attempt | null = null;
  await updateJson(F.attempts, arr<Attempt>, (all) =>
    all.map((a) => {
      if (a.id !== id) return a;
      out = a.status === "in_progress" ? change(a) : a;
      return out;
    }),
  );
  return out as Attempt | null;
}

/* ---------------- Settings ---------------- */

const DEFAULT_SETTINGS: TestSettings = { commissionBps: 2000 };
const parseSettings = (raw: unknown): TestSettings => {
  const bps = (raw as TestSettings | undefined)?.commissionBps;
  return Number.isInteger(bps) && bps! >= 0 && bps! <= 10_000 ? { commissionBps: bps! } : DEFAULT_SETTINGS;
};
export const getTestSettings = async () => parseSettings(await readJson(F.settings));
export const saveTestSettings = (s: TestSettings) => updateJson(F.settings, parseSettings, () => s);
