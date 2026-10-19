import { z } from "zod";
import { CATEGORIES, LEVELS } from "./types";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #ff8a00");
const id = z.string().uuid();
/** Upload file ids are `<uuid>.<ext>`; nothing that could walk out of the folder. */
export const fileId = z.string().regex(/^[0-9a-f-]{36}\.(mp4|webm|pdf)$/, "Invalid file");

const videoSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("youtube"), src: z.string().regex(/^[\w-]{11}$/, "Invalid YouTube video") }),
  z.object({
    kind: z.literal("url"),
    src: z
      .string()
      .url("Enter a full video link")
      .max(500)
      .refine((u) => u.startsWith("https://") || u.startsWith("http://localhost"), "Video links must use https"),
  }),
  z.object({ kind: z.literal("upload"), src: fileId }),
]);

const lectureSchema = z.object({
  id,
  title: z.string().trim().min(2, "Lecture title is too short").max(120),
  durationSec: z.number().int().min(0).max(24 * 3600),
  video: videoSchema.nullable(),
  notes: z.object({ src: fileId, name: z.string().trim().min(1).max(120) }).nullable(),
  preview: z.boolean(),
});

const sectionSchema = z.object({
  id,
  title: z.string().trim().min(2, "Section title is too short").max(120),
  lectures: z.array(lectureSchema).max(200),
});

/** Everything the instructor edits in one save. Ownership, status and slug are server-controlled. */
export const courseDraftSchema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(120),
  subtitle: z.string().trim().max(200),
  description: z.string().trim().max(5000),
  category: z.enum(CATEGORIES),
  level: z.enum(LEVELS),
  language: z.string().trim().min(2).max(30),
  /** Rupees in the form, stored as paise. */
  priceRupees: z.number().int("Use whole rupees").min(0).max(100_000, "Max ₹1,00,000"),
  colors: z.tuple([hex, hex]),
  outcomes: z.array(z.string().trim().min(1).max(120)).max(12),
  sections: z.array(sectionSchema).max(50),
});
export type CourseDraft = z.infer<typeof courseDraftSchema>;

export const reviewSchema = z.object({
  courseId: id,
  rating: z.number().int().min(1, "Pick a rating").max(5),
  text: z.string().trim().max(1000),
});

export const progressSchema = z.object({
  courseId: id,
  lectureId: id,
  positionSec: z.number().min(0).max(24 * 3600),
  completed: z.boolean().optional(),
});
