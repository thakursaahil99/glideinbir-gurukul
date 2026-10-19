"use server";

import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { requireAdmin, requireUser } from "@/core/auth/current";
import { publish } from "@/core/realtime/bus";
import { rateLimit } from "@/core/security/rate-limit";
import { livekitConfigured, livekitMeetUrl, livekitToken } from "@/core/video/livekit";
import { getBalance } from "@/core/wallet/store";
import { eligibleTutors, firstName, isOpen, MAX_RATE, MIN_RATE, REQUEST_TTL_MS } from "./logic";
import { UPLOAD_DIR } from "./media";
import { acceptDoubt, broadcast, doubtChannel, doubtsEnabled, endSession, isTutorRole, settle, subjectChannel, view, type DoubtView } from "./service";
import { addMessage, getDoubt, getTutor, insertDoubt, listDoubts, listMessages, listTutors, saveDoubtSettings, transition, upsertTutor } from "./store";
import { SESSION_LIMITS, SUBJECTS, type Doubt, type DoubtMessage, type TutorProfile } from "./types";

type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });

async function load(id: unknown) {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const d = await getDoubt(id);
  return d ? settle(d) : null;
}

const isParticipant = (d: Doubt, userId: string) => d.studentId === userId || d.tutorId === userId;

/* ================= Learner ================= */

const askSchema = z.object({
  subject: z.enum(SUBJECTS),
  text: z.string().trim().min(10, "Describe your doubt in at least 10 characters").max(2000),
  limitMin: z.number().refine((n) => (SESSION_LIMITS as readonly number[]).includes(n), "Pick a session length"),
  image: z
    .string()
    .regex(/^[0-9a-f-]{36}\.(png|jpg|webp)$/)
    .nullable(),
});

export async function askDoubtAction(input: unknown): Promise<{ ok: true; id: string } | (Fail & { openId?: string })> {
  const user = await requireUser("/doubts");
  if (!(await doubtsEnabled())) return fail("Instant doubts are switched off right now");
  const parsed = askSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid doubt");
  if (!rateLimit(`ask:${user.id}`, 5, 10 * 60_000).ok) return fail("You've asked a lot of doubts quickly. Try again in a few minutes.");

  const mine = await Promise.all((await listDoubts()).filter((d) => d.studentId === user.id && isOpen(d)).map(settle));
  const open = mine.find(isOpen);
  if (open) return { ok: false, error: "You already have an open doubt. Finish or cancel it first.", openId: open.id };

  const { subject, text, limitMin, image } = parsed.data;
  const balance = await getBalance(user.id);
  const tutors = eligibleTutors(await listTutors(), { subject, limitMin, balance, studentId: user.id });
  if (!tutors.length) {
    const anyOnline = eligibleTutors(await listTutors(), { subject, limitMin, balance: Number.MAX_SAFE_INTEGER, studentId: user.id });
    return fail(anyOnline.length ? `Add money to your wallet: the cheapest ${subject} tutor online needs ₹${(anyOnline[0]!.ratePerMinute * limitMin) / 100} for ${limitMin} min.` : `No ${subject} tutors are online right now. Try again soon!`);
  }

  const id = randomUUID();
  if (image) {
    // The picture was uploaded to the learner's staging folder; move it next to the doubt.
    const from = path.join(UPLOAD_DIR, "staging", user.id, image);
    const to = path.join(UPLOAD_DIR, id, image);
    try {
      await fs.mkdir(path.dirname(to), { recursive: true });
      await fs.rename(from, to);
    } catch {
      return fail("That image upload expired. Please attach it again.");
    }
  }

  const now = Date.now();
  const doubt: Doubt = { id, studentId: user.id, studentName: user.name, subject, text, image, limitMin, status: "requested", createdAt: new Date(now).toISOString(), expiresAt: new Date(now + REQUEST_TTL_MS).toISOString() };
  await insertDoubt(doubt);
  publish(subjectChannel(subject), "request", { ...view(doubt), balance });
  return { ok: true, id };
}

export async function getDoubtAction(id: unknown): Promise<{ ok: true; doubt: DoubtView; messages: DoubtMessage[]; role: "student" | "tutor"; tutorsOnline: number } | Fail> {
  const user = await requireUser("/doubts");
  const d = await load(id);
  if (!d) return fail("Doubt not found");
  const tutorCanPeek = d.status === "requested" && isTutorRole(user);
  if (!isParticipant(d, user.id) && !tutorCanPeek) return fail("Doubt not found");
  const tutorsOnline = d.status === "requested" ? eligibleTutors(await listTutors(), { subject: d.subject, limitMin: d.limitMin, balance: Number.MAX_SAFE_INTEGER, studentId: d.studentId }).length : 0;
  return { ok: true, doubt: view(d), messages: isParticipant(d, user.id) ? await listMessages(d.id) : [], role: d.studentId === user.id ? "student" : "tutor", tutorsOnline };
}

