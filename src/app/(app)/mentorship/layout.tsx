import { ModulePlaceholder } from "@/components/shell/placeholder";
import { mentorshipEnabled } from "@/modules/mentorship/service";

export default async function MentorshipLayout({ children }: { children: React.ReactNode }) {
  if (!(await mentorshipEnabled())) return <ModulePlaceholder moduleKey="mentorship" />;
  return children;
}
