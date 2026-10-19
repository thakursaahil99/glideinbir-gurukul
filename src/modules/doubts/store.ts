import { randomUUID } from "node:crypto";
import { readJson, updateJson } from "@/core/db/json-store";
import type { Doubt, DoubtMessage, DoubtSettings, TutorProfile } from "./types";

const F = {
  requests: "doubts_requests.json",
  messages: "doubts_messages.json",
  tutors: "doubts_tutor_profiles.json",
  settings: "doubts_settings.json",
};
const arr = <T>(raw: unknown): T[] => (Array.isArray(raw) ? (raw as T[]) : []);
const now = () => new Date().toISOString();

/* ---------------- Doubts ---------------- */

export const listDoubts = async () => arr<Doubt>(await readJson(F.requests));
export const getDoubt = async (id: string) => (await listDoubts()).find((d) => d.id === id) ?? null;

export async function insertDoubt(d: Doubt) {
  await updateJson(F.requests, arr<Doubt>, (all) => [...all, d]);
  return d;
}

/**
 * Atomic compare-and-set: `guard` sees the stored doubt inside the write queue and
 * returns an error string to refuse. This is what makes "first tutor wins" safe.
 */
export async function transition(id: string, guard: (d: Doubt) => string | null, change: (d: Doubt) => Doubt): Promise<{ ok: true; doubt: Doubt } | { ok: false; error: string; doubt: Doubt | null }> {
  let result: { ok: true; doubt: Doubt } | { ok: false; error: string; doubt: Doubt | null } = { ok: false, error: "Doubt not found", doubt: null };
  await updateJson(F.requests, arr<Doubt>, (all) =>
    all.map((d) => {
      if (d.id !== id) return d;
      const err = guard(d);
      if (err) {
        result = { ok: false, error: err, doubt: d };
        return d;
      }
      const next = change(d);
      result = { ok: true, doubt: next };
      return next;
    }),
  );
  return result;
}

/* ---------------- Messages ---------------- */

export async function listMessages(doubtId: string) {
  return arr<DoubtMessage>(await readJson(F.messages)).filter((m) => m.doubtId === doubtId);
}

export async function addMessage(m: Omit<DoubtMessage, "id" | "createdAt">) {
  const msg: DoubtMessage = { ...m, id: randomUUID(), createdAt: now() };
  await updateJson(F.messages, arr<DoubtMessage>, (all) => [...all, msg]);
  return msg;
}

/* ---------------- Tutor profiles ---------------- */

export const listTutors = async () => arr<TutorProfile>(await readJson(F.tutors));
export const getTutor = async (userId: string) => (await listTutors()).find((t) => t.userId === userId) ?? null;

export async function upsertTutor(userId: string, change: (p: TutorProfile | null) => TutorProfile) {
  let out: TutorProfile | undefined;
  await updateJson(F.tutors, arr<TutorProfile>, (all) => {
    const i = all.findIndex((t) => t.userId === userId);
    out = { ...change(i >= 0 ? all[i]! : null), userId, updatedAt: now() };
    if (i < 0) return [...all, out];
    const copy = all.slice();
    copy[i] = out;
    return copy;
  });
  return out!;
}

/** Heartbeat from a connected tutor feed. Cheap no-op for unknown users. */
export async function touchTutor(userId: string) {
  await updateJson(F.tutors, arr<TutorProfile>, (all) => all.map((t) => (t.userId === userId ? { ...t, lastSeen: now() } : t)));
}

/* ---------------- Settings ---------------- */

const DEFAULT_SETTINGS: DoubtSettings = { commissionBps: 2000 };
const parseSettings = (raw: unknown): DoubtSettings => {
  const bps = (raw as DoubtSettings | undefined)?.commissionBps;
  return Number.isInteger(bps) && bps! >= 0 && bps! <= 10_000 ? { commissionBps: bps! } : DEFAULT_SETTINGS;
};
export const getDoubtSettings = async () => parseSettings(await readJson(F.settings));
export const saveDoubtSettings = (s: DoubtSettings) => updateJson(F.settings, parseSettings, () => s);
