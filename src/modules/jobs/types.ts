/**
 * Jobs & Internships data model. JSON files with the `jobs_` prefix map to the Supabase tables
 * jobs_companies, jobs_postings, jobs_applications, jobs_saved (+ jobs_profiles, jobs_alerts,
 * jobs_external for the synced remote listings).
 */

export const JOB_TYPES = ["full-time", "internship", "part-time", "contract"] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const WORK_MODES = ["onsite", "hybrid", "remote"] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const EXPERIENCE = ["fresher", "0-2", "2-5", "5+"] as const;
export type Experience = (typeof EXPERIENCE)[number];

export const STAGES = ["applied", "shortlisted", "interview", "hired", "rejected"] as const;
export type Stage = (typeof STAGES)[number];

export type CompanyStatus = "pending" | "approved" | "rejected" | "suspended";

export interface Company {
  id: string;
  /** The recruiter who owns this company page. */
  ownerId: string;
  name: string;
  website: string;
  about: string;
  location: string;
  size: string;
  status: CompanyStatus;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Posting {
  id: string;
  companyId: string;
  companyName: string;
  postedBy: string;
  title: string;
  type: JobType;
  workMode: WorkMode;
  location: string;
  experience: Experience;
  /** Rupees; per year for jobs, per month for internships (see salaryUnit). 0 = not disclosed. */
  salaryMin: number;
  salaryMax: number;
  salaryUnit: "year" | "month";
  skills: string[];
  description: string;
  openings: number;
  /** Last day to apply (IST date). */
  deadline: string;
  status: "draft" | "open" | "closed";
  hidden?: { reason: string; at: string };
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface SeekerProfile {
  userId: string;
  headline: string;
  skills: string[];
  experience: Experience;
  location: string;
  about: string;
  links: { linkedin?: string; github?: string; portfolio?: string };
  resume: { file: string; name: string; bytes: number; updatedAt: string } | null;
  updatedAt: string;
}

export interface Application {
  id: string;
  postingId: string;
  companyId: string;
  userId: string;
  userName: string;
  email: string;
  /** Copy of the resume taken at apply time (data/uploads/jobs/applications/<id>.pdf). */
  resume: boolean;
  coverNote: string;
  /** Skill match when applying, 0–100. */
  score: number;
  skills: string[];
  stage: Stage;
  history: { stage: Stage; at: string; note?: string }[];
  withdrawn?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SavedJob {
  userId: string;
  /** Internal posting id, or "<source>:<id>" for an external listing. */
  jobId: string;
  /** External listings aren't stored by us, so a saved one keeps what's needed to show it. */
  snapshot?: { title: string; company: string; url: string; source: ExternalSource };
  createdAt: string;
}

export interface JobAlert {
  id: string;
  userId: string;
  query: string;
  type: JobType | null;
  workMode: WorkMode | null;
  /** Postings published after this are new for the next digest. */
  lastSentAt: string;
  createdAt: string;
}

export type ExternalSource = "adzuna" | "remotive";

/**
 * A listing from a job board API (Adzuna search across India, Remotive remote jobs).
 * Always shown with credit to the source and its own link to apply.
 */
export interface ExternalJob {
  id: string;
  source: ExternalSource;
  title: string;
  company: string;
  logo: string | null;
  url: string;
  category: string;
  type: string;
  location: string;
  salary: string;
  tags: string[];
  publishedAt: string;
  excerpt: string;
}
