import { AppShell } from "@/components/shell/app-shell";
import { requireUser } from "@/core/auth/current";
import { unreadCount } from "@/core/notifications/store";
import { getBalance } from "@/core/wallet/store";
import { ensureStarterContent } from "../starter-content";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  await ensureStarterContent();
  const [balance, unread] = await Promise.all([getBalance(user.id), unreadCount(user.id)]);
  return (
    <AppShell user={user} balance={balance} unread={unread}>
      {children}
    </AppShell>
  );
}
