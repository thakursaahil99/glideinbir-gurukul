import { ModulePlaceholder } from "@/components/shell/placeholder";
import { doubtsEnabled } from "@/modules/doubts/service";

export default async function DoubtsLayout({ children }: { children: React.ReactNode }) {
  if (!(await doubtsEnabled())) return <ModulePlaceholder moduleKey="doubts" />;
  return children;
}