export async function cancelDoubtAction(id: unknown): Promise<{ ok: true } | Fail> {
  const user = await requireUser("/doubts");
  const d = await load(id);
  if (!d || d.studentId !== user.id) return fail("Doubt not found");
  if (d.status === "requested") {
    const res = await transition(d.id, (x) => (x.status === "requested" ? null : "A tutor just accepted. End the session instead."), (x) => ({ ...x, status: "cancelled", cancelReason: "Cancelled by the learner" }));
    if (!res.ok) return fail(res.error);
    broadcast(res.doubt);
    return { ok: true };
  }
  if (d.status === "accepted") {
    const res = await endSession(d.id, Date.now(), "student", "Cancelled by the learner before the session started");
    return res.ok ? { ok: true } : fail(res.error);
  }
  return fail("This doubt can't be cancelled now");
}

/** Either side ends a running session. Billing happens inside endSession. */
export async function endDoubtAction(id: unknown): Promise<{ ok: true } | Fail> {
  const user = await requireUser("/doubts");
  const d = await load(id);
  if (!d || !isParticipant(d, user.id)) return fail("Doubt not found");
  if (d.status !== "in_progress" && !(d.status === "accepted" && d.tutorId === user.id)) return fail("This session isn't running");
  const res = await endSession(d.id, Date.now(), d.studentId === user.id ? "student" : "tutor", d.status === "accepted" ? "The tutor closed the session before starting" : undefined);
  return res.ok ? { ok: true } : fail(res.error);
}

export async function sendMessageAction(id: unknown, text: unknown): Promise<{ ok: true } | Fail> {
  const user = await requireUser("/doubts");
  const parsed = z.string().trim().min(1).max(2000).safeParse(text);
  if (!parsed.success) return fail("Type a message first");
  if (!rateLimit(`chat:${user.id}`, 30, 60_000).ok) return fail("Slow down a little");
  const d = await load(id);
  if (!d || !isParticipant(d, user.id)) return fail("Doubt not found");
  if (d.status !== "accepted" && d.status !== "in_progress") return fail("Chat is closed for this doubt");
  const m = await addMessage({ doubtId: d.id, senderId: user.id, senderName: firstName(user.name), role: d.studentId === user.id ? "student" : "tutor", text: parsed.data });
  publish(doubtChannel(d.id), "message", m);
  return { ok: true };
}

const rateSchema = z.object({ stars: z.number().int().min(1).max(5), text: z.string().trim().max(500) });

export async function rateDoubtAction(id: unknown, input: unknown): Promise<{ ok: true } | Fail> {
  const user = await requireUser("/doubts");
  const parsed = rateSchema.safeParse(input);
  if (!parsed.success) return fail("Pick 1 to 5 stars");
  const d = await load(id);
  if (!d || d.studentId !== user.id) return fail("Doubt not found");
  const res = await transition(d.id, (x) => (x.status !== "completed" ? "You can rate after the session" : x.rating ? "You've already rated this session" : null), (x) => ({ ...x, rating: { ...parsed.data, at: new Date().toISOString() } }));
  if (!res.ok) return fail(res.error);
  broadcast(res.doubt);
  return { ok: true };
}

export async function videoLinkAction(id: unknown): Promise<{ ok: true; url: string } | Fail> {
  const user = await requireUser("/doubts");
  const d = await load(id);
  if (!d || !isParticipant(d, user.id)) return fail("Doubt not found");
  if (d.status !== "accepted" && d.status !== "in_progress") return fail("The call is only open during the session");
  if (!livekitConfigured()) return fail("Video calls need LiveKit keys (LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET). Chat works meanwhile.");
  const token = livekitToken({ room: `doubt-${d.id}`, identity: user.id, name: firstName(user.name), ttlSec: (d.limitMin + 15) * 60 });
  return { ok: true, url: livekitMeetUrl(token) };
}

/* ================= Tutor ================= */

async function requireTutor() {
  const user = await requireUser("/doubts/tutor");
  return isTutorRole(user) && (await doubtsEnabled()) ? user : null;
}

