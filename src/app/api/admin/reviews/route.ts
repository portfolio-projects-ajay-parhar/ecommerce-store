import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

/** GET — all reviews for moderation (includes HIDDEN). */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const sp = req.nextUrl.searchParams;
    const status = sp.get("status");
    const cursor = sp.get("cursor") ?? undefined;
    const take = Math.min(Math.max(Number(sp.get("take") ?? 20) || 20, 1), 100);

    const reviews = await prisma.review.findMany({
      where: status ? { status: status as never } : {},
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        user: { select: { name: true, email: true } },
        product: { select: { name: true, slug: true } },
      },
    });

    const hasMore = reviews.length > take;
    const page = hasMore ? reviews.slice(0, take) : reviews;

    return NextResponse.json({
      items: page.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        body: r.body,
        status: r.status,
        createdAt: r.createdAt,
        reviewerName: r.user.name,
        reviewerEmail: r.user.email,
        productName: r.product.name,
        productSlug: r.product.slug,
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
