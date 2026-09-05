import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { assertSameOrigin, errorResponse } from "@/lib/api";
import { productCreateSchema } from "@/lib/validators";
import { slugify, ensureUniqueSlug } from "@/lib/slug";
import { sanitizeHtml } from "@/lib/sanitize-html";

// Cursor-paginated public catalog + ADMIN create.
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const q = sp.get("q")?.trim();
    const categoryId = sp.get("categoryId") ?? undefined;
    const minPrice = sp.get("minPrice");
    const maxPrice = sp.get("maxPrice");
    const sort = sp.get("sort") ?? "newest";
    const cursor = sp.get("cursor") ?? undefined;
    const take = Math.min(Math.max(Number(sp.get("take") ?? 12) || 12, 1), 48);

    const where = {
      status: "ACTIVE" as const,
      ...(q
        ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { description: { contains: q, mode: "insensitive" as const } }] }
        : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(minPrice || maxPrice
        ? {
            priceCents: {
              ...(minPrice ? { gte: Number(minPrice) } : {}),
              ...(maxPrice ? { lte: Number(maxPrice) } : {}),
            },
          }
        : {}),
    };

    const orderBy =
      sort === "price_asc"
        ? [{ priceCents: "asc" as const }]
        : sort === "price_desc"
          ? [{ priceCents: "desc" as const }]
          : sort === "rating"
            ? [{ avgRating: "desc" as const }, { reviewCount: "desc" as const }]
            : [{ createdAt: "desc" as const }];

    const products = await prisma.product.findMany({
      where,
      orderBy,
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        category: { select: { name: true, slug: true } },
        inventory: { select: { quantityOnHand: true } },
      },
    });

    const hasMore = products.length > take;
    const page = hasMore ? products.slice(0, take) : products;

    return NextResponse.json({
      items: page.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        priceCents: p.priceCents,
        compareAtPriceCents: p.compareAtPriceCents,
        avgRating: p.avgRating,
        reviewCount: p.reviewCount,
        image: p.images[0]?.url ?? null,
        categoryName: p.category?.name ?? null,
        quantityOnHand: p.inventory?.quantityOnHand ?? 0,
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    });
  } catch (e) {
    return errorResponse(e);
  }
}

/** ADMIN — create product with images + inventory in one transaction. */
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    const body = productCreateSchema.parse(await req.json());

    if (body.categoryId) {
      const exists = await prisma.category.findUnique({ where: { id: body.categoryId } });
      if (!exists) {
        return NextResponse.json({ error: "Category not found." }, { status: 400 });
      }
    }

    const slug = await ensureUniqueSlug(slugify(body.name), (s) =>
      prisma.product.findUnique({ where: { slug: s } }).then((r) => Boolean(r)),
    );

    const product = await prisma.$transaction(async (tx) => {
      return tx.product.create({
        data: {
          slug,
          name: body.name,
          description: sanitizeHtml(body.description),
          priceCents: body.priceCents,
          compareAtPriceCents: body.compareAtPriceCents ?? null,
          categoryId: body.categoryId || null,
          status: body.status,
          featured: body.featured,
          images: {
            create: body.images.map((i, idx) => ({
              url: i.url,
              alt: i.alt ?? null,
              sortOrder: i.sortOrder ?? idx,
            })),
          },
          inventory: {
            create: {
              sku: body.inventory.sku,
              quantityOnHand: body.inventory.quantityOnHand,
              lowStockThreshold: body.inventory.lowStockThreshold ?? 5,
            },
          },
        },
        include: { images: true, inventory: true },
      });
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
