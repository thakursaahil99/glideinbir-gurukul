/**
 * Courses module data model. Stored as JSON files with the `courses_` prefix;
 * sections and lectures are nested inside the course document here and become
 * courses_sections / courses_lectures tables in the Supabase migration.
 */

export const CATEGORIES = [
  "Engineering (JEE)",
  "Medical (NEET)",
  "Civil Services",
  "Government Exams",
  "School (6–12)",
  "Programming",
  "Data & AI",
  "Design",
  "Business",
  "Languages",
  "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const LEVELS = ["beginner", "intermediate", "advanced", "all levels"] as const;
export type Level = (typeof LEVELS)[number];

export type CourseStatus = "draft" | "published" | "archived";

/** youtube: video id · url: direct mp4/webm link · upload: file id served by /api/courses/media */
export interface VideoSource {
  kind: "youtube" | "url" | "upload";
  src: string;
}

export interface NotesFile {
  /** Upload file id */
  src: string;
  name: string;
}

export interface Lecture {
  id: string;
  title: string;
  durationSec: number;
  video: VideoSource | null;
  notes: NotesFile | null;
  /** Free preview: watchable without buying. */
  preview: boolean;
}

export interface Section {
  id: string;
  title: string;
  lectures: Lecture[];
}

export interface Course {
  id: string;
  slug: string;
  instructorId: string;
  title: string;
  subtitle: string;
  description: string;
  category: Category;
  level: Level;
  language: string;
  /** Paise; 0 means free. */
  price: number;
  colors: [string, string];
  outcomes: string[];
  sections: Section[];
  status: CourseStatus;
  /** Created by "Load demo courses"; shown with a Demo badge. */
  demo?: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface Enrollment {
  id: string;
  courseId: string;
  userId: string;
  /** Paise actually paid (0 for free courses). */
  pricePaid: number;
  createdAt: string;
}

export interface LectureProgress {
  userId: string;
  courseId: string;
  lectureId: string;
  positionSec: number;
  completed: boolean;
  updatedAt: string;
}

export interface Review {
  id: string;
  courseId: string;
  userId: string;
  userName: string;
  rating: number;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface Certificate {
  code: string;
  courseId: string;
  userId: string;
  userName: string;
  courseTitle: string;
  instructorName: string;
  issuedAt: string;
}

export interface CourseSettings {
  /** Platform commission on each sale, in basis points (2000 = 20%). */
  commissionBps: number;
}

/** What catalog cards and detail pages need about ratings and reach. */
export interface CourseStats {
  students: number;
  rating: number;
  reviews: number;
}
