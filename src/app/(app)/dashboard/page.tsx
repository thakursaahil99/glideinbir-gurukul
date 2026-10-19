import type { Metadata } from "next";
import { ensureStarterContent } from "@/app/starter-content";
import { DashboardHome, type FreePick } from "@/components/shell/dashboard-home";
import type { ModuleKey } from "@/core/module-registry";
import { requireUser } from "@/core/auth/current";
import { getBalance } from "@/core/wallet/store";
import { listProblems } from "@/modules/code/store";
import { listCourses } from "@/modules/courses/store";
import { listMentors } from "@/modules/mentorship/store";
import { marketplace } from "@/modules/notes/queries";
import { listTests } from "@/modules/tests/store";
import { getExternal } from "@/modules/jobs/store";
import { livePostings } from "@/modules/jobs/service";
import { adzunaConfigured } from "@/modules/jobs/adzuna";

export const metadata: Metadata = { title: "Home" };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const hours = (sec: number) => (sec >= 3600 ? `${Math.round(sec / 360) / 10} h` : `${Math.max(1, Math.round(sec / 60))} min`);

export default async function DashboardPage() {
  const user = await requireUser();
  // Layout and page render in parallel: make sure starter content exists before reading.
  await ensureStarterContent();
  const [balance, courses, tests, notes, problems, mentors, jobs, remote] = await Promise.all([getBalance(user.id), listCourses(), listTests(), marketplace(), listProblems(), listMentors(), livePostings(), getExternal()]);

  const liveCourses = courses.filter((c) => c.status === "published");
  const liveTests = tests.filter((t) => t.status === "published");
  const liveProblems = problems.filter((p) => p.status === "published");
  const freeCourses = liveCourses.filter((c) => c.price === 0 && !c.demo);
  const freeTests = liveTests.filter((t) => t.price === 0 && !t.demo);
  const freeNotes = notes.filter((n) => n.price === 0);
  const easy = liveProblems.filter((p) => p.difficulty === "easy");

  const stats: Partial<Record<ModuleKey, string>> = {
    courses: freeCourses.length ? `${plural(freeCourses.length, "free course")} · ${liveCourses.length} total` : undefined,
    tests: freeTests.length ? `${plural(freeTests.length, "free test")} · ${liveTests.length} total` : undefined,
    notes: notes.length ? `${plural(freeNotes.length, "free note")} · ${notes.length} total` : undefined,
    code: liveProblems.length ? `${plural(liveProblems.length, "problem")}, all free` : undefined,
    mentorship: mentors.filter((m) => m.published).length ? plural(mentors.filter((m) => m.published).length, "mentor") : undefined,
    doubts: "Pay per minute",
    jobs: adzunaConfigured() ? "Live jobs in every city, free" : jobs.length + remote.jobs.length ? [jobs.length && plural(jobs.length, "job"), remote.jobs.length && `${remote.jobs.length} remote`].filter(Boolean).join(" · ") : undefined,
  };

  // Interleave kinds so the list feels varied: course, test, problem, notes, …
  const lanes: FreePick[][] = [
    freeCourses.map((c) => {
      const lectures = c.sections.flatMap((s) => s.lectures);
      return { kind: "course" as const, title: c.title, href: `/courses/${c.slug}`, meta: `${plural(lectures.length, "lecture")} · ${hours(lectures.reduce((s, l) => s + l.durationSec, 0))}` };
    }),
    freeTests.map((t) => ({ kind: "test" as const, title: t.title, href: `/tests/${t.slug}`, meta: `${plural(t.sections.reduce((s, x) => s + x.questions.length, 0), "question")} · ${t.durationMin} min` })),
    easy.concat(liveProblems.filter((p) => p.difficulty !== "easy")).map((p) => ({ kind: "code" as const, title: p.title, href: `/code/${p.slug}`, meta: `${p.difficulty[0]!.toUpperCase()}${p.difficulty.slice(1)} · ${p.tags.slice(0, 2).join(", ")}` })),
    freeNotes.map((n) => ({ kind: "notes" as const, title: n.title, href: `/notes/${n.id}`, meta: `${n.pages} pages · ${n.subject}` })),
  ];
  const picks: FreePick[] = [];
  for (let i = 0; picks.length < 13 && lanes.some((l) => l[i]); i++) for (const lane of lanes) if (lane[i] && picks.length < 13) picks.push(lane[i]!);

  return <DashboardHome userName={user.name} balance={balance} stats={stats} picks={picks} />;
}
