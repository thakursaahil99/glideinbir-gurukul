/** Client-safe URL helpers (no server imports). */
export const mediaUrl = (courseId: string, file: string) => `/api/courses/media/${courseId}/${file}`;
export const certificateUrl = (code: string) => `/api/courses/certificate/${code}`;
