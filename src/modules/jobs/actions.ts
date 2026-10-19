"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAdmin, requireUser } from "@/core/auth/current";
import { notify } from "@/core/notifications/store";
import { rateLimit } from "@/core/security/rate-limit";
import { cleanSkills, istDate } from "./logic";
import { UUID_RE } from "./media";
import { AdzunaBusy, adzunaConfigured, searchAdzuna } from "./adzuna";
import { syncRemotive } from "./remotive";
import { activeCompany, apply, jobsEnabled, moveStage } from "./service";
import {
  changeApplication,
  changeCompany,
  changePosting,
  companyOf,
  getApplication,
  getCompany,
  getPosting,
  insertAlert,
  insertCompany,
  insertPosting,
  listApplications,
  nowIso,
  removeAlert,
  removePosting,
  toggleSaved,
  upsertProfile,
} from "./store";
import { EXPERIENCE, JOB_TYPES, STAGES, WORK_MODES, type ExternalJob, type Posting } from "./types";

type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });
const uuid = z.string().regex(UUID_RE);
const url = z.union([z.literal(""), z.url({ protocol: /^https?$/ }).max(200)]);

async function signedIn() {
  const user = await requireUser("/jobs");
  return (await jobsEnabled()) ? user : null;
}

/* ================= Job seekers ================= */

const profileSchema = z.object({
  headline: z.string().trim().max(120),
  skills: z.array(z.string()).max(30),
  experience: z.enum(EXPERIENCE),
  location: z.string().trim().max(80),
  about: z.string().trim().max(1500),
  links: z.object({ linkedin: url.optional(), github: url.optional(), portfolio: url.optional() }),
});

export async function saveProfileAction(input: unknown): Promise<{ ok: true } | Fail> {
  const user = await signedIn();
  if (!user) return fail("Jobs are switched off right now");
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form");
  const skills = cleanSkills(parsed.data.skills);
  if (!skills.length) return fail("Add at least one skill");
  const links = Object.fromEntries(Object.entries(parsed.data.links).filter(([, v]) => v));
  await upsertProfile(user.id, (p) => ({ ...parsed.data, userId: user.id, skills, links, resume: p?.resume ?? null, updatedAt: "" }));
  return { ok: true };
}

export async function applyAction(postingId: unknown, coverNote?: unknown): Promise<{ ok: true } | (Fail & { needsProfile?: boolean })> {
  const user = await signedIn();
  if (!user) return fail("Jobs are switched off right now");
  if (!rateLimit(`japply:${user.id}`, 20, 60 * 60_000).ok) return fail("You've applied a lot in the last hour. Take a breath and try again later.");
  const p = uuid.safeParse(postingId).success ? await getPosting(postingId as string) : null;
  const company = p ? await getCompany(p.companyId) : null;
  if (!p || company?.status !== "approved" || p.status !== "open" || p.hidden) return fail("This job isn't open");
  if (p.deadline < istDate(Date.now())) return fail("Applications for this job have closed");
  if (company.ownerId === user.id) return fail("You can't apply to your own job");
  const note = z.string().trim().max(1000).catch("").parse(coverNote ?? "");
  const res = await apply(user, p, note);
  return res.ok ? { ok: true } : res;
}

export async function withdrawAction(applicationId: unknown): Promise<{ ok: true } | Fail> {
  const user = await signedIn();
  if (!user) return fail("Jobs are switched off right now");
  if (!uuid.safeParse(applicationId).success) return fail("Application not found");
  const res = await changeApplication(
    applicationId as string,
    (a) => (a.userId !== user.id ? "Application not found" : a.withdrawn ? "Already withdrawn" : a.stage === "hired" || a.stage === "rejected" ? "This application is already closed" : null),
    (a) => ({ ...a, withdrawn: true }),
  );
  return res.ok ? { ok: true } : fail(res.error);
}

