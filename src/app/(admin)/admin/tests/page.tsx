import { AdminHeading } from "@/components/admin/admin-shell";
import { userNames } from "@/modules/tests/access";
import { AdminTests, type AdminTestRow } from "@/modules/tests/components/admin-tests";
import { allQuestions } from "@/modules/tests/logic";
import { getTestSettings, listAttempts, listPurchases, listTests } from "@/modules/tests/store";

export const metadata = { title: "Tests" };

export default async function AdminTestsPage() {
  const [tests, attempts, purchases, names, settings] = await Promise.all([listTests(), listAttempts(), listPurchases(), userNames(), getTestSettings()]);
  const rows: AdminTestRow[] = tests
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((t) => ({
      id: t.id,
      slug: t.slug,
      title: t.title,
      instructorName: names.get(t.instructorId) ?? "Deleted user",
      status: t.status,
      price: t.price,
      questions: allQuestions(t).length,
      attempts: attempts.filter((a) => a.testId === t.id).length,
      revenue: purchases.filter((p) => p.testId === t.id).reduce((s, p) => s + p.pricePaid, 0),
      demo: !!t.demo,
    }));
  return (
    <>
      <AdminHeading title="Tests" sub="Every test series on the platform. Instructors build tests from Test Series → Teach; you control visibility and commission here." />
      <AdminTests rows={rows} commissionPercent={settings.commissionBps / 100} />
    </>
  );
}
