import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, errorResponse } from "@/lib/api";

type Params = { params: Promise<{ productId: string }> };

/** POST — idempotent add (upsert on userId+productId). */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const { productId } = await params;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== "ACTIVE") {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId: user.id, productId } },
      create: { userId: user.id, productId },
      update: {},
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}

/** DELETE — idempotent remove (204 either way). */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const { productId } = await params;

    await prisma.wishlistItem.deleteMany({
      where: { userId: user.id, productId },
    });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
