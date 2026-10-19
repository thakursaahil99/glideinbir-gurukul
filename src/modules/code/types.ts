/**
 * Coding Practice data model. JSON files with the `code_` prefix map to the Supabase
 * tables code_problems, code_testcases, code_submissions, code_streaks (+ code_comments).
 * Problems are stdin/stdout style: programs read the input and print the answer.
 */

export const LANGS = ["javascript", "python", "cpp", "java", "php"] as const;
export type Lang = (typeof LANGS)[number];

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export interface Problem {
  id: string;
  slug: string;
  title: string;
  /** Markdown (headings, lists, `code`, fenced blocks, **bold**). */
  statement: string;
  difficulty: Difficulty;
  tags: string[];
  starter: Partial<Record<Lang, string>>;
  timeLimitMs: number;
  memoryLimitMb: number;
  status: "draft" | "published";
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestCase {
  id: string;
  problemId: string;
  input: string;
  output: string;
  /** Sample tests are shown in the statement and used by Run; the rest stay on the server. */
  sample: boolean;
  explanation?: string;
}

export const VERDICTS = ["accepted", "wrong_answer", "time_limit", "runtime_error", "compile_error", "internal_error"] as const;
export type Verdict = (typeof VERDICTS)[number];

export interface CaseResult {
  verdict: Verdict;
  timeMs: number;
  stdout: string;
  stderr: string;
}

export interface Submission {
  id: string;
  problemId: string;
  userId: string;
  userName: string;
  lang: Lang;
  code: string;
  verdict: Verdict;
  passed: number;
  total: number;
  /** Slowest test. */
  timeMs: number;
  /** First failing test: details only when it is a sample (hidden tests stay hidden). */
  failed?: { index: number; sample: boolean; input?: string; expected?: string; got?: string; message?: string };
  createdAt: string;
}

export interface Streak {
  userId: string;
  current: number;
  best: number;
  /** IST date of the last day with an accepted submission. */
  lastDay: string;
  /** Recent active IST dates (for the activity heatmap), newest last. */
  days: string[];
}

export interface Comment {
  id: string;
  problemId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}
