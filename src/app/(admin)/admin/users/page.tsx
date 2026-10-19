import { AdminHeading } from "@/components/admin/admin-shell";
import { UsersManager } from "@/components/admin/users-manager";
import { requireAdmin } from "@/core/auth/current";
import { listUsers, normalizeEmail, toPublic } from "@/core/auth/users";

export const metadata = { title: "Users" };

export default async function AdminUsersPage() {
  const [admin, users] = await Promise.all([requireAdmin(), listUsers()]);
  return (
    <>
      <AdminHeading title="Users" sub="Add accounts, change roles, block access, reset passwords or delete users." />
      <UsersManager users={users.map(toPublic)} currentId={admin.id} mainAdminEmail={normalizeEmail(process.env.ADMIN_EMAIL ?? "")} />
    </>
  );
}
