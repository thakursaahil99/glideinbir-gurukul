/**
 * Pure courses logic (no I/O): access rules, progress, catalog filtering,
 * publish checks. Unit-tested in tests/courses.test.ts.
 */
import type { Course, CourseStats, Lecture, LectureProgress, Level } from "./types";

/** Paths under /courses that a slug must never shadow. */
export const RESERVED_SLUGS = new Set(["my", "teach", "new", "learn", "api"]);

export function slugify(title: string) {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "course";
}

/** First free slug: `kinematics`, `kinematics-2`, … */
export function uniqueSlug(title: string, taken: Set<string>) {
  const base = slugify(title);
  let slug = base;
  for (let n = 2; taken.has(slug) || RESERVED_SLUGS.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

export const allLectures = (c: Pick<Course, "sections">): Lecture[] => c.sections.flatMap((s) => s.lectures);

export const totalDurationSec = (c: Pick<Course, "sections">) => allLectures(c).reduce((s, l) => s + l.durationSec, 0);

export function findLecture(c: Pick<Course, "sections">, lectureId: string) {
  return allLectures(c).find((l) => l.id === lectureId) ?? null;
}

/** Who may open a lecture's video and notes. */
export function canAccessLecture(lecture: Lecture, viewer: { isOwnerOrAdmin: boolean; enrolled: boolean }) {
  return viewer.isOwnerOrAdmin || viewer.enrolled || lecture.preview;
}

/** Percent of lectures completed, 0–100, rounded down. */
export function progressPercent(course: Pick<Course, "sections">, rows: Pick<LectureProgress, "lectureId" | "completed">[]) {
  const ids = allLectures(course).map((l) => l.id);
  if (ids.length === 0) return 0;
  const done = new Set(rows.filter((r) => r.completed).map((r) => r.lectureId));
  return Math.floor((ids.filter((id) => done.has(id)).length / ids.length) * 100);
}

/** The lecture to open on "Continue": the first one not completed, else the last one touched, else the first. */
export function resumeLecture(course: Pick<Course, "sections">, rows: LectureProgress[]): Lecture | null {
  const lectures = allLectures(course);
  if (!lectures.length) return null;
  const done = new Set(rows.filter((r) => r.completed).map((r) => r.lectureId));
  const next = lectures.find((l) => !done.has(l.id));
  if (next) return next;
  const last = [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  return (last && lectures.find((l) => l.id === last.lectureId)) || lectures[0]!;
}

/** Watching this far into a video counts as completing it. */
export const COMPLETE_AT = 0.9;
export const isWatched = (positionSec: number, durationSec: number) => durationSec > 0 && positionSec >= durationSec * COMPLETE_AT;

/** Reasons a course can't be published yet; empty means ready. */
export function publishProblems(c: Course): string[] {
  const problems: string[] = [];
  if (c.title.trim().length < 5) problems.push("Add a title of at least 5 characters");
  if (c.description.trim().length < 30) problems.push("Write a description of at least 30 characters");
  const lectures = allLectures(c);
  if (lectures.length === 0) problems.push("Add at least one lecture");
  const noVideo = lectures.filter((l) => !l.video).length;
  if (noVideo) problems.push(`${noVideo} lecture${noVideo > 1 ? "s have" : " has"} no video`);
  if (c.sections.some((s) => s.lectures.length === 0)) problems.push("Remove or fill empty sections");
  return problems;
}

/** Accepts youtu.be/ID, youtube.com/watch?v=ID, /embed/ID, /shorts/ID, or a bare 11-char id. */
export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return /^[\w-]{11}$/.test(u.pathname.slice(1)) ? u.pathname.slice(1) : null;
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const v = u.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return v;
      const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/);
      return m ? m[1]! : null;
    }
  } catch {}
  return null;
}

export function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h) return `${h}h ${m}m`;
  if (m) return s && m < 10 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}

/** mm:ss or h:mm:ss for player-style timestamps. */
export function clock(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

export function averageRating(ratings: number[]) {
  if (!ratings.length) return 0;
  return Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
}

/* ---------------- Catalog ---------------- */

export const SORTS = ["popular", "rating", "newest", "price-asc", "price-desc"] as const;
export type Sort = (typeof SORTS)[number];

export interface CatalogQuery {
  q?: string;
  category?: string;
  price?: "free" | "paid";
  minRating?: number;
  level?: Level;
  sort?: Sort;
}

export type CatalogItem = { course: Course; stats: CourseStats; instructorName: string };

export function filterCatalog(items: CatalogItem[], query: CatalogQuery): CatalogItem[] {
  const q = query.q?.trim().toLowerCase();
  const out = items.filter(({ course: c, stats, instructorName }) => {
    if (q && ![c.title, c.subtitle, c.category, instructorName, ...c.outcomes].some((t) => t.toLowerCase().includes(q))) return false;
    if (query.category && c.category !== query.category) return false;
    if (query.price === "free" && c.price !== 0) return false;
    if (query.price === "paid" && c.price === 0) return false;
    if (query.minRating && stats.rating < query.minRating) return false;
    if (query.level && c.level !== query.level) return false;
    return true;
  });
  const by: Record<Sort, (a: CatalogItem, b: CatalogItem) => number> = {
    popular: (a, b) => b.stats.students - a.stats.students || b.stats.rating - a.stats.rating,
    rating: (a, b) => b.stats.rating - a.stats.rating || b.stats.reviews - a.stats.reviews,
    newest: (a, b) => (b.course.publishedAt ?? "").localeCompare(a.course.publishedAt ?? ""),
    "price-asc": (a, b) => a.course.price - b.course.price,
    "price-desc": (a, b) => b.course.price - a.course.price,
  };
  return out.sort(by[query.sort ?? "popular"]);
}

/** Search params → a validated query (anything unknown is dropped). */
export function parseCatalogQuery(sp: Record<string, string | string[] | undefined>, categories: readonly string[], levels: readonly string[]): CatalogQuery {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const minRating = Number(one("rating"));
  return {
    q: one("q")?.slice(0, 80),
    category: categories.includes(one("category") ?? "") ? one("category") : undefined,
    price: one("price") === "free" || one("price") === "paid" ? (one("price") as "free" | "paid") : undefined,
    minRating: [3, 4, 4.5].includes(minRating) ? minRating : undefined,
    level: levels.includes(one("level") ?? "") ? (one("level") as Level) : undefined,
    sort: (SORTS as readonly string[]).includes(one("sort") ?? "") ? (one("sort") as Sort) : undefined,
  };
}

/** Short, unambiguous certificate code: GG-XXXX-XXXX (no 0/O/1/I). */
export function certificateCode(random: () => number = Math.random) {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = () => Array.from({ length: 4 }, () => A[Math.floor(random() * A.length)]).join("");
  return `GG-${pick()}-${pick()}`;
}
