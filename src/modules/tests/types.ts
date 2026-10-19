/**
 * Test Series data model. Stored as JSON files with the `tests_` prefix;
 * sections, questions and options are nested inside the test document and become
 * tests_sections / tests_questions / tests_options tables in the Supabase migration.
 */

export const EXAMS = [
  "JEE Main",
  "JEE Advanced",
  "NEET",
  "UPSC",
  "SSC",
  "Banking",
  "GATE",
  "CAT",
  "School (6–12)",
  "Programming",
  "Other",
] as const;
export type Exam = (typeof EXAMS)[number];

export const QUESTION_TYPES = ["single", "multiple", "numeric"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export interface Option {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  /** Optional https image shown under the question. */
  image: string | null;
  /** single/multiple only. */
  options: Option[];
  /** single/multiple: ids of the correct options (exactly one for single). Never sent to the browser before submit. */
  correct: string[];
  /** numeric only. Answer counts as right when |given - value| <= tolerance. */
  numeric: { value: number; tolerance: number } | null;
  marks: number;
  /** Marks taken away for a wrong answer (0 = no negative marking). Skipped questions cost nothing. */
  negative: number;
  topic: string;
  explanation: string;
}

export interface TestSection {
  id: string;
  title: string;
  questions: Question[];
}

export type TestStatus = "draft" | "published" | "archived";

export interface Test {
  id: string;
  slug: string;
  instructorId: string;
  title: string;
  description: string;
  exam: Exam;
  /** Whole minutes. The server enforces it. */
  durationMin: number;
  /** Paise; 0 means free. */
  price: number;
  colors: [string, string];
  instructions: string[];
  sections: TestSection[];
  status: TestStatus;
  demo?: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

/** What the learner picked. `selected` for single/multiple, `value` for numeric. */
export interface Answer {
  selected: string[];
  value: number | null;
}

export type QuestionOutcome = "correct" | "wrong" | "skipped";

export interface QuestionResult {
  questionId: string;
  outcome: QuestionOutcome;
  marks: number;
  timeSec: number;
}

export interface TopicResult {
  topic: string;
  correct: number;
  wrong: number;
  skipped: number;
  score: number;
  max: number;
}

export interface AttemptResult {
  score: number;
  maxScore: number;
  correct: number;
  wrong: number;
  skipped: number;
  /** correct / attempted, 0–100 */
  accuracy: number;
  timeTakenSec: number;
  questions: QuestionResult[];
  topics: TopicResult[];
}

export interface Attempt {
  id: string;
  testId: string;
  userId: string;
  userName: string;
  startedAt: string;
  /** Server-side end of the attempt. Answers after this are refused; the attempt is then auto-submitted. */
  deadline: string;
  status: "in_progress" | "submitted";
  submittedAt?: string;
  /** How it ended: the learner pressed Submit, or time ran out. */
  submitReason?: "manual" | "timeout";
  answers: Record<string, Answer>;
  /** Question ids flagged "mark for review". */
  marked: string[];
  /** Seconds spent per question, reported by the client (clamped server-side). */
  timeSpent: Record<string, number>;
  result?: AttemptResult;
}

export interface TestPurchase {
  id: string;
  testId: string;
  userId: string;
  pricePaid: number;
  createdAt: string;
}

export interface TestSettings {
  commissionBps: number;
}
