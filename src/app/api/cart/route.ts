import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, errorResponse } from "@/lib/api";
import { cartViewForUser, clearCartItems } from "@/lib/cart";

/** GET — the signed-in user's cart with live prices + stock flags. */
export async function GET() {
  try {
    const user = await requireUser();
    const view = await cartViewForUser(user.id);
    return NextResponse.json({ cart: view });
  } catch (e) {
    return errorResponse(e);
  }
}

/** DELETE — empty the cart. */
export async function DELETE(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const cart = await prisma.cart.findUnique({ where: { userId: user.id } });
    if (cart) {
      await clearCartItems(cart.id);
    }
    return NextResponse.json({ cart: await cartViewForUser(user.id) });
  } catch (e) {
    return errorResponse(e);
  }
}
