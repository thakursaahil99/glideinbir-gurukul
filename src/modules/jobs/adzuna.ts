import { cleanSkills, htmlToText } from "./logic";
import type { ExternalJob, JobType } from "./types";

/**
 * Live job search across India through Adzuna's API (https://developer.adzuna.com).
 * Adzuna aggregates hundreds of thousands of Indian listings, so every city and category
 * has real results. Needs ADZUNA_APP_ID + ADZUNA_APP_KEY (free developer account); the keys
 * never leave the server. Their terms: show "Jobs by Adzuna" and send people to the
 * listing's redirect_url to apply. Results are cached briefly and calls are rate limited
 * to stay inside the free quota.
 */

const base = () => (process.env.ADZUNA_API_BASE || "https://api.adzuna.com/v1/api").replace(/\/+$/, "");
export const adzunaConfigured = () => !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);

export const CITIES = ["Bengaluru", "Mumbai", "Delhi", "Hyderabad", "Pune", "Chennai", "Kolkata", "Ahmedabad", "Noida", "Gurugram", "Jaipur", "Chandigarh", "Indore", "Lucknow", "Kochi", "Coimbatore"] as const;

/** Adzuna's category tags (shared across countries). Labels are refreshed from the API when possible. */
export const CATEGORIES: { tag: string; label: string }[] = [
  { tag: "it-jobs", label: "IT" },
  { tag: "engineering-jobs", label: "Engineering" },
  { tag: "sales-jobs", label: "Sales" },
  { tag: "accounting-finance-jobs", label: "Accounts & Finance" },
  { tag: "teaching-jobs", label: "Teaching" },
  { tag: "healthcare-nursing-jobs", label: "Healthcare" },
  { tag: "customer-services-jobs", label: "Customer service" },
  { tag: "pr-advertising-marketing-jobs", label: "Marketing" },
  { tag: "hr-jobs", label: "HR" },
  { tag: "admin-jobs", label: "Admin" },
  { tag: "logistics-warehouse-jobs", label: "Logistics" },
  { tag: "graduate-jobs", label: "Freshers & graduates" },
];
const CATEGORY_TAGS = new Set(CATEGORIES.map((c) => c.tag));

export interface AdzunaQuery {
  q: string;
  where: string;
  category: string | null;
  type: JobType | null;
  page: number;
}

export interface AdzunaPage {
  count: number;
  jobs: ExternalJob[];
  page: number;
  pageSize: number;
}

interface AdzunaResult {
  id: string | number;
  title?: string;
  description?: string;
  created?: string;
  redirect_url?: string;
  company?: { display_name?: string };
  location?: { display_name?: string; area?: string[] };
  category?: { label?: string; tag?: string };
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: string | number;
  contract_type?: string;
  contract_time?: string;
}

