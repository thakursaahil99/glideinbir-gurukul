import { toPublic, createUser, findUserByEmail } from "@/core/auth/users";
import { readJson, updateJson } from "@/core/db/json-store";
import { starterCourses } from "@/modules/courses/starter";
import { insertCourse, listCourses } from "@/modules/courses/store";
import { loadDemoProblems } from "@/modules/code/demo";
import { loadDemoNotes } from "@/modules/notes/demo";
import { starterTests } from "@/modules/tests/starter";
import { insertTest, listTests } from "@/modules/tests/store";

/**
 * Free starter content, so a fresh install never opens to empty modules: real courses
 * (embedded YouTube lectures from Harvard CS50, Khan Academy, Abdul Bari, freeCodeCamp),
 * free and paid tests, notes and coding problems.
 *
 * It runs once (recorded in data/starter_content.json); later deletions by admins stick.
 * Bump STARTER_VERSION to add new starter items: existing ones are matched by slug/title.
 * Lives in the app layer because it reaches into several modules.
 */
const STARTER_VERSION = 1;
const MARKER = "starter_content.json";
/** Curator account that owns the starter content (it can't sign in). */
const TEAM = { name: "Glideinbir Team", email: "team@glideinbir-gurukul.local" };

interface Marker {
  version: number;
  seededAt: string;
}
const parse = (raw: unknown): Marker | null => (raw && typeof raw === "object" && Number.isInteger((raw as Marker).version) ? (raw as Marker) : null);

const g = globalThis as unknown as { __ggStarter?: Promise<void> };

export function ensureStarterContent() {
  g.__ggStarter ??= seed().catch((e) => {
    // Never block the app on seeding; retry on the next request.
    console.error("[starter] seeding failed", e);
    g.__ggStarter = undefined;
  });
  return g.__ggStarter;
}

async function seed() {
  if ((parse(await readJson(MARKER))?.version ?? 0) >= STARTER_VERSION) return;

  const team = (await findUserByEmail(TEAM.email)) ?? (await createUser({ ...TEAM, role: "instructor", passwordHash: "disabled" }));
  const author = toPublic(team);

  const courseSlugs = new Set((await listCourses()).map((c) => c.slug));
  for (const c of starterCourses(author.id, courseSlugs)) await insertCourse(c);

  const testSlugs = new Set((await listTests()).map((t) => t.slug));
  for (const t of starterTests(author.id, testSlugs)) await insertTest(t);

  await loadDemoNotes(author);
  await loadDemoProblems(author);

  await updateJson(MARKER, parse, () => ({ version: STARTER_VERSION, seededAt: new Date().toISOString() }));
  console.info("[starter] free starter content added");
}
