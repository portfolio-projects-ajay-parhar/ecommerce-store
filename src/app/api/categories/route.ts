import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { assertSameOrigin, errorResponse } from "@/lib/api";
import { categorySchema } from "@/lib/validators";
import { slugify, ensureUniqueSlug } from "@/lib/slug";

/** GET — public list of ACTIVE categories with product counts. */
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: { _count: { select: { products: { where: { status: "ACTIVE" } } } } },
    });
    return NextResponse.json({
      items: categories.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        imageUrl: c.imageUrl,
        productCount: c._count.products,
      })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}

/** POST — ADMIN create category. */
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    const body = categorySchema.parse(await req.json());

    const slug = await ensureUniqueSlug(slugify(body.name), (s) =>
      prisma.category.findUnique({ where: { slug: s } }).then((r) => Boolean(r)),
    );

    const category = await prisma.category.create({
      data: {
        name: body.name,
        slug,
        description: body.description ?? null,
        imageUrl: body.imageUrl || null,
        isActive: body.isActive ?? true,
      },
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
