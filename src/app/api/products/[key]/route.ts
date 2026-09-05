import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getCurrentUser } from "@/lib/auth";
import { assertSameOrigin, errorResponse } from "@/lib/api";
import { productUpdateSchema } from "@/lib/validators";
import { slugify, ensureUniqueSlug } from "@/lib/slug";
import { sanitizeHtml } from "@/lib/sanitize-html";

type Params = { params: Promise<{ key: string }> };

/** CUID-shaped keys resolve by id (admin edit forms); everything else by slug. */
function isIdLike(key: string): boolean {
  return /^c[a-z0-9]{20,}$/.test(key);
}

/**
 * GET — public product detail by slug (or id).
 * DRAFT/ARCHIVED → 404 unless the caller is an ADMIN.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { key } = await params;
    const user = await getCurrentUser();
    const isAdmin = user?.role === "ADMIN";

    // Raw cuids are only resolvable by admins (edit forms).
    if (isIdLike(key) && !isAdmin) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const product = await prisma.product.findFirst({
      where: isIdLike(key) ? { id: key } : { slug: key },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        category: { select: { id: true, name: true, slug: true } },
        inventory: { select: { quantityOnHand: true, lowStockThreshold: true } },
      },
    });

    if (!product || (product.status !== "ACTIVE" && !isAdmin)) {
      // DRAFT/ARCHIVED are invisible to non-admins
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (e) {
    return errorResponse(e);
  }
}

/** ADMIN — partial update; re-slugs on name change, re-sanitizes description. */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    const { key } = await params;
    const body = productUpdateSchema.parse(await req.json());

    const product = await prisma.product.findUnique({ where: { id: key } });
    if (!product) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    let slug: string | undefined;
    if (body.name && body.name !== product.name) {
      slug = await ensureUniqueSlug(slugify(body.name), (s) =>
        prisma.product
          .findFirst({ where: { slug: s, NOT: { id: product.id } } })
          .then((r) => Boolean(r)),
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id: product.id },
        data: {
          ...(body.name ? { name: body.name } : {}),
          ...(slug ? { slug } : {}),
          ...(body.description !== undefined
            ? { description: sanitizeHtml(body.description) }
            : {}),
          ...(body.priceCents !== undefined ? { priceCents: body.priceCents } : {}),
          ...(body.compareAtPriceCents !== undefined
            ? { compareAtPriceCents: body.compareAtPriceCents ?? null }
            : {}),
          ...(body.categoryId !== undefined ? { categoryId: body.categoryId || null } : {}),
          ...(body.status ? { status: body.status } : {}),
          ...(body.featured !== undefined ? { featured: body.featured } : {}),
        },
      });

      // Replace the image set when provided
      if (body.images) {
        await tx.productImage.deleteMany({ where: { productId: product.id } });
        await tx.productImage.createMany({
          data: body.images.map((i, idx) => ({
            productId: product.id,
            url: i.url,
            alt: i.alt ?? null,
            sortOrder: i.sortOrder ?? idx,
          })),
        });
      }

      if (body.inventory) {
        const inv = body.inventory;
        await tx.inventory.updateMany({
          where: { productId: product.id },
          data: {
            ...(inv.quantityOnHand !== undefined
              ? { quantityOnHand: inv.quantityOnHand }
              : {}),
            ...(inv.lowStockThreshold !== undefined
              ? { lowStockThreshold: inv.lowStockThreshold }
              : {}),
          },
        });
      }

      return p;
    });

    return NextResponse.json({ product: updated });
  } catch (e) {
    return errorResponse(e);
  }
}

/**
 * DELETE — archive instead of hard delete (orders/reviews keep FK integrity).
 * Hard delete only allowed when no OrderItem references the product.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    const { key } = await params;
    const product = await prisma.product.findUnique({
      where: { id: key },
      include: { _count: { select: { orderItems: true } } },
    });
    if (!product) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    if (product._count.orderItems === 0) {
      await prisma.product.delete({ where: { id: product.id } });
      return NextResponse.json({ deleted: true });
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { status: "ARCHIVED", featured: false },
    });
    return NextResponse.json({ archived: true });
  } catch (e) {
    return errorResponse(e);
  }
}
