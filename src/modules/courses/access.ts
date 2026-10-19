import type { PublicUser } from "@/core/auth/roles";
import { listUsers } from "@/core/auth/users";
import { getSite } from "@/core/site/store";
import { canAccessLecture } from "./logic";
import { isEnrolled } from "./store";
import type { Course, Lecture } from "./types";
import { mediaUrl } from "./urls";

export async function coursesEnabled() {
  return (await getSite()).modules.find((m) => m.key === "courses")?.enabled ?? false;
}

export const canTeach = (user: Pick<PublicUser, "role">) => user.role === "instructor" || user.role === "admin";

export const ownsOrAdmin = (course: Pick<Course, "instructorId">, user: Pick<PublicUser, "id" | "role">) =>
  course.instructorId === user.id || user.role === "admin";

export interface Viewer {
  isOwnerOrAdmin: boolean;
  enrolled: boolean;
}

export async function viewerOf(course: Course, user: PublicUser | null): Promise<Viewer> {
  if (!user) return { isOwnerOrAdmin: false, enrolled: false };
  return { isOwnerOrAdmin: ownsOrAdmin(course, user), enrolled: await isEnrolled(user.id, course.id) };
}

/** A lecture as the browser may see it: locked lectures carry no video or notes source at all. */
export type LectureView = Omit<Lecture, "video" | "notes"> & {
  locked: boolean;
  video: Lecture["video"];
  notes: { name: string; url: string } | null;
};
export type CourseView = Omit<Course, "sections"> & { sections: { id: string; title: string; lectures: LectureView[] }[] };


export function toCourseView(course: Course, viewer: Viewer): CourseView {
  return {
    ...course,
    sections: course.sections.map((s) => ({
      id: s.id,
      title: s.title,
      lectures: s.lectures.map((l) => {
        const open = canAccessLecture(l, viewer);
        return {
          ...l,
          locked: !open,
          video: open ? l.video : null,
          notes: open && l.notes ? { name: l.notes.name, url: mediaUrl(course.id, l.notes.src) } : null,
        };
      }),
    })),
  };
}

export async function userNames(): Promise<Map<string, string>> {
  return new Map((await listUsers()).map((u) => [u.id, u.name]));
}
