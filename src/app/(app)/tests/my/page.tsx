import { ArrowRight, Clock, Trophy } from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/core/auth/current";
import { canTeach, settleIfExpired, submittedAttempts } from "@/modules/tests/access";
import { TestCover, TestsTabs } from "@/modules/tests/components/bits";
import { standing } from "@/modules/tests/logic";
import { listAttempts, listTests } from "@/modules/tests/store";

export const metadata = { title: "My tests" };

export default async function MyTestsPage() {
  const user = await requireUser("/tests/my");
  const [tests, raw] = await Promise.all([listTests(), listAttempts({ userId: user.id })]);
  const byId = new Map(tests.map((t) => [t.id, t]));

  const rows = await Promise.all(
    raw.map(async (r) => {
      const test = byId.get(r.testId);
      if (!test) return null;
      const a = await settleIfExpired(r, test);
      const st = a.result ? standing(a.result.score, (await submittedAttempts(test.id)).map((x) => x.result!.score)) : null;
      return { a, test, st };
    }),
  );
  const items = rows.filter((x): x is NonNullable<typeof x> => !!x).sort((x, y) => y.a.startedAt.localeCompare(x.a.startedAt));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-muted uppercase">Test Series</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">My tests</h1>
        </div>
        <TestsTabs canTeach={canTeach(user)} />
      </div>

      {items.length === 0 ? (
        <div className="glass rounded-[28px] px-6 py-16 text-center">
          <p className="font-display text-2xl font-bold">No attempts yet</p>
          <p className="mt-2 text-muted">Your scores, ranks and solutions will collect here.</p>
          <Link href="/tests" className="mt-6 inline-block rounded-2xl bg-fg px-6 py-3 font-semibold text-bg">
            Find a test
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map(({ a, test, st }) => {
            const done = a.status === "submitted" && a.result;
            return (
              <li key={a.id}>
                <Link
                  href={done ? `/tests/${test.slug}/result/${a.id}` : `/tests/${test.slug}/attempt/${a.id}`}
                  className="glass group flex gap-4 overflow-hidden rounded-[24px] p-4 transition-transform hover:-translate-y-1"
                >
                  <TestCover colors={test.colors} exam={test.exam} className="hidden aspect-square w-24 shrink-0 rounded-2xl sm:block" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-display text-lg leading-snug font-bold">{test.title}</p>
                    <p className="text-xs text-muted">
                      {new Date(a.startedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    {done ? (
                      <div className="mt-3 flex flex-wrap gap-3 text-sm">
                        <span className="flex items-center gap-1.5 font-semibold">
                          <Trophy className="size-4 text-saffron" /> {a.result!.score}/{a.result!.maxScore}
                        </span>
                        {st && (
                          <span className="text-muted">
                            Rank #{st.rank} of {st.total} · {st.percentile} percentile
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-saffron">
                        <Clock className="size-4" /> In progress: resume now
                      </p>
                    )}
                  </div>
                  <ArrowRight className="size-5 self-center text-muted transition-transform group-hover:translate-x-1" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