const externalId = z.string().regex(/^(remotive|adzuna):[\w-]{1,40}$/);
const snapshotSchema = z.object({ title: z.string().trim().min(1).max(140), company: z.string().trim().max(80), url: z.url({ protocol: /^https$/ }).max(600), source: z.enum(["adzuna", "remotive"]) });

export async function toggleSaveAction(jobId: unknown, snapshot?: unknown): Promise<{ ok: true; saved: boolean } | Fail> {
  const user = await signedIn();
  if (!user) return fail("Jobs are switched off right now");
  if (uuid.safeParse(jobId).success) return { ok: true, saved: await toggleSaved(user.id, jobId as string) };
  if (!externalId.safeParse(jobId).success) return fail("Job not found");
  const snap = snapshotSchema.safeParse(snapshot);
  return { ok: true, saved: await toggleSaved(user.id, jobId as string, snap.success ? snap.data : undefined) };
}

const searchSchema = z.object({ q: z.string().max(60), where: z.string().max(40), category: z.string().max(40).nullable(), type: z.enum(JOB_TYPES).nullable(), page: z.number().int().min(1).max(30) });

/** Live search across India (Adzuna). Proxied so the API key stays on the server. */
export async function searchJobsAction(input: unknown): Promise<{ ok: true; configured: boolean; count: number; jobs: ExternalJob[]; page: number; pageSize: number } | Fail> {
  const user = await signedIn();
  if (!user) return fail("Jobs are switched off right now");
  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) return fail("Check your search");
  if (!adzunaConfigured()) return { ok: true, configured: false, count: 0, jobs: [], page: 1, pageSize: 0 };
  if (!rateLimit(`jsearch:${user.id}`, 40, 60_000).ok) return fail("You're searching very fast. Wait a few seconds.");
  try {
    return { ok: true, configured: true, ...(await searchAdzuna(parsed.data)) };
  } catch (e) {
    if (e instanceof AdzunaBusy) return fail(e.message);
    console.error("[jobs] Adzuna search failed", e instanceof Error ? e.message : e);
    return fail("Job search is having trouble right now. Please try again.");
  }
}

const alertSchema = z.object({ query: z.string().trim().max(60), type: z.enum(JOB_TYPES).nullable(), workMode: z.enum(WORK_MODES).nullable() });

export async function createAlertAction(input: unknown): Promise<{ ok: true; id: string } | Fail> {
  const user = await signedIn();
  if (!user) return fail("Jobs are switched off right now");
  const parsed = alertSchema.safeParse(input);
  if (!parsed.success) return fail("Check the alert");
  if (!parsed.data.query && !parsed.data.type && !parsed.data.workMode) return fail("Search or pick a filter first, then save it as an alert");
  const id = randomUUID();
  const res = await insertAlert({ id, userId: user.id, ...parsed.data, lastSentAt: nowIso(), createdAt: nowIso() });
  return res.ok ? { ok: true, id } : fail(res.error);
}

export async function deleteAlertAction(id: unknown): Promise<{ ok: true } | Fail> {
  const user = await signedIn();
  if (!user) return fail("Jobs are switched off right now");
  if (!uuid.safeParse(id).success) return fail("Alert not found");
  await removeAlert(id as string, user.id);
  return { ok: true };
}

/* ================= Recruiters ================= */

const companySchema = z.object({
  name: z.string().trim().min(2, "Company name is too short").max(80),
  website: url,
  about: z.string().trim().min(30, "Tell candidates about the company (30+ characters)").max(1500),
  location: z.string().trim().min(2, "Add a location").max(80),
  size: z.enum(["1-10", "11-50", "51-200", "201-1000", "1000+"]),
});

