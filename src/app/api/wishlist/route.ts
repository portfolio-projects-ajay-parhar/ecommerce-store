import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

/** GET — wishlist with product info for the wishlist page. */
export async function GET() {
  try {
    const user = await requireUser();
    const items = await prisma.wishlistItem.findMany({
      where: { userId: user.id },
      orderBy: { addedAt: "desc" },
      include: {
        product: {
          include: {
            images: { orderBy: { sortOrder: "asc" }, take: 1 },
            inventory: { select: { quantityOnHand: true } },
          },
        },
      },
    });

    return NextResponse.json({
      items: items
        .filter((i) => i.product.status === "ACTIVE")
        .map((i) => ({
          productId: i.productId,
          addedAt: i.addedAt,
          product: {
            id: i.product.id,
            slug: i.product.slug,
            name: i.product.name,
            priceCents: i.product.priceCents,
            compareAtPriceCents: i.product.compareAtPriceCents,
            image: i.product.images[0]?.url ?? null,
            quantityOnHand: i.product.inventory?.quantityOnHand ?? 0,
          },
        })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
