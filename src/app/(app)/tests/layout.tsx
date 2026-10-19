import { ModulePlaceholder } from "@/components/shell/placeholder";
import { testsEnabled } from "@/modules/tests/access";

/** When an admin switches the module off, every /tests page shows the Coming soon screen. */
export default async function TestsLayout({ children }: { children: React.ReactNode }) {
  if (!(await testsEnabled())) return <ModulePlaceholder moduleKey="tests" />;
  return children;
}