export async function registerCompanyAction(input: unknown): Promise<{ ok: true } | Fail> {
  const user = await signedIn();
  if (!user) return fail("Jobs are switched off right now");
  const parsed = companySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form");
  const prev = await companyOf(user.id);
  if (prev?.status === "rejected") {
    const res = await changeCompany(prev.id, () => null, (c) => ({ ...c, ...parsed.data, status: "pending", adminNote: undefined }));
    return res.ok ? { ok: true } : fail(res.error);
  }
  const now = nowIso();
  const res = await insertCompany({ id: randomUUID(), ownerId: user.id, ...parsed.data, status: user.role === "admin" ? "approved" : "pending", createdAt: now, updatedAt: now });
  return res.ok ? { ok: true } : fail(res.error);
}

export async function updateCompanyAction(input: unknown): Promise<{ ok: true } | Fail> {
  const user = await signedIn();
  if (!user) return fail("Jobs are switched off right now");
  const c = await activeCompany(user.id);
  if (!c) return fail("Your company page isn't active");
  const parsed = companySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form");
  await changeCompany(c.id, () => null, (x) => ({ ...x, ...parsed.data }));
  return { ok: true };
}

async function ownPosting(id: unknown) {
  const user = await signedIn();
  if (!user) return { error: "Jobs are switched off right now" } as const;
  const company = await activeCompany(user.id);
  if (!company) return { error: "Only approved recruiters can do this" } as const;
  const p = uuid.safeParse(id).success ? await getPosting(id as string) : null;
  if (id !== undefined && (!p || p.companyId !== company.id)) return { error: "Job not found" } as const;
  return { user, company, p };
}

export async function createPostingAction(): Promise<{ ok: true; id: string } | Fail> {
  const ctx = await ownPosting(undefined);
  if ("error" in ctx) return fail(ctx.error!);
  if (!rateLimit(`jpost:${ctx.user.id}`, 30, 60 * 60_000).ok) return fail("Too many new drafts. Try again later.");
  const now = nowIso();
  const deadline = istDate(Date.now() + 30 * 86_400_000);
  const p: Posting = { id: randomUUID(), companyId: ctx.company.id, companyName: ctx.company.name, postedBy: ctx.user.id, title: "", type: "full-time", workMode: "onsite", location: ctx.company.location, experience: "fresher", salaryMin: 0, salaryMax: 0, salaryUnit: "year", skills: [], description: "", openings: 1, deadline, status: "draft", createdAt: now, updatedAt: now };
  await insertPosting(p);
  return { ok: true, id: p.id };
}

const postingSchema = z
  .object({
    title: z.string().trim().min(3, "Add a job title").max(100),
    type: z.enum(JOB_TYPES),
    workMode: z.enum(WORK_MODES),
    location: z.string().trim().min(2, "Add a location (or 'Remote')").max(80),
    experience: z.enum(EXPERIENCE),
    salaryMin: z.number().int().min(0).max(100_000_000),
    salaryMax: z.number().int().min(0).max(100_000_000),
    salaryUnit: z.enum(["year", "month"]),
    skills: z.array(z.string()).max(20),
    description: z.string().trim().min(80, "Describe the role in at least 80 characters").max(8000),
    openings: z.number().int().min(1).max(1000),
    deadline: z.iso.date(),
  })
  .refine((p) => !p.salaryMax || p.salaryMin <= p.salaryMax, "Minimum salary can't be above the maximum");

export async function savePostingAction(id: unknown, input: unknown): Promise<{ ok: true } | Fail> {
  const ctx = await ownPosting(id);
  if ("error" in ctx) return fail(ctx.error!);
  const parsed = postingSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form");
  const skills = cleanSkills(parsed.data.skills);
  if (!skills.length) return fail("List at least one skill: it powers the match score candidates see");
  if (parsed.data.deadline < istDate(Date.now())) return fail("The deadline is in the past");
  const res = await changePosting(ctx.p!.id, () => null, (p) => ({ ...p, ...parsed.data, skills, companyName: ctx.company.name }));
  return res.ok ? { ok: true } : fail(res.error);
}

