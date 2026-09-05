import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

type Params = { params: Promise<{ razorpayOrderId: string }> };

/** GET — owner/admin lookup of an order by its Razorpay order id. */
export async function GET(_req: Request, { params }: Params) {
  try {
    const { razorpayOrderId } = await params;
    const user = await requireUser();

    const order = await prisma.order.findUnique({
      where: { razorpayOrderId },
      include: { items: true },
    });
    if (!order) throw new AuthError(404, "Order not found.");
    if (order.userId !== user.id && user.role !== "ADMIN") {
      throw new AuthError(404, "Order not found.");
    }

    return NextResponse.json({
      order: {
        id: order.id,
        number: order.number,
        status: order.status,
        totalCents: order.totalCents,
        items: order.items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
          lineTotalCents: i.lineTotalCents,
        })),
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
