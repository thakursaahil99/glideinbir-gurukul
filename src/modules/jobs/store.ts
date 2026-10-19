import { readJson, updateJson } from "@/core/db/json-store";
import type { Application, Company, ExternalJob, JobAlert, Posting, SavedJob, SeekerProfile } from "./types";

const F = {
  companies: "jobs_companies.json",
  postings: "jobs_postings.json",
  applications: "jobs_applications.json",
  saved: "jobs_saved.json",
  profiles: "jobs_profiles.json",
  alerts: "jobs_alerts.json",
  external: "jobs_external.json",
};
const arr = <T>(raw: unknown): T[] => (Array.isArray(raw) ? (raw as T[]) : []);
export const nowIso = () => new Date().toISOString();

type Change<T> = { ok: true; value: T } | { ok: false; error: string; value: T | null };

/** Atomic compare-and-set on one row; `guard` runs inside the write queue. */
async function change<T>(file: string, match: (x: T) => boolean, guard: (x: T) => string | null, next: (x: T) => T): Promise<Change<T>> {
  let out: Change<T> = { ok: false, error: "Not found", value: null };
  await updateJson(file, arr<T>, (all) =>
    all.map((x) => {
      if (!match(x)) return x;
      const err = guard(x);
      if (err) {
        out = { ok: false, error: err, value: x };
        return x;
      }
      const v = next(x);
      out = { ok: true, value: v };
      return v;
    }),
  );
  return out;
}

async function insert<T>(file: string, row: T, guard: (all: T[]) => string | null = () => null): Promise<Change<T>> {
  let out: Change<T> = { ok: false, error: "Could not save", value: null };
  await updateJson(file, arr<T>, (all) => {
    const err = guard(all);
    if (err) {
      out = { ok: false, error: err, value: null };
      return all;
    }
    out = { ok: true, value: row };
    return [...all, row];
  });
  return out;
}

/* ---------------- Companies ---------------- */

export const listCompanies = async () => arr<Company>(await readJson(F.companies));
export const getCompany = async (id: string) => (await listCompanies()).find((c) => c.id === id) ?? null;
export const companyOf = async (ownerId: string) => (await listCompanies()).find((c) => c.ownerId === ownerId) ?? null;
export const insertCompany = (c: Company) => insert(F.companies, c, (all) => (all.some((x) => x.ownerId === c.ownerId) ? "You already have a company page" : null));
export const changeCompany = (id: string, guard: (c: Company) => string | null, next: (c: Company) => Company) => change<Company>(F.companies, (c) => c.id === id, guard, (c) => ({ ...next(c), updatedAt: nowIso() }));

/* ---------------- Postings ---------------- */

export const listPostings = async () => arr<Posting>(await readJson(F.postings));
export const getPosting = async (id: string) => (await listPostings()).find((p) => p.id === id) ?? null;
export const insertPosting = (p: Posting) => insert(F.postings, p);
export const changePosting = (id: string, guard: (p: Posting) => string | null, next: (p: Posting) => Posting) => change<Posting>(F.postings, (p) => p.id === id, guard, (p) => ({ ...next(p), updatedAt: nowIso() }));
export const removePosting = (id: string) => updateJson(F.postings, arr<Posting>, (all) => all.filter((p) => p.id !== id));

/* ---------------- Applications ---------------- */

export const listApplications = async () => arr<Application>(await readJson(F.applications));
export const getApplication = async (id: string) => (await listApplications()).find((a) => a.id === id) ?? null;
/** One application per person per job (a withdrawn one can be replaced by re-applying). */
export const insertApplication = (a: Application) =>
  insert(F.applications, a, (all) => (all.some((x) => x.userId === a.userId && x.postingId === a.postingId && !x.withdrawn) ? "You've already applied to this job" : null));
export const changeApplication = (id: string, guard: (a: Application) => string | null, next: (a: Application) => Application) =>
  change<Application>(F.applications, (a) => a.id === id, guard, (a) => ({ ...next(a), updatedAt: nowIso() }));

/* ---------------- Saved jobs ---------------- */

export const listSaved = async (userId: string) => arr<SavedJob>(await readJson(F.saved)).filter((s) => s.userId === userId);
export async function toggleSaved(userId: string, jobId: string, snapshot?: SavedJob["snapshot"]) {
  let saved = false;
  await updateJson(F.saved, arr<SavedJob>, (all) => {
    const has = all.some((s) => s.userId === userId && s.jobId === jobId);
    saved = !has;
    if (has) return all.filter((s) => !(s.userId === userId && s.jobId === jobId));
    const mine = all.filter((s) => s.userId === userId).length;
    if (mine >= 200) return all; // a sane cap
    return [...all, { userId, jobId, ...(snapshot ? { snapshot } : {}), createdAt: nowIso() }];
  });
  return saved;
}

/* ---------------- Profiles ---------------- */

export const listProfiles = async () => arr<SeekerProfile>(await readJson(F.profiles));
export const getProfile = async (userId: string) => (await listProfiles()).find((p) => p.userId === userId) ?? null;
export async function upsertProfile(userId: string, next: (p: SeekerProfile | null) => SeekerProfile) {
  let out: SeekerProfile | undefined;
  await updateJson(F.profiles, arr<SeekerProfile>, (all) => {
    const i = all.findIndex((p) => p.userId === userId);
    out = { ...next(i >= 0 ? all[i]! : null), userId, updatedAt: nowIso() };
    if (i < 0) return [...all, out];
    const copy = all.slice();
    copy[i] = out;
    return copy;
  });
  return out!;
}

/* ---------------- Alerts ---------------- */

export const listAlerts = async () => arr<JobAlert>(await readJson(F.alerts));
export const insertAlert = (a: JobAlert) => insert(F.alerts, a, (all) => (all.filter((x) => x.userId === a.userId).length >= 5 ? "You can keep up to 5 job alerts" : all.some((x) => x.userId === a.userId && x.query === a.query && x.type === a.type && x.workMode === a.workMode) ? "You already have this alert" : null));
export const removeAlert = (id: string, userId: string) => updateJson(F.alerts, arr<JobAlert>, (all) => all.filter((a) => !(a.id === id && a.userId === userId)));
export const touchAlert = (id: string, at: string) => change<JobAlert>(F.alerts, (a) => a.id === id, () => null, (a) => ({ ...a, lastSentAt: at }));

/* ---------------- External (synced) ---------------- */

interface ExternalFile {
  syncedAt: string | null;
  jobs: ExternalJob[];
}
const parseExternal = (raw: unknown): ExternalFile => {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as ExternalFile).jobs)) return { syncedAt: null, jobs: [] };
  const f = raw as ExternalFile;
  // Files written before multi-source support have no `source`.
  return { syncedAt: f.syncedAt, jobs: f.jobs.map((j) => ({ ...j, source: j.source ?? "remotive" })) };
};
export const getExternal = async () => parseExternal(await readJson(F.external));
export const saveExternal = (jobs: ExternalJob[]) => updateJson(F.external, parseExternal, () => ({ syncedAt: nowIso(), jobs }));
