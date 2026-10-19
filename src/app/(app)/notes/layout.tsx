import { ModulePlaceholder } from "@/components/shell/placeholder";
import { notesEnabled } from "@/modules/notes/service";

export default async function NotesLayout({ children }: { children: React.ReactNode }) {
  if (!(await notesEnabled())) return <ModulePlaceholder moduleKey="notes" />;
  return children;
}
