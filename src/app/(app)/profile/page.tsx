import { ProfileView } from "@/components/profile/profile-view";
import { requireUser } from "@/core/auth/current";
import { getBalance } from "@/core/wallet/store";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser("/profile");
  return <ProfileView user={user} balance={await getBalance(user.id)} />;
}
