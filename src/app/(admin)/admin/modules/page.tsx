import { AdminHeading } from "@/components/admin/admin-shell";
import { ModulesEditor } from "@/components/admin/modules-editor";
import { getSite } from "@/core/site/store";

export const metadata = { title: "Modules" };

export default async function AdminModulesPage() {
  const { modules } = await getSite();
  return (
    <>
      <AdminHeading
        title="Modules"
        sub="Turn modules on or off, reorder them, and edit their names, text and colours. The order here is the order on the landing page, dashboard and sidebar."
      />
      <ModulesEditor initial={modules} />
    </>
  );
}
