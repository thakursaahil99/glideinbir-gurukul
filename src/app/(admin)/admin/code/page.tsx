import Link from "next/link";
import { AdminHeading } from "@/components/admin/admin-shell";
import { DemoProblemsButton } from "@/modules/code/components/manage";
import { LANG_INFO } from "@/modules/code/logic";
import { runnerInfo } from "@/modules/code/runner";
import { leaderboard } from "@/modules/code/service";
import { listProblems, listSubmissions } from "@/modules/code/store";

export const metadata = { title: "Coding" };

export default async function AdminCodePage() {
  const [problems, subs, board] = await Promise.all([listProblems(), listSubmissions(), leaderboard()]);
  const runner = runnerInfo();
  const today = new Date(Date.now() - 86_400_000).toISOString();
  const stats = [
    { label: "Live problems", value: `${problems.filter((p) => p.status === "published").length} / ${problems.length}` },
    { label: "Submissions (24h)", value: String(subs.filter((s) => s.createdAt > today).length) },
    { label: "Accepted overall", value: subs.length ? `${Math.round((subs.filter((s) => s.verdict === "accepted").length / subs.length) * 100)}%` : "—" },
    { label: "Coders on the board", value: String(board.length) },
  ];
  return (
    <>
      <AdminHeading title="Coding Practice" sub="Problems, the code runner and activity." />
      <div className="mb-5 grid gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-[24px] p-5">
            <p className="font-display text-3xl font-bold tabular-nums">{s.value}</p>
            <p className="mt-1 text-sm text-muted">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-5">
        <section className="glass rounded-[24px] p-5 sm:p-6">
          <h3 className="font-display text-lg font-bold">Code runner</h3>
          {runner.mode === "judge0" ? (
            <p className="mt-2 text-sm">
              <b className="text-teal">Judge0 connected.</b> All languages run in Judge0&apos;s sandbox.
            </p>
          ) : runner.mode === "local" ? (
            <p className="mt-2 text-sm">
              <b className="text-saffron">Local JavaScript runner.</b> Only JavaScript runs, in a restricted Node process. It can still reach the network, so don&apos;t use it on a public server. Set <code>JUDGE0_HOST</code> (+ <code>JUDGE0_API_KEY</code>) to enable {Object.values(LANG_INFO).map((l) => l.label).join(", ")}.
            </p>
          ) : (
            <p className="mt-2 text-sm">
              <b className="text-rose">No runner configured.</b> Learners can read problems but can&apos;t run code. Set <code>JUDGE0_HOST</code> (and <code>JUDGE0_API_KEY</code> for RapidAPI).
            </p>
          )}
        </section>
        <DemoProblemsButton />
        <section className="glass rounded-[24px] p-5 sm:p-6">
          <h3 className="font-display text-lg font-bold">Problems</h3>
          {problems.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No problems yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line text-sm">
              {problems.map((p) => {
                const ps = subs.filter((s) => s.problemId === p.id);
                return (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 py-2.5">
                    <Link href={`/code/manage/${p.id}`} className="font-semibold hover:underline">
                      {p.title}
                    </Link>
                    <span className="text-xs text-muted capitalize">
                      {p.difficulty} · {p.status} · by {p.authorName}
                    </span>
                    <span className="ml-auto text-xs text-muted tabular-nums">
                      {ps.filter((s) => s.verdict === "accepted").length}/{ps.length} accepted
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
