import { z } from "zod";
import { EXAMS, QUESTION_TYPES } from "./types";

const id = z.string().uuid();
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #ff8a00");

const questionSchema = z.object({
  id,
  type: z.enum(QUESTION_TYPES),
  text: z.string().trim().max(4000),
  image: z
    .string()
    .url()
    .max(500)
    .refine((u) => u.startsWith("https://"), "Images must use https")
    .nullable(),
  options: z.array(z.object({ id, text: z.string().trim().max(500) })).max(8),
  correct: z.array(id).max(8),
  numeric: z.object({ value: z.number().finite(), tolerance: z.number().min(0).max(1e6) }).nullable(),
  marks: z.number().min(0).max(100),
  negative: z.number().min(0).max(100),
  topic: z.string().trim().max(60),
  explanation: z.string().trim().max(4000),
});

/** Everything the instructor edits in one save. Owner, status and slug are server-controlled. */
export const testDraftSchema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(120),
  description: z.string().trim().max(3000),
  exam: z.enum(EXAMS),
  durationMin: z.number().int().min(1, "At least 1 minute").max(600, "Max 10 hours"),
  priceRupees: z.number().int("Use whole rupees").min(0).max(50_000),
  colors: z.tuple([hex, hex]),
  instructions: z.array(z.string().trim().min(1).max(300)).max(15),
  sections: z
    .array(z.object({ id, title: z.string().trim().min(1, "Section title is required").max(80), questions: z.array(questionSchema).max(300) }))
    .max(10),
});
export type TestDraft = z.infer<typeof testDraftSchema>;

export const answerSchema = z.object({
  attemptId: id,
  questionId: id,
  selected: z.array(id).max(8),
  value: z.number().finite().nullable(),
  marked: z.boolean(),
  /** Seconds spent on this question since the last save. */
  timeDelta: z.number().min(0).max(3600),
});