const profileSchema = z.object({
  subjects: z.array(z.enum(SUBJECTS)).min(1, "Pick at least one subject").max(SUBJECTS.length),
  rateRupees: z.number().min(MIN_RATE / 100, `At least ₹${MIN_RATE / 100}/min`).max(MAX_RATE / 100, `At most ₹${MAX_RATE / 100}/min`),
  bio: z.string().trim().max(300),
});

export async function saveTutorProfileAction(input: unknown): Promise<{ ok: true } | Fail> {
  const user = await requireTutor();
  if (!user) return fail("Only tutors can do this");
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid profile");
  await upsertTutor(user.id, (p) => ({
    userId: user.id,
    name: user.name,
    subjects: parsed.data.subjects,
    ratePerMinute: Math.round(parsed.data.rateRupees * 100),
    bio: parsed.data.bio,
    online: p?.online ?? false,
    lastSeen: p?.lastSeen ?? new Date(0).toISOString(),
    updatedAt: "",
  }));
  return { ok: true };
}

export async function setOnlineAction(online: unknown): Promise<{ ok: true } | Fail> {
  const user = await requireTutor();
  if (!user) return fail("Only tutors can do this");
  const p = await getTutor(user.id);
  if (!p) return fail("Save your tutor profile first");
  await upsertTutor(user.id, (x) => ({ ...x!, online: online === true, lastSeen: new Date().toISOString() }));
  return { ok: true };
}

export type FeedItem = DoubtView & { affordable: boolean };

/** Open requests this tutor can take, plus their own active sessions. */
export async function tutorFeedAction(): Promise<{ ok: true; profile: TutorProfile | null; requests: FeedItem[]; active: DoubtView[] } | Fail> {
  const user = await requireTutor();
  if (!user) return fail("Only tutors can do this");
  const profile = await getTutor(user.id);
  const all = await Promise.all((await listDoubts()).filter((d) => isOpen(d)).map(settle));
  const requests: FeedItem[] = [];
  for (const d of all) {
    if (d.status !== "requested" || d.studentId === user.id || !profile?.subjects.includes(d.subject)) continue;
    const affordable = (await getBalance(d.studentId)) >= profile.ratePerMinute * d.limitMin;
    requests.push({ ...view(d), affordable });
  }
  return { ok: true, profile, requests: requests.sort((a, b) => a.createdAt.localeCompare(b.createdAt)), active: all.filter((d) => d.tutorId === user.id && isOpen(d)).map(view) };
}

export async function acceptDoubtAction(id: unknown): Promise<{ ok: true } | Fail> {
  const user = await requireTutor();
  if (!user) return fail("Only tutors can do this");
  if (!rateLimit(`accept:${user.id}`, 20, 60_000).ok) return fail("Too many attempts");
  const profile = await getTutor(user.id);
  if (!profile) return fail("Save your tutor profile first");
  const d = await load(id);
  if (!d) return fail("Doubt not found");
  if (!profile.subjects.includes(d.subject)) return fail(`You don't teach ${d.subject}`);
  if ((await listDoubts()).some((x) => x.tutorId === user.id && isOpen(x))) return fail("Finish your current session first");
  const res = await acceptDoubt(d.id, { id: user.id, name: firstName(user.name), ratePerMinute: profile.ratePerMinute });
  return res.ok ? { ok: true } : fail(res.error);
}

export async function startSessionAction(id: unknown): Promise<{ ok: true } | Fail> {
  const user = await requireTutor();
  if (!user) return fail("Only tutors can do this");
  const d = await load(id);
  if (!d || d.tutorId !== user.id) return fail("Doubt not found");
  const res = await transition(d.id, (x) => (x.status === "accepted" && x.tutorId === user.id ? null : "This session can't be started now"), (x) => ({ ...x, status: "in_progress", startedAt: new Date().toISOString() }));
  if (!res.ok) return fail(res.error);
  broadcast(res.doubt);
  const m = await addMessage({ doubtId: d.id, senderId: "system", senderName: "Glideinbir", role: "system", text: `Session started. The clock runs for up to ${d.limitMin} minutes; the first minute is free if you end early.` });
  publish(doubtChannel(d.id), "message", m);
  return { ok: true };
}

/* ================= Admin ================= */

export async function saveDoubtCommissionAction(percent: unknown): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const parsed = z.number().min(0).max(90, "Keep commission at or below 90%").safeParse(percent);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid");
  await saveDoubtSettings({ commissionBps: Math.round(parsed.data * 100) });
  return { ok: true };
}
