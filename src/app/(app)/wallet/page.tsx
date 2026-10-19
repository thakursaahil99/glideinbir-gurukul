import { WalletView } from "@/components/wallet/wallet-view";
import { requireUser } from "@/core/auth/current";
import { demoPaymentsAllowed, razorpayConfigured } from "@/core/payments/razorpay";
import { getBalance, listEntries } from "@/core/wallet/store";

export const metadata = { title: "Wallet" };

export default async function WalletPage() {
  const user = await requireUser("/wallet");
  const [balance, entries] = await Promise.all([getBalance(user.id), listEntries(user.id, 100)]);
  const mode = razorpayConfigured() ? "razorpay" : demoPaymentsAllowed() ? "demo" : "off";
  return <WalletView balance={balance} entries={entries} mode={mode} />;
}
