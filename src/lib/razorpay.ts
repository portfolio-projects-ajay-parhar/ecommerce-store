import Razorpay from "razorpay";
import { createHmac, timingSafeEqual } from "crypto";

let cached: Razorpay | null = null;

/**
 * Lazily-created Razorpay client. Throws only when an operation needs it.
 * Razorpay amounts are integer minor units (paise) — matching the app's
 * cents-only integer money convention.
 */
export function getRazorpay(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!razorpayConfigured()) {
    throw new Error(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your environment.",
    );
  }
  if (!cached) {
    cached = new Razorpay({ key_id: keyId!, key_secret: keySecret! });
  }
  return cached;
}

export function razorpayConfigured(): boolean {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  return (
    Boolean(keyId) &&
    Boolean(keySecret) &&
    keyId !== "rzp_test_placeholder" &&
    keySecret !== "placeholder"
  );
}

export const RAZORPAY_CURRENCY = "INR";

/** Publishable key id for the client-side Checkout modal. */
export function razorpayKeyId(): string {
  return process.env.RAZORPAY_KEY_ID ?? "";
}

/** HMAC-SHA256 of `orderId|paymentId` with the key secret — Razorpay's Checkout signature. */
export function paymentSignature(orderId: string, paymentId: string): string {
  return createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}

/** Constant-time comparison of the client-provided Checkout signature. */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const expected = Buffer.from(paymentSignature(orderId, paymentId), "utf8");
  const provided = Buffer.from(signature ?? "", "utf8");
  return (
    expected.length === provided.length && timingSafeEqual(expected, provided)
  );
}

/**
 * Webhook signature: HMAC-SHA256 of the RAW request body with the webhook
 * secret, compared against the `x-razorpay-signature` header.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
