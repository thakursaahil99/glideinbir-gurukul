import { requireUser } from "@/core/auth/current";
import { CodeTabs } from "@/modules/code/components/bits";
import { Leaderboard } from "@/modules/code/components/manage";
import { canAuthor, leaderboard } from "@/modules/code/service";

export const metadata = { title: "Coding leaderboard" };

export default async function LeaderboardPage() {
  const user = await requireUser("/code/leaderboard");
  const rows = (await leaderboard()).slice(0, 100);
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-muted uppercase">Coding Practice</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">Leaderboard</h1>
        </div>
        <CodeTabs canAuthor={canAuthor(user)} />
      </div>
      <Leaderboard rows={rows.map(({ rank, userId, name, points, solved, streak }) => ({ rank, userId, name, points, solved, streak }))} me={user.id} />
    </div>
  );
}
