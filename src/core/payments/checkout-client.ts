/**
 * Browser-side "add money to the wallet" flow, shared by the wallet page and
 * by modules that top up a shortfall before a purchase. Opens Razorpay
 * Checkout (or completes a demo order in local dev); the server verifies
 * every payment before crediting.
 */
import { formatPaise } from "@/lib/utils";
import { rpc } from "@/lib/rpc";

export interface TopUpResult {
  ok: boolean;
  message: string;
  cancelled?: boolean;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
interface RazorpayInstance {
  open: () => void;
  on: (event: string, cb: () => void) => void;
}
declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => RazorpayInstance;
  }
}

function loadCheckout(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export async function topUpWallet(rupees: number, description = "Wallet recharge"): Promise<TopUpResult> {
  const order = await rpc("wallet.createOrder", rupees);
  if (!order.ok) return { ok: false, message: order.error };

  if (order.mode === "demo") {
    const res = await rpc("wallet.confirmDemo", order.orderId);
    return { ok: res.ok, message: res.ok ? `${formatPaise(order.amount)} added (demo payment)` : (res.error ?? "Recharge failed") };
  }

  if (!(await loadCheckout()) || !window.Razorpay) return { ok: false, message: "Couldn't load the payment window. Check your connection." };

  return new Promise<TopUpResult>((resolve) => {
    let settled = false;
    const finish = (r: TopUpResult) => {
      if (!settled) {
        settled = true;
        resolve(r);
      }
    };
    const rzp = new window.Razorpay!({
      key: order.keyId,
      amount: order.amount,
      currency: "INR",
      order_id: order.orderId,
      name: "Glideinbir Gurukul",
      description,
      prefill: { name: order.name, email: order.email },
      theme: { color: "#5b47ff" },
      handler: async (r: RazorpayResponse) => {
        const res = await rpc("wallet.verify", { orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature });
        finish({ ok: res.ok, message: res.ok ? `${formatPaise(order.amount)} added to your wallet` : (res.error ?? "Verification failed") });
      },
      modal: {
        ondismiss: async () => {
          await rpc("wallet.cancel", order.orderId);
          finish({ ok: false, cancelled: true, message: "Payment cancelled" });
        },
      },
    });
    rzp.on("payment.failed", () => finish({ ok: false, message: "Payment failed. No money was taken." }));
    rzp.open();
  });
}
