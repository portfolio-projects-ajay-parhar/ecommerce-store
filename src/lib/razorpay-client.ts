"use client";

/**
 * Browser-side Razorpay Checkout loader. Loads the official checkout script
 * once, then opens the modal. The signed success callback is posted to
 * /api/checkout/verify where the signature is verified server-side.
 */

export interface RazorpayCheckoutOptions {
  keyId: string;
  razorpayOrderId: string;
  amount: number; // minor units (paise)
  currency: string;
  name?: string;
  email?: string | null;
}

interface RazorpayHandlerResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (resp: unknown) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );
    const script = existing ?? document.createElement("script");
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay Checkout."));
    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
  });
}

/**
 * Opens the Razorpay Checkout modal. Resolves with the handler response on
 * success; rejects if the user dismisses the modal or the script fails.
 */
export async function openRazorpayCheckout(
  opts: RazorpayCheckoutOptions,
): Promise<RazorpayHandlerResponse> {
  await loadScript();
  if (!window.Razorpay) {
    throw new Error("Razorpay Checkout is unavailable.");
  }

  return new Promise<RazorpayHandlerResponse>((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: opts.keyId,
      order_id: opts.razorpayOrderId,
      amount: opts.amount,
      currency: opts.currency,
      name: opts.name ?? "Meridian",
      description: "Order payment",
      prefill: opts.email ? { email: opts.email } : undefined,
      theme: { color: "#171717" },
      handler: (response: RazorpayHandlerResponse) => resolve(response),
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled.")),
      },
    });
    rzp.on("payment.failed", () =>
      reject(new Error("Payment failed. No amount was charged.")),
    );
    rzp.open();
  });
}
