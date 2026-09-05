import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";

/**
 * GET — public hydration for the guest (localStorage) cart.
 * Body: ?ids=cuid1,cuid2 → catalog view per product (ACTIVE only).
 */
export async function GET(req: NextRequest) {
  try {
    const ids = (req.nextUrl.searchParams.get("ids") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 50);

    if (ids.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: ids }, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        slug: true,
        priceCents: true,
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        inventory: { select: { quantityOnHand: true } },
      },
    });

    return NextResponse.json({
      items: products.map((p) => ({
        productId: p.id,
        name: p.name,
        slug: p.slug,
        unitPriceCents: p.priceCents,
        imageUrl: p.images[0]?.url ?? null,
        maxQuantity: p.inventory?.quantityOnHand ?? 0,
        available: (p.inventory?.quantityOnHand ?? 0) > 0,
      })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
