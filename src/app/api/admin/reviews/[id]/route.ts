import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { assertSameOrigin, errorResponse } from "@/lib/api";
import { recomputeReviewAggregates } from "@/lib/reviews";

type Params = { params: Promise<{ id: string }> };

/** PATCH — hide/restore (PUBLISHED ↔ HIDDEN). Aggregates recomputed. */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    const { id } = await params;
    const body = (await req.json()) as { status?: "PUBLISHED" | "HIDDEN" };
    if (body.status !== "PUBLISHED" && body.status !== "HIDDEN") {
      return NextResponse.json(
        { error: "status must be PUBLISHED or HIDDEN." },
        { status: 400 },
      );
    }

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.review.update({
        where: { id },
        data: { status: body.status },
      });
      await recomputeReviewAggregates(tx, review.productId);
      return r;
    });

    return NextResponse.json({ review: updated });
  } catch (e) {
    return errorResponse(e);
  }
}

/** DELETE — moderation delete; aggregates recomputed. */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    const { id } = await params;

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
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
