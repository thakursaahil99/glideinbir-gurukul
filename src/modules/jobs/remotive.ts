import { cleanSkills, htmlToText } from "./logic";
import { getExternal, saveExternal } from "./store";
import type { ExternalJob } from "./types";

/**
 * Live remote jobs from Remotive's public API (https://remotive.com/api-documentation).
 * Their terms: credit Remotive and link to the job's Remotive URL, fetch at most ~4 times a day,
 * don't push the jobs to other boards, and don't gate them behind a signup (so they're also on
 * the public /remote-jobs page). Descriptions are reduced to a plain-text excerpt; HTML from
 * the feed is never rendered.
 */
const API = "https://remotive.com/api/remote-jobs?limit=300";
/** 8 hours: three syncs a day, inside Remotive's "max 4 times a day". */
export const SYNC_EVERY_MS = 8 * 60 * 60_000;

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  company_logo?: string | null;
  category?: string;
  tags?: string[];
  job_type?: string;
  publication_date?: string;
  candidate_required_location?: string;
  salary?: string;
  description?: string;
}

const httpsOnly = (u: string | null | undefined) => (u && /^https:\/\//.test(u) ? u : null);

export function mapRemotive(j: RemotiveJob): ExternalJob | null {
  const url = httpsOnly(j.url);
  if (!url || !j.title || !j.company_name) return null;
  return {
    id: `remotive:${j.id}`,
    source: "remotive",
    title: j.title.trim().slice(0, 140),
    company: j.company_name.trim().slice(0, 80),
    logo: httpsOnly(j.company_logo),
    url,
    category: (j.category ?? "Other").slice(0, 40),
    type: (j.job_type ?? "").replace(/_/g, "-").slice(0, 20),
    location: (j.candidate_required_location || "Worldwide").slice(0, 80),
    salary: (j.salary ?? "").slice(0, 60),
    tags: cleanSkills((j.tags ?? []).map(String)).slice(0, 10),
    publishedAt: j.publication_date ? new Date(`${j.publication_date.replace(/Z?$/, "Z")}`).toISOString() : new Date().toISOString(),
    excerpt: htmlToText(j.description ?? "").slice(0, 600),
  };
}

export async function syncRemotive() {
  const res = await fetch(API, { headers: { "User-Agent": "GlideinbirGurukul/1.0" }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Remotive responded ${res.status}`);
  const body = (await res.json()) as { jobs?: RemotiveJob[] };
  const jobs = (body.jobs ?? []).map(mapRemotive).filter((j): j is ExternalJob => !!j);
  if (!jobs.length) throw new Error("Remotive returned no jobs");
  await saveExternal(jobs);
  return jobs.length;
}

const g = globalThis as unknown as { __ggRemotive?: Promise<unknown> | null; __ggRemotiveFailedAt?: number };
/** After a failed sync, wait this long before trying again (never hammer their API). */
const RETRY_AFTER_FAIL_MS = 15 * 60_000;

/**
 * Returns the cached listings right away and refreshes them in the background when stale,
 * so a slow or failing feed never slows a page. Failures keep the previous listings.
 */
export async function externalJobs(now = Date.now()) {
  const cache = await getExternal();
  const stale = !cache.syncedAt || now - Date.parse(cache.syncedAt) > SYNC_EVERY_MS;
  const coolingDown = g.__ggRemotiveFailedAt !== undefined && now - g.__ggRemotiveFailedAt < RETRY_AFTER_FAIL_MS;
  if (stale && !g.__ggRemotive && !coolingDown) {
    g.__ggRemotive = syncRemotive()
      .then(() => {
        g.__ggRemotiveFailedAt = undefined;
      })
      .catch((e) => {
        g.__ggRemotiveFailedAt = Date.now();
        console.error("[jobs] Remotive sync failed", e instanceof Error ? e.message : e);
      })
      .finally(() => {
        g.__ggRemotive = null;
      });
    // The very first time there is nothing to show yet: wait for it (bounded by the fetch timeout).
    if (!cache.jobs.length) {
      await g.__ggRemotive;
      return getExternal();
    }
  }
  return cache;
}
