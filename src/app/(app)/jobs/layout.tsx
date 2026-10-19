import { ModulePlaceholder } from "@/components/shell/placeholder";
import { jobsEnabled } from "@/modules/jobs/service";

export default async function JobsLayout({ children }: { children: React.ReactNode }) {
  if (!(await jobsEnabled())) return <ModulePlaceholder moduleKey="jobs" />;
  return children;
}
