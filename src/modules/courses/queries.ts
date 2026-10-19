import type { CardData } from "./components/catalog";
import { userNames } from "./access";
import { allLectures, totalDurationSec } from "./logic";
import { courseStatsMap, EMPTY_STATS, listCourses, listEnrollments } from "./store";
import type { Course, CourseStats } from "./types";

export function toCard(c: Course, stats: CourseStats, instructorName: string, enrolled: boolean): CardData {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    subtitle: c.subtitle,
    category: c.category,
    level: c.level,
    price: c.price,
    colors: c.colors,
    demo: c.demo,
    instructorName,
    lectures: allLectures(c).length,
    durationSec: totalDurationSec(c),
    stats,
    enrolled,
  };
}

/** Everything the catalog and dashboards need, loaded once. */
export async function loadCatalogContext(userId?: string) {
  const [courses, stats, names, mine] = await Promise.all([
    listCourses(),
    courseStatsMap(),
    userNames(),
    userId ? listEnrollments({ userId }) : Promise.resolve([]),
  ]);
  const enrolledIds = new Set(mine.map((e) => e.courseId));
  return {
    courses,
    statsOf: (id: string) => stats.get(id) ?? EMPTY_STATS,
    nameOf: (id: string) => names.get(id) ?? "Glideinbir Gurukul",
    enrolledIds,
    enrollments: mine,
  };
}
