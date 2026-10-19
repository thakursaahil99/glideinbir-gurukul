import type { Experience, JobType, Posting, Stage, WorkMode } from "./types";

/* ---------------- Skills & match score ---------------- */

/** Common spellings that mean the same skill. */
const ALIASES: Record<string, string> = {
  js: "javascript",
  "node.js": "node",
  nodejs: "node",
  "react.js": "react",
  reactjs: "react",
  "next.js": "next",
  nextjs: "next",
  ts: "typescript",
  py: "python",
  "c plus plus": "c++",
  cpp: "c++",
  golang: "go",
  postgres: "postgresql",
  "ms excel": "excel",
  "microsoft excel": "excel",
  ml: "machine learning",
  ai: "artificial intelligence",
  "ui/ux": "ux",
  "ui ux": "ux",
  dsa: "data structures",
};

export const normSkill = (s: string) => {
  const k = s.trim().toLowerCase().replace(/\s+/g, " ");
  return ALIASES[k] ?? k;
};

export function cleanSkills(list: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of list) {
    const t = s.trim().replace(/\s+/g, " ");
    if (t.length < 1 || t.length > 30 || seen.has(normSkill(t))) continue;
    seen.add(normSkill(t));
    out.push(t);
  }
  return out.slice(0, 20);
}

/**
 * Share of the job's skills the candidate has (0–100), plus which ones matched and which
 * are missing. A job without listed skills scores null (nothing to compare).
 */
export function matchScore(jobSkills: string[], mySkills: string[]) {
  const job = [...new Set(jobSkills.map(normSkill))].filter(Boolean);
  const mine = new Set(mySkills.map(normSkill));
  if (!job.length) return { score: null, matched: [] as string[], missing: [] as string[] };
  const matched = jobSkills.filter((s) => mine.has(normSkill(s)));
  const missing = jobSkills.filter((s) => !mine.has(normSkill(s)));
  return { score: Math.round((new Set(matched.map(normSkill)).size / job.length) * 100), matched, missing };
}

/* ---------------- Search ---------------- */

export interface JobFilters {
  q: string;
  type: JobType | null;
  workMode: WorkMode | null;
  experience: Experience | null;
  location: string;
}

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9+#.]+/).filter((w) => w.length > 1);

/** Every query word must appear somewhere in the title, company, skills or location. */
export function matchesQuery(text: string, q: string) {
  const hay = text.toLowerCase();
  return words(q).every((w) => hay.includes(w));
}

export function filterPostings<T extends Pick<Posting, "title" | "companyName" | "skills" | "location" | "type" | "workMode" | "experience" | "description">>(list: T[], f: JobFilters) {
  return list.filter(
    (p) =>
      (!f.type || p.type === f.type) &&
      (!f.workMode || p.workMode === f.workMode) &&
      (!f.experience || p.experience === f.experience) &&
      (!f.location || p.location.toLowerCase().includes(f.location.toLowerCase()) || (p.workMode === "remote" && /remote/i.test(f.location))) &&
      (!f.q || matchesQuery(`${p.title} ${p.companyName} ${p.skills.join(" ")} ${p.location} ${p.description.slice(0, 600)}`, f.q)),
  );
}

/* ---------------- Dates & money ---------------- */

export const istDate = (ms: number) => new Date(ms + 330 * 60_000).toISOString().slice(0, 10);
/** Open = published, not hidden, before or on its deadline (IST). */
export const isOpen = (p: Pick<Posting, "status" | "hidden" | "deadline">, now: number) => p.status === "open" && !p.hidden && p.deadline >= istDate(now);

/** "6–9 LPA", "₹15,000–20,000/mo", "Not disclosed". */
export function salaryText(p: Pick<Posting, "salaryMin" | "salaryMax" | "salaryUnit">) {
  const lo = p.salaryMin || p.salaryMax;
  const hi = p.salaryMax || p.salaryMin;
  if (!hi) return "Not disclosed";
  const lakh = (n: number) => String(Math.round((n / 100_000) * 10) / 10);
  const inr = (n: number) => n.toLocaleString("en-IN");
  if (p.salaryUnit === "year" && lo >= 100_000) return lo === hi ? `${lakh(hi)} LPA` : `${lakh(lo)}–${lakh(hi)} LPA`;
  const unit = p.salaryUnit === "year" ? "/yr" : "/mo";
  return lo === hi ? `₹${inr(hi)}${unit}` : `₹${inr(lo)}–${inr(hi)}${unit}`;
}

export const TYPE_LABEL: Record<JobType, string> = { "full-time": "Full-time", internship: "Internship", "part-time": "Part-time", contract: "Contract" };
export const MODE_LABEL: Record<WorkMode, string> = { onsite: "On-site", hybrid: "Hybrid", remote: "Remote" };
export const EXP_LABEL: Record<Experience, string> = { fresher: "Fresher", "0-2": "0–2 yrs", "2-5": "2–5 yrs", "5+": "5+ yrs" };

/* ---------------- Pipeline ---------------- */

export const STAGE_LABEL: Record<Stage, string> = { applied: "Applied", shortlisted: "Shortlisted", interview: "Interview", hired: "Hired", rejected: "Not selected" };

/** Recruiters move candidates forward, or close them out; hired/rejected are final. */
export function canMove(from: Stage, to: Stage) {
  if (from === to) return false;
  if (from === "hired" || from === "rejected") return false;
  const order: Stage[] = ["applied", "shortlisted", "interview", "hired"];
  return to === "rejected" || order.indexOf(to) > order.indexOf(from);
}

/** Plain text from HTML (for external descriptions; never rendered as HTML). */
export function htmlToText(html: string) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|li|h\d|div)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}
