import { ModulePlaceholder } from "@/components/shell/placeholder";
import { coursesEnabled } from "@/modules/courses/access";

/** When an admin switches the module off, every /courses page shows the Coming soon screen. */
export default async function CoursesLayout({ children }: { children: React.ReactNode }) {
  if (!(await coursesEnabled())) return <ModulePlaceholder moduleKey="courses" />;
  return children;
}
