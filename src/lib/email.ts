import type { Prisma } from "@prisma/client";
import { formatMoney } from "./money";

export interface OrderEmailData {
  id: string;
  number: string;
  totalCents: number;
  subtotalCents: number;
  shippingCents: number;
  user: { email: string | null; name?: string | null };
  items: {
    productName: string;
    quantity: number;
    lineTotalCents: number;
  }[];
}

function renderHtml(order: OrderEmailData): string {
  const rows = order.items
    .map(
      (i) => `<tr>
        <td style="padding:6px 12px 6px 0">${i.productName} × ${i.quantity}</td>
        <td style="padding:6px 0;text-align:right">${formatMoney(i.lineTotalCents)}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html><body style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto">
  <h2 style="margin-bottom:4px">Thanks for your order!</h2>
  <p style="color:#555;margin-top:0">Order <strong>${order.number}</strong> is confirmed.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    ${rows}
    <tr><td style="padding:6px 12px 6px 0;border-top:1px solid #ddd">Subtotal</td>
        <td style="padding:6px 0;border-top:1px solid #ddd;text-align:right">${formatMoney(order.subtotalCents)}</td></tr>
    <tr><td style="padding:6px 12px 6px 0">Shipping</td>
        <td style="padding:6px 0;text-align:right">${formatMoney(order.shippingCents)}</td></tr>
    <tr><td style="padding:8px 12px 0 0;font-weight:bold">Total</td>
        <td style="padding:8px 0 0;font-weight:bold;text-align:right">${formatMoney(order.totalCents)}</td></tr>
  </table>
  <p style="color:#555">View order status in your account: <a href="__SITE__/account/orders/${order.id}">Track order</a></p>
</body></html>`
    .replace("__SITE__", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
}

/**
 * Order-confirmation email via Resend. Gracefully degrades:
 * - Unconfigured RESEND_API_KEY → EmailLog row with status SKIPPED.
 * - Send failure → EmailLog row with status FAILED, but never throws
 *   (an email problem must never fail the payment webhook).
 */
export async function sendOrderConfirmation(
  db: Pick<Prisma.TransactionClient, "emailLog">,
  order: OrderEmailData,
): Promise<"SENT" | "FAILED" | "SKIPPED"> {
  const to = order.user.email;
  if (!to) return "SKIPPED";

  const subject = `Order ${order.number} confirmed`;
  const base = {
    to,
    template: "order-confirmation",
    subject,
    orderId: order.id,
  };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(`[email] RESEND_API_KEY unset — skipping "${subject}" to ${to}`);
    await db.emailLog.create({
      data: { ...base, status: "SKIPPED" },
    });
    return "SKIPPED";
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "orders@yourdomain.dev",
      to,
      subject,
      html: renderHtml(order),
    });
    if (result.error) throw new Error(result.error.message);
    await db.emailLog.create({ data: { ...base, status: "SENT" } });
    return "SENT";
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown email error";
    console.error(`[email] Failed to send "${subject}":`, message);
    await db.emailLog
      .create({ data: { ...base, status: "FAILED", error: message } })
      .catch(() => undefined);
    return "FAILED";
  }
}
