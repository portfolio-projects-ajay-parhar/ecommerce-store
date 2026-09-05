import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { assertSameOrigin, errorResponse } from "@/lib/api";
import { cartItemInputSchema } from "@/lib/validators";
import { getOrCreateCart, upsertCartItem, loadCartWithItems, serializeCart } from "@/lib/cart";

/** POST — add/increment an item, validated against live inventory. */
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const body = cartItemInputSchema.parse(await req.json());

    const cart = await getOrCreateCart(user.id);
    const result = await upsertCartItem(cart.id, body.productId, body.quantity);

    if (!result.ok) {
      return NextResponse.json(
        { error: "Out of stock", productId: body.productId },
        { status: 409 },
      );
    }

    const loaded = await loadCartWithItems(cart.id);
    return NextResponse.json(
      { cart: serializeCart(loaded?.items ?? [], cart.id) },
      { status: 201 },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
