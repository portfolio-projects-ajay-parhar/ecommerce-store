import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { assertSameOrigin, errorResponse } from "@/lib/api";
import { adminInventoryPatchSchema } from "@/lib/validators";

/** GET — all inventory rows for ACTIVE products (low stock first). */
export async function GET() {
  try {
    await requireAdmin();
    const rows = await prisma.inventory.findMany({
      where: { product: { status: { in: ["ACTIVE", "DRAFT"] } } },
      include: { product: { select: { name: true, slug: true, status: true } } },
      orderBy: { quantityOnHand: "asc" },
    });
    return NextResponse.json({
      items: rows.map((r) => ({
        productId: r.productId,
        sku: r.sku,
        quantityOnHand: r.quantityOnHand,
        lowStockThreshold: r.lowStockThreshold,
        productName: r.product.name,
        productSlug: r.product.slug,
        status: r.product.status,
      })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}

/**
 * PATCH — adjust stock. Body: { delta } or { quantityOnHand }, optional
 * lowStockThreshold. Absolute values are floored at 0. SKU is immutable
 * (it appears on the order audit trail).
 */
export async function PATCH(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    const body = adminInventoryPatchSchema.parse(await req.json());
    const productId = req.nextUrl.searchParams.get("productId");
    if (!productId) {
      return NextResponse.json({ error: "productId is required." }, { status: 400 });
    }

    const inventory = await prisma.inventory.findUnique({ where: { productId } });
    if (!inventory) {
      return NextResponse.json({ error: "Inventory not found." }, { status: 404 });
    }

    const updated = await prisma.inventory.update({
      where: { productId },
      data: {
        ...(body.delta !== undefined
          ? { quantityOnHand: Math.max(0, inventory.quantityOnHand + body.delta) }
          : {}),
        ...(body.quantityOnHand !== undefined
          ? { quantityOnHand: body.quantityOnHand }
          : {}),
        ...(body.lowStockThreshold !== undefined
          ? { lowStockThreshold: body.lowStockThreshold }
          : {}),
      },
    });

    return NextResponse.json({ inventory: updated });
  } catch (e) {
    return errorResponse(e);
  }
}
