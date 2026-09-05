import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, errorResponse } from "@/lib/api";
import { reviewCreateSchema } from "@/lib/validators";
import { hasPurchased } from "@/lib/purchase";
import { recomputeReviewAggregates } from "@/lib/reviews";
import { checkRateLimit } from "@/lib/rate-limit";

type Params = { params: Promise<{ key: string }> };

/** Resolve the product by id (cuid) or slug. */
async function resolveProduct(key: string) {
  const isIdLike = /^c[a-z0-9]{20,}$/.test(key);
  return prisma.product.findFirst({
    where: isIdLike ? { id: key } : { slug: key },
  });
}

/** GET — PUBLISHED reviews, newest first, cursor-paginated. */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { key } = await params;
    const product = await resolveProduct(key);
    if (!product) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const sp = req.nextUrl.searchParams;
    const cursor = sp.get("cursor") ?? undefined;
    const take = Math.min(Math.max(Number(sp.get("take") ?? 10) || 10, 1), 50);

    const reviews = await prisma.review.findMany({
      where: { productId: product.id, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { user: { select: { name: true } } },
    });

    const hasMore = reviews.length > take;
    const page = hasMore ? reviews.slice(0, take) : reviews;

    return NextResponse.json({
      items: page.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        body: r.body,
        reviewerName: r.user.name ?? "Anonymous",
        createdAt: r.createdAt,
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
      avgRating: product.avgRating,
      reviewCount: product.reviewCount,
    });
  } catch (e) {
    return errorResponse(e);
  }
}

/** POST — signed-in + verified purchase + one review per user/product. */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();

    const rl = checkRateLimit(`review:${user.id}`, 10, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Try again shortly." },
        { status: 429 },
      );
    }

    const { key } = await params;
    const product = await resolveProduct(key);
    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    const body = reviewCreateSchema.parse(await req.json());

    // Verified purchase only
    const purchased = await hasPurchased(prisma, user.id, product.id);
    if (!purchased) {
      return NextResponse.json(
        { error: "Only verified buyers can review this product." },
        { status: 403 },
      );
    }

    const existing = await prisma.review.findUnique({
      where: { productId_userId: { productId: product.id, userId: user.id } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "You already reviewed this product." },
        { status: 409 },
      );
    }

    const review = await prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          productId: product.id,
          userId: user.id,
          rating: body.rating,
          title: body.title ?? null,
          body: body.body,
        },
        include: { user: { select: { name: true } } },
      });
      await recomputeReviewAggregates(tx, product.id);
      return created;
    });

    return NextResponse.json(
      {
        review: {
          id: review.id,
          rating: review.rating,
          title: review.title,
          body: review.body,
          reviewerName: review.user.name ?? "Anonymous",
          createdAt: review.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
