import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, errorResponse } from "@/lib/api";
import { cartItemUpdateSchema } from "@/lib/validators";
import { loadCartWithItems, serializeCart } from "@/lib/cart";

type Params = { params: Promise<{ id: string }> };

async function loadOwnedItem(userId: string, itemId: string) {
  const item = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: { cart: true },
  });
  if (!item || item.cart.userId !== userId) return null;
  return item;
}

/** PATCH — change quantity (0 removes). Ownership enforced. */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const { id } = await params;
    const body = cartItemUpdateSchema.parse(await req.json());

    const item = await loadOwnedItem(user.id, id);
    if (!item) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    if (body.quantity === 0) {
      await prisma.cartItem.delete({ where: { id } });
    } else {
      // Validate against live inventory
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { inventory: true },
      });
      const stock = product?.inventory?.quantityOnHand ?? 0;
      if (!product || product.status !== "ACTIVE" || stock < 1) {
        return NextResponse.json(
          { error: "Out of stock", productId: item.productId },
          { status: 409 },
        );
      }
      if (body.quantity > stock) {
        return NextResponse.json(
          { error: `Only ${stock} left in stock`, productId: item.productId },
          { status: 409 },
        );
      }
      await prisma.cartItem.update({
        where: { id },
        data: { quantity: body.quantity },
      });
    }

    const loaded = await loadCartWithItems(item.cartId);
    return NextResponse.json({ cart: serializeCart(loaded?.items ?? [], item.cartId) });
  } catch (e) {
    return errorResponse(e);
  }
}

/** DELETE — remove a line. Ownership enforced. */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const { id } = await params;

    const item = await loadOwnedItem(user.id, id);
    if (!item) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    await prisma.cartItem.delete({ where: { id } });
    const loaded = await loadCartWithItems(item.cartId);
    return NextResponse.json({ cart: serializeCart(loaded?.items ?? [], item.cartId) });
  } catch (e) {
    return errorResponse(e);
  }
}
