/**
 * Pure Test Series logic (no I/O): evaluation, ranking, timers, the client-safe
 * view of a test, and CSV import. Unit-tested in tests/test-series.test.ts.
 */
import type { Answer, Attempt, AttemptResult, Question, QuestionResult, Test, TopicResult } from "./types";

export const RESERVED_SLUGS = new Set(["my", "teach", "new", "attempt", "result", "api"]);

export function slugify(title: string) {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "test";
}

export function uniqueSlug(title: string, taken: Set<string>) {
  const base = slugify(title);
  let slug = base;
  for (let n = 2; taken.has(slug) || RESERVED_SLUGS.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

export const allQuestions = (t: Pick<Test, "sections">): Question[] => t.sections.flatMap((s) => s.questions);

export const maxScore = (t: Pick<Test, "sections">) => round2(allQuestions(t).reduce((s, q) => s + q.marks, 0));

const round2 = (n: number) => Math.round(n * 100) / 100;

/* ---------------- Evaluation (server only) ---------------- */

export function isAnswered(q: Question, a: Answer | undefined): boolean {
  if (!a) return false;
  return q.type === "numeric" ? a.value !== null && Number.isFinite(a.value) : a.selected.length > 0;
}

export function isCorrect(q: Question, a: Answer): boolean {
  if (q.type === "numeric") {
    if (!q.numeric || a.value === null || !Number.isFinite(a.value)) return false;
    // Small epsilon so 0.1 + 0.2 style float noise never flips a right answer.
    return Math.abs(a.value - q.numeric.value) <= q.numeric.tolerance + 1e-9;
  }
  const given = new Set(a.selected);
  const right = new Set(q.correct);
  return given.size === right.size && [...right].every((id) => given.has(id));
}

export function evaluate(test: Pick<Test, "sections">, answers: Record<string, Answer>, timeSpent: Record<string, number>): AttemptResult {
  const questions: QuestionResult[] = [];
  const topics = new Map<string, TopicResult>();
  let score = 0;
  let correct = 0;
  let wrong = 0;
  let skipped = 0;

  for (const q of allQuestions(test)) {
    const a = answers[q.id];
    let outcome: QuestionResult["outcome"];
    let marks = 0;
    if (!isAnswered(q, a)) {
      outcome = "skipped";
      skipped++;
    } else if (isCorrect(q, a!)) {
      outcome = "correct";
      marks = q.marks;
      correct++;
    } else {
      outcome = "wrong";
      marks = -q.negative;
      wrong++;
    }
    score += marks;
    questions.push({ questionId: q.id, outcome, marks, timeSec: Math.round(timeSpent[q.id] ?? 0) });

    const key = q.topic.trim() || "General";
    const t = topics.get(key) ?? { topic: key, correct: 0, wrong: 0, skipped: 0, score: 0, max: 0 };
    t[outcome]++;
    t.score = round2(t.score + marks);
    t.max = round2(t.max + q.marks);
    topics.set(key, t);
  }

  const attempted = correct + wrong;
  return {
    score: round2(score),
    maxScore: maxScore(test),
    correct,
    wrong,
    skipped,
    accuracy: attempted ? Math.round((correct / attempted) * 1000) / 10 : 0,
    timeTakenSec: questions.reduce((s, q) => s + q.timeSec, 0),
    questions,
    topics: [...topics.values()].sort((x, y) => x.topic.localeCompare(y.topic)),
  };
}

/* ---------------- Ranking ---------------- */

export interface Standing {
  rank: number;
  percentile: number;
  total: number;
}

/**
 * Rank among submitted attempts by score (ties share a rank; faster time breaks
 * nothing, to keep it simple and fair). Percentile = share of candidates scoring
 * at or below you, so the topper is 100.
 */
export function standing(myScore: number, allScores: number[]): Standing {
  const total = allScores.length;
  if (!total) return { rank: 1, percentile: 100, total: 1 };
  const above = allScores.filter((s) => s > myScore).length;
  const atOrBelow = allScores.filter((s) => s <= myScore).length;
  return { rank: above + 1, percentile: Math.round((atOrBelow / total) * 10000) / 100, total };
}

/* ---------------- Timer ---------------- */

/** Answers are accepted for a few seconds past the deadline to absorb network latency. */
export const GRACE_MS = 5_000;

export const remainingSec = (a: Pick<Attempt, "deadline">, now = Date.now()) => Math.max(0, Math.ceil((Date.parse(a.deadline) - now) / 1000));

export const isExpired = (a: Pick<Attempt, "deadline">, now = Date.now()) => now > Date.parse(a.deadline) + GRACE_MS;

/* ---------------- Client-safe view ---------------- */

/** A question as the browser may see it during an attempt: no correct answers, no explanation. */
export type PublicQuestion = Omit<Question, "correct" | "numeric" | "explanation">;

export function publicQuestion(q: Question): PublicQuestion {
  return { id: q.id, type: q.type, text: q.text, image: q.image, options: q.options, marks: q.marks, negative: q.negative, topic: q.topic };
}

/* ---------------- Publish checks ---------------- */

export function questionProblems(q: Question): string | null {
  if (q.text.trim().length < 3) return "has no question text";
  if (q.marks <= 0) return "needs positive marks";
  if (q.negative < 0) return "has a negative mark below 0";
  if (q.type === "numeric") return q.numeric && Number.isFinite(q.numeric.value) ? null : "needs a numeric answer";
  if (q.options.length < 2) return "needs at least 2 options";
  if (q.options.some((o) => !o.text.trim())) return "has an empty option";
  const ids = new Set(q.options.map((o) => o.id));
  if (!q.correct.length || q.correct.some((id) => !ids.has(id))) return "needs a correct option";
  if (q.type === "single" && q.correct.length !== 1) return "must have exactly one correct option";
  return null;
}

export function publishProblems(t: Test): string[] {
  const problems: string[] = [];
  if (t.title.trim().length < 5) problems.push("Add a title of at least 5 characters");
  if (t.durationMin < 1) problems.push("Set a duration of at least 1 minute");
  const qs = allQuestions(t);
  if (!qs.length) problems.push("Add at least one question");
  if (t.sections.some((s) => !s.questions.length)) problems.push("Remove or fill empty sections");
  t.sections.forEach((s) =>
    s.questions.forEach((q, i) => {
      const p = questionProblems(q);
      if (p) problems.push(`${s.title} Q${i + 1} ${p}`);
    }),
  );
  return problems.slice(0, 12);
}

/* ---------------- CSV import ---------------- */

/** RFC 4180-ish CSV: quoted fields, escaped quotes (""), commas and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

export const CSV_HEADER = ["section", "type", "question", "option_a", "option_b", "option_c", "option_d", "correct", "marks", "negative", "topic", "explanation"] as const;

export const CSV_TEMPLATE = [
  CSV_HEADER.join(","),
  'Physics,single,"A body moves 20 m in 4 s. Its speed in m/s?",2,4,5,8,C,4,1,Kinematics,"speed = distance / time = 20 / 4 = 5"',
  'Physics,multiple,"Which are vector quantities?",Velocity,Mass,Force,Time,"A;C",4,2,Vectors,"Velocity and force have direction"',
  'Maths,numeric,"Value of 12 x 12?",,,,,144,4,0,Arithmetic,"12 x 12 = 144"',
].join("\n");

export interface CsvImport {
  sections: { title: string; questions: Question[] }[];
  errors: string[];
}

/**
 * Turns a CSV into sections and questions. `correct` is a letter (C), letters
 * joined with ; (A;C), or for numeric a number with optional tolerance (3.14|0.01).
 */
export function importQuestionsCsv(text: string, newId: () => string, defaults = { marks: 4, negative: 1 }): CsvImport {
  const rows = parseCsv(text);
  const errors: string[] = [];
  if (!rows.length) return { sections: [], errors: ["The file is empty"] };
  const header = rows[0]!.map((h) => h.trim().toLowerCase());
  const col = (name: (typeof CSV_HEADER)[number]) => header.indexOf(name);
  if (col("question") < 0 || col("type") < 0 || col("correct") < 0) return { sections: [], errors: ["Header must include at least: type, question, correct (see the template)"] };

  const bySection = new Map<string, Question[]>();
  rows.slice(1).forEach((r, i) => {
    const line = i + 2;
    const get = (name: (typeof CSV_HEADER)[number]) => (col(name) >= 0 ? (r[col(name)] ?? "").trim() : "");
    const type = get("type").toLowerCase();
    if (type !== "single" && type !== "multiple" && type !== "numeric") return errors.push(`Line ${line}: type must be single, multiple or numeric`);
    const num = (s: string, d: number) => (s === "" ? d : Number(s));
    const marks = num(get("marks"), defaults.marks);
    const negative = num(get("negative"), type === "numeric" ? 0 : defaults.negative);
    if (!Number.isFinite(marks) || marks <= 0 || !Number.isFinite(negative) || negative < 0) return errors.push(`Line ${line}: marks/negative must be numbers`);

    const q: Question = {
      id: newId(),
      type,
      text: get("question"),
      image: null,
      options: [],
      correct: [],
      numeric: null,
      marks,
      negative,
      topic: get("topic") || "General",
      explanation: get("explanation"),
    };
    if (!q.text) return errors.push(`Line ${line}: question text is empty`);

    if (type === "numeric") {
      const [v, tol] = get("correct").split("|");
      const value = Number(v);
      const tolerance = tol === undefined ? 0 : Number(tol);
      if (!v || !Number.isFinite(value) || !Number.isFinite(tolerance) || tolerance < 0) return errors.push(`Line ${line}: numeric answer must look like 42 or 3.14|0.01`);
      q.numeric = { value, tolerance };
    } else {
      const letters = ["a", "b", "c", "d"] as const;
      letters.forEach((l) => {
        const t = get(`option_${l}`);
        if (t) q.options.push({ id: newId(), text: t });
      });
      if (q.options.length < 2) return errors.push(`Line ${line}: needs at least 2 options`);
      const picks = get("correct").toUpperCase().split(/[;,\s]+/).filter(Boolean);
      const idx = picks.map((p) => p.charCodeAt(0) - 65);
      if (!idx.length || idx.some((n) => n < 0 || n >= q.options.length)) return errors.push(`Line ${line}: correct must be option letters like C or A;C`);
      if (type === "single" && idx.length !== 1) return errors.push(`Line ${line}: single-choice needs exactly one correct letter`);
      q.correct = [...new Set(idx)].map((n) => q.options[n]!.id);
    }
    const section = get("section") || "Section 1";
    bySection.set(section, [...(bySection.get(section) ?? []), q]);
  });

  return { sections: [...bySection].map(([title, questions]) => ({ title, questions })), errors };
}

export function formatClock(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(s).padStart(2, "0")}`;
}
