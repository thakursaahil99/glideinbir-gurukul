import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { PublicUser } from "@/core/auth/roles";
import { findUserById } from "@/core/auth/users";
import { emailLayout, sendEmail } from "@/core/notifications/email";
import { notify } from "@/core/notifications/store";
import { getSite } from "@/core/site/store";
import { canMove, filterPostings, isOpen, matchScore, MODE_LABEL, salaryText, STAGE_LABEL, TYPE_LABEL } from "./logic";
import { applicationResumePath, resumePath } from "./media";
import { changeApplication, companyOf, getProfile, insertApplication, listAlerts, listCompanies, listPostings, nowIso, touchAlert } from "./store";
import type { Application, Company, Posting, Stage } from "./types";

export async function jobsEnabled() {
  return (await getSite()).modules.find((m) => m.key === "jobs")?.enabled ?? false;
}

/** Recruiting is company-based: an approved company page makes its owner a recruiter. */
export async function activeCompany(userId: string) {
  const c = await companyOf(userId);
  return c?.status === "approved" ? c : null;
}

/** Postings learners can see and apply to right now. */
export async function livePostings(now = Date.now()) {
  const [postings, companies] = await Promise.all([listPostings(), listCompanies()]);
  const approved = new Set(companies.filter((c) => c.status === "approved").map((c) => c.id));
  return postings.filter((p) => approved.has(p.companyId) && isOpen(p, now));
}

const appUrl = (p: string) => `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${p}`;

async function tell(userId: string, title: string, body: string, href: string, email = true) {
  await notify(userId, { kind: "module", title, body, href });
  if (!email) return;
  const u = await findUserById(userId);
  if (u) await sendEmail({ to: u.email, subject: title, html: emailLayout(title, [body], { label: "Open Glideinbir", url: appUrl(href) }) });
}

/* ---------------- Applying ---------------- */

export async function apply(user: PublicUser, p: Posting, coverNote: string): Promise<{ ok: true; application: Application } | { ok: false; error: string; needsProfile?: boolean }> {
  const profile = await getProfile(user.id);
  if (!profile?.resume || profile.skills.length === 0) return { ok: false, error: "Add your skills and upload a resume first. It takes a minute and every application reuses it.", needsProfile: true };
  const { score } = matchScore(p.skills, profile.skills);
  const now = nowIso();
  const app: Application = {
    id: randomUUID(),
    postingId: p.id,
    companyId: p.companyId,
    userId: user.id,
    userName: user.name,
    email: user.email,
    resume: true,
    coverNote,
    score: score ?? 0,
    skills: profile.skills,
    stage: "applied",
    history: [{ stage: "applied", at: now }],
    createdAt: now,
    updatedAt: now,
  };
  // Snapshot the resume so later edits to the profile don't change what the recruiter saw.
  const dest = applicationResumePath(app.id);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  try {
    await fs.copyFile(resumePath(user.id, profile.resume.file), dest);
  } catch {
    return { ok: false, error: "Your resume file is missing. Upload it again in your job profile.", needsProfile: true };
  }
  const res = await insertApplication(app);
  if (!res.ok) {
    await fs.rm(dest, { force: true });
    return { ok: false, error: res.error };
  }
  const company = (await listCompanies()).find((c) => c.id === p.companyId);
  if (company) await tell(company.ownerId, `New applicant for ${p.title}`, `${user.name} applied (${app.score}% skill match).`, `/jobs/recruit/${p.id}`, false);
  await tell(user.id, `Applied: ${p.title} at ${p.companyName}`, "Track your application status anytime in My applications.", "/jobs/applications", false);
  return { ok: true, application: app };
}

/** Recruiter moves a candidate along the pipeline. The candidate is told by notification + email. */
export async function moveStage(a: Application, to: Stage, note: string, p: Posting) {
  const res = await changeApplication(
    a.id,
    (x) => (x.withdrawn ? "The candidate withdrew this application" : canMove(x.stage, to) ? null : `Can't move from ${STAGE_LABEL[x.stage]} to ${STAGE_LABEL[to]}`),
    (x) => ({ ...x, stage: to, history: [...x.history, { stage: to, at: nowIso(), note: note || undefined }] }),
  );
  if (!res.ok) return res;
  const msg: Record<Stage, string> = {
    applied: "",
    shortlisted: `Good news! You've been shortlisted for ${p.title} at ${p.companyName}.`,
    interview: `${p.companyName} wants to interview you for ${p.title}.${note ? ` Details: ${note}` : " They'll contact you with the details."}`,
    hired: `Congratulations! ${p.companyName} has selected you for ${p.title}.${note ? ` ${note}` : ""}`,
    rejected: `${p.companyName} has moved ahead with other candidates for ${p.title}. Keep going: new roles are added every day.`,
  };
  await tell(a.userId, `${STAGE_LABEL[to]}: ${p.title}`, msg[to], "/jobs/applications");
  return res;
}

/* ---------------- Alerts ---------------- */

/**
 * Emails each alert's new matching postings (published since its last digest).
 * Run daily from /api/cron/jobs. Returns how many emails went out.
 */
export async function sendAlertDigests(now = Date.now()) {
  const [alerts, live] = await Promise.all([listAlerts(), livePostings(now)]);
  let sent = 0;
  for (const a of alerts) {
    const fresh = filterPostings(
      live.filter((p) => (p.publishedAt ?? p.createdAt) > a.lastSentAt),
      { q: a.query, type: a.type, workMode: a.workMode, experience: null, location: "" },
    );
    await touchAlert(a.id, new Date(now).toISOString());
    if (!fresh.length) continue;
    const label = [a.query, a.type && TYPE_LABEL[a.type], a.workMode && MODE_LABEL[a.workMode]].filter(Boolean).join(" · ") || "All jobs";
    const lines = fresh.slice(0, 10).map((p) => `${p.title} at ${p.companyName} (${MODE_LABEL[p.workMode]}, ${salaryText(p)})`);
    await notify(a.userId, { kind: "module", title: `${fresh.length} new job${fresh.length > 1 ? "s" : ""} for "${label}"`, body: lines.slice(0, 3).join("; "), href: "/jobs" });
    const u = await findUserById(a.userId);
    if (u) await sendEmail({ to: u.email, subject: `${fresh.length} new jobs for "${label}"`, html: emailLayout(`New jobs for "${label}"`, lines, { label: "See jobs", url: appUrl("/jobs") }) });
    sent++;
  }
  return sent;
}

export type CompanyCard = Pick<Company, "id" | "name" | "website" | "about" | "location" | "size">;
