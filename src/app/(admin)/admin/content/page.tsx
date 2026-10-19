import { AdminHeading } from "@/components/admin/admin-shell";
import { ContentEditor } from "@/components/admin/content-editor";
import { getSite } from "@/core/site/store";

export const metadata = { title: "Site content" };

export default async function AdminContentPage() {
  const site = await getSite();
  return (
    <>
      <AdminHeading title="Site content" sub="Edit every section of the landing page and dashboard. Each tab saves on its own." />
      <ContentEditor site={site} />
    </>
  );
}