export async function setPostingStatusAction(id: unknown, status: unknown): Promise<{ ok: true } | Fail> {
  const ctx = await ownPosting(id);
  if ("error" in ctx) return fail(ctx.error!);
  const s = z.enum(["draft", "open", "closed"]).safeParse(status);
  if (!s.success) return fail("Bad status");
  const res = await changePosting(
    ctx.p!.id,
    (p) => (s.data === "open" && (p.title.length < 3 || p.description.length < 80 || !p.skills.length) ? "Fill in the title, skills and description first" : s.data === "open" && p.deadline < istDate(Date.now()) ? "Move the deadline to a future date first" : null),
    (p) => ({ ...p, status: s.data, publishedAt: s.data === "open" ? (p.publishedAt ?? nowIso()) : p.publishedAt }),
  );
  return res.ok ? { ok: true } : fail(res.error);
}

export async function deletePostingAction(id: unknown): Promise<{ ok: true } | Fail> {
  const ctx = await ownPosting(id);
  if ("error" in ctx) return fail(ctx.error!);
  if ((await listApplications()).some((a) => a.postingId === ctx.p!.id)) return fail("This job has applicants. Close it instead.");
  await removePosting(ctx.p!.id);
  return { ok: true };
}

const moveSchema = z.object({ to: z.enum(STAGES), note: z.string().trim().max(500).catch("") });

export async function moveStageAction(applicationId: unknown, input: unknown): Promise<{ ok: true } | Fail> {
  const user = await signedIn();
  if (!user) return fail("Jobs are switched off right now");
  const company = await activeCompany(user.id);
  const a = uuid.safeParse(applicationId).success ? await getApplication(applicationId as string) : null;
  if (!company || !a || a.companyId !== company.id) return fail("Application not found");
  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return fail("Pick a stage");
  const p = await getPosting(a.postingId);
  if (!p) return fail("Job not found");
  const res = await moveStage(a, parsed.data.to, parsed.data.note, p);
  return res.ok ? { ok: true } : fail(res.error);
}

/* ================= Admin ================= */

export async function reviewCompanyAction(id: unknown, decision: unknown, note?: unknown): Promise<{ ok: true } | Fail> {
  await requireAdmin();
  const d = z.enum(["approved", "rejected", "suspended"]).safeParse(decision);
  if (!uuid.safeParse(id).success || !d.success) return fail("Bad request");
  const why = z.string().trim().max(300).catch("").parse(note ?? "");
  if (d.data !== "approved" && why.length < 5) return fail("Add a short reason for the recruiter");
  const res = await changeCompany(id as string, () => null, (c) => ({ ...c, status: d.data, adminNote: why || undefined }));
  if (!res.ok) return fail(res.error);
  const c = res.value;
  const title = d.data === "approved" ? `${c.name} is approved: start hiring!` : d.data === "rejected" ? `${c.name} wasn't approved` : `${c.name} is suspended`;
  await notify(c.ownerId, { kind: "account", title, body: d.data === "approved" ? "Post your first job from the Recruiter hub." : why, href: "/jobs/recruit" });
  return { ok: true };
}

export async function moderatePostingAction(id: unknown, action: unknown, reason?: unknown): Promise<{ ok: true } | Fail> {
  await requireAdmin();
  if (!uuid.safeParse(id).success) return fail("Job not found");
  const why = z.string().trim().max(300).catch("").parse(reason ?? "");
  if (action === "hide" && why.length < 5) return fail("Add a reason (the recruiter sees it)");
  if (action !== "hide" && action !== "restore") return fail("Bad action");
  const res = await changePosting(id as string, () => null, (p) => ({ ...p, hidden: action === "hide" ? { reason: why, at: nowIso() } : undefined }));
  return res.ok ? { ok: true } : fail(res.error);
}

export async function syncExternalAction(): Promise<{ ok: true; count: number } | Fail> {
  await requireAdmin();
  if (!rateLimit("jsync", 2, 60 * 60_000).ok) return fail("Remotive asks for at most a few syncs a day. Try again later.");
  try {
    return { ok: true, count: await syncRemotive() };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Sync failed");
  }
}
