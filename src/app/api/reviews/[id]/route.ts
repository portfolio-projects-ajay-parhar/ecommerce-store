import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth";
import { assertSameOrigin, errorResponse } from "@/lib/api";
import { reviewUpdateSchema } from "@/lib/validators";
import { recomputeReviewAggregates } from "@/lib/reviews";

type Params = { params: Promise<{ id: string }> };

/** PATCH — author (rating/title/body) or ADMIN (status). Aggregates updated. */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const { id } = await params;
    const body = reviewUpdateSchema.parse(await req.json());

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) throw new AuthError(404, "Review not found.");

    const isAuthor = review.userId === user.id;
    const isAdmin = user.role === "ADMIN";
    if (!isAuthor && !isAdmin) {
      throw new AuthError(403, "You can only edit your own reviews.");
    }
    // Status changes are admin-only
    if (body.status && !isAdmin) {
      throw new AuthError(403, "Only admins can moderate reviews.");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.review.update({
        where: { id },
        data: {
          ...(body.rating !== undefined ? { rating: body.rating } : {}),
          ...(body.title !== undefined ? { title: body.title ?? null } : {}),
          ...(body.body ? { body: body.body } : {}),
          ...(body.status ? { status: body.status } : {}),
        },
      });
      await recomputeReviewAggregates(tx, review.productId);
      return r;
    });

    return NextResponse.json({ review: updated });
  } catch (e) {
    return errorResponse(e);
  }
}

/** DELETE — author or ADMIN; aggregates recomputed. */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const { id } = await params;

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) throw new AuthError(404, "Review not found.");
    if (review.userId !== user.id && user.role !== "ADMIN") {
      throw new AuthError(403, "You can only delete your own reviews.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.review.delete({ where: { id } });
      await recomputeReviewAggregates(tx, review.productId);
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
