import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, errorResponse } from "@/lib/api";
import { cartMergeSchema } from "@/lib/validators";
import { getOrCreateCart, upsertCartItem, loadCartWithItems, serializeCart } from "@/lib/cart";

/**
 * POST — merge a guest (localStorage) cart into the DB cart on sign-in.
 * Each line is clamped to current stock; then the caller clears guest storage.
 */
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const body = cartMergeSchema.parse(await req.json());

    const cart = await getOrCreateCart(user.id);
    for (const line of body.items) {
      await upsertCartItem(cart.id, line.productId, line.quantity);
    }

    const loaded = await loadCartWithItems(cart.id);
    return NextResponse.json({ cart: serializeCart(loaded?.items ?? [], cart.id) });
  } catch (e) {
    return errorResponse(e);
  }
}
