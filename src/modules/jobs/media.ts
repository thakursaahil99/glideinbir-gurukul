import path from "node:path";

/** Resumes live outside /public; only the owner, the recruiter they applied to and admins can read them. */
export const JOBS_DIR = path.join(process.cwd(), "data", "uploads", "jobs");
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export const resumePath = (userId: string, file: string) => path.join(JOBS_DIR, "resumes", userId, file);
export const applicationResumePath = (applicationId: string) => path.join(JOBS_DIR, "applications", `${applicationId}.pdf`);
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const RESUME_FILE_RE = /^[0-9a-f-]{36}\.pdf$/;
export const isPdf = (b: Uint8Array) => String.fromCharCode(...b.subarray(0, 5)) === "%PDF-";
