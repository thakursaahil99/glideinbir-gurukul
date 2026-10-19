export const ROLES = ["student", "instructor", "tutor", "mentor", "vendor", "recruiter", "admin"] as const;
export type Role = (typeof ROLES)[number];

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  blocked: boolean;
  createdAt: string;
  updatedAt: string;
}
