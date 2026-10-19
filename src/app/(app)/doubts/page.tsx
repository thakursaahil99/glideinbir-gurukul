import type { Metadata } from "next";
import { requireUser } from "@/core/auth/current";
import { getSite } from "@/core/site/store";
import { getBalance } from "@/core/wallet/store";
import { AskForm, type SubjectStat } from "@/modules/doubts/components/ask-form";
import { DoubtsTabs } from "@/modules/doubts/components/bits";
import { isTutorOnline } from "@/modules/doubts/logic";
import { isTutorRole } from "@/modules/doubts/service";
import { listTutors } from "@/modules/doubts/store";
import { SUBJECTS } from "@/modules/doubts/types";

export async function generateMetadata(): Promise<Metadata> {
  const { modules } = await getSite();
  return { title: modules.find((m) => m.key === "doubts")?.name ?? "Instant Doubts" };
}

export default async function DoubtsPage() {
  const user = await requireUser("/doubts");
  const [tutors, balance] = await Promise.all([listTutors(), getBalance(user.id)]);
  const online = tutors.filter((t) => t.userId !== user.id && isTutorOnline(t));
  const stats: SubjectStat[] = SUBJECTS.map((subject) => {
    const rates = online.filter((t) => t.subjects.includes(subject)).map((t) => t.ratePerMinute);
    return { subject, online: rates.length, minRate: rates.length ? Math.min(...rates) : null };
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-muted uppercase">Instant Doubts</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Stuck? Get a tutor in <span className="bg-gradient-to-r from-[#ffb800] to-[#ff5e3a] bg-clip-text text-transparent">a minute</span>
          </h1>
        </div>
        <DoubtsTabs isTutor={isTutorRole(user)} />
      </div>
      <AskForm stats={stats} balance={balance} />
    </div>
  );
}
