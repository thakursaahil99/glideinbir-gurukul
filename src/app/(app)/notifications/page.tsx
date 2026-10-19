import { NotificationsView } from "@/components/notifications/notifications-view";
import { requireUser } from "@/core/auth/current";
import { listNotifications } from "@/core/notifications/store";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  return <NotificationsView items={await listNotifications(user.id)} />;
}
