import { AdminHeading } from "@/components/admin/admin-shell";
import { BrandEditor, PasswordForm } from "@/components/admin/settings-editor";
import { getSite } from "@/core/site/store";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const { brand } = await getSite();
  return (
    <>
      <AdminHeading title="Settings" sub="Brand, announcement bar and your admin password." />
      <div className="mb-5">
        <PasswordForm />
      </div>
      <BrandEditor initial={brand} />
    </>
  );
}