const PAGE_SIZE = 30;
const httpsOnly = (u: string | undefined) => (u && /^https:\/\//.test(u) ? u : null);
const lakh = (n: number) => `${Math.round((n / 100_000) * 10) / 10}`;

function salaryOf(r: AdzunaResult) {
  const lo = Math.round(r.salary_min ?? 0);
  const hi = Math.round(r.salary_max ?? 0);
  if (!lo && !hi) return "";
  // Adzuna reports yearly salaries; mark their estimates as such.
  const est = String(r.salary_is_predicted) === "1" ? " (est.)" : "";
  if (Math.max(lo, hi) >= 100_000) return `${lo && hi && lo !== hi ? `${lakh(lo)}–${lakh(hi)}` : lakh(hi || lo)} LPA${est}`;
  return `₹${(hi || lo).toLocaleString("en-IN")}/yr${est}`;
}

function typeOf(r: AdzunaResult, title: string) {
  if (/\bintern(ship)?\b/i.test(title)) return "internship";
  if (r.contract_type === "contract") return "contract";
  if (r.contract_time === "part_time") return "part-time";
  if (r.contract_time === "full_time" || r.contract_type === "permanent") return "full-time";
  return "";
}

export function mapAdzuna(r: AdzunaResult): ExternalJob | null {
  const url = httpsOnly(r.redirect_url);
  const title = htmlToText(r.title ?? "").slice(0, 140);
  if (!url || !title || r.id === undefined) return null;
  const company = (r.company?.display_name ?? "").trim().slice(0, 80) || "Company not disclosed";
  return {
    id: `adzuna:${String(r.id).replace(/[^\w-]/g, "").slice(0, 40)}`,
    source: "adzuna",
    title,
    company,
    logo: null,
    url,
    category: (r.category?.label ?? "Other").replace(/ Jobs$/, "").slice(0, 40),
    type: typeOf(r, title),
    location: (r.location?.display_name ?? "India").slice(0, 80),
    salary: salaryOf(r),
    tags: cleanSkills([]),
    publishedAt: r.created && !Number.isNaN(Date.parse(r.created)) ? new Date(r.created).toISOString() : new Date().toISOString(),
    excerpt: htmlToText(r.description ?? "").slice(0, 400),
  };
}

/* ---------------- Cache + rate limit ---------------- */

const CACHE_MS = 30 * 60_000;
const MAX_CACHE = 400;
/** Adzuna's free tier allows ~25 calls a minute; stay well under it across all users. */
const MAX_CALLS_PER_MIN = 20;

const g = globalThis as unknown as { __ggAdzuna?: { cache: Map<string, { at: number; value: AdzunaPage }>; calls: number[]; lastCount: Map<string, number> } };
const state = () => (g.__ggAdzuna ??= { cache: new Map(), calls: [], lastCount: new Map() });

export class AdzunaBusy extends Error {}

function normQuery(q: AdzunaQuery): AdzunaQuery {
  return {
    q: q.q.trim().toLowerCase().slice(0, 60),
    where: q.where.trim().slice(0, 40),
    category: q.category && CATEGORY_TAGS.has(q.category) ? q.category : null,
    type: q.type,
    page: Math.min(Math.max(1, Math.floor(q.page)), 30),
  };
}

export async function searchAdzuna(input: AdzunaQuery): Promise<AdzunaPage> {
  if (!adzunaConfigured()) throw new Error("Adzuna isn't configured");
  const q = normQuery(input);
  const key = JSON.stringify(q);
  const s = state();
  const hit = s.cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  const now = Date.now();
  s.calls = s.calls.filter((t) => now - t < 60_000);
  if (s.calls.length >= MAX_CALLS_PER_MIN) {
    if (hit) return hit.value; // stale beats nothing
    throw new AdzunaBusy("Lots of people are searching right now. Try again in a minute.");
  }
  s.calls.push(now);

  const params = new URLSearchParams({ app_id: process.env.ADZUNA_APP_ID!, app_key: process.env.ADZUNA_APP_KEY!, results_per_page: String(PAGE_SIZE), sort_by: "date", "content-type": "application/json" });
  const what = [q.q, q.type === "internship" ? "intern" : ""].filter(Boolean).join(" ");
  if (what) params.set("what", what);
  if (q.where && !/^(india|anywhere|all)$/i.test(q.where)) params.set("where", q.where);
  if (q.category) params.set("category", q.category);
  if (q.type === "full-time") params.set("full_time", "1");
  if (q.type === "part-time") params.set("part_time", "1");
  if (q.type === "contract") params.set("contract", "1");

  const res = await fetch(`${base()}/jobs/in/search/${q.page}?${params}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`Adzuna responded ${res.status}`);
  const body = (await res.json()) as { count?: number; results?: AdzunaResult[] };
  const value: AdzunaPage = { count: Math.max(0, Math.floor(body.count ?? 0)), jobs: (body.results ?? []).map(mapAdzuna).filter((j): j is ExternalJob => !!j), page: q.page, pageSize: PAGE_SIZE };

  s.cache.set(key, { at: Date.now(), value });
  if (s.cache.size > MAX_CACHE) s.cache.delete(s.cache.keys().next().value!);
  if (q.page === 1 && !q.q && !q.category && !q.type) s.lastCount.set(q.where || "India", value.count);
  return value;
}

/** Last known total for India (or a city), from earlier searches. No API call. */
export const knownCount = (where = "India") => state().lastCount.get(where) ?? null;
