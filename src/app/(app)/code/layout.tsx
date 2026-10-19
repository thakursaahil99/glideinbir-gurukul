import { ModulePlaceholder } from "@/components/shell/placeholder";
import { codeEnabled } from "@/modules/code/service";

export default async function CodeLayout({ children }: { children: React.ReactNode }) {
  if (!(await codeEnabled())) return <ModulePlaceholder moduleKey="code" />;
  return children;
}
