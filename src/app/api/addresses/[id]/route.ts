import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth";
import { assertSameOrigin, errorResponse } from "@/lib/api";
import { addressSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

/** PATCH — owner-only update; default-swapping handled atomically. */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const { id } = await params;
    const body = addressSchema.partial().parse(await req.json());

    const existing = await prisma.address.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      // 404, not 403 — don't leak other users' address ids
      throw new AuthError(404, "Address not found.");
    }

    const address = await prisma.$transaction(async (tx) => {
      if (body.isDefault) {
        await tx.address.updateMany({
          where: { userId: user.id, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }
      return tx.address.update({
        where: { id },
        data: {
          ...(body.label !== undefined ? { label: body.label ?? null } : {}),
          ...(body.fullName ? { fullName: body.fullName } : {}),
          ...(body.line1 ? { line1: body.line1 } : {}),
          ...(body.line2 !== undefined ? { line2: body.line2 ?? null } : {}),
          ...(body.city ? { city: body.city } : {}),
          ...(body.state !== undefined ? { state: body.state ?? null } : {}),
          ...(body.postalCode ? { postalCode: body.postalCode } : {}),
          ...(body.country ? { country: body.country } : {}),
          ...(body.phone !== undefined ? { phone: body.phone ?? null } : {}),
          ...(body.isDefault !== undefined ? { isDefault: body.isDefault } : {}),
        },
      });
    });

    return NextResponse.json({ address });
  } catch (e) {
    return errorResponse(e);
  }
}

/** DELETE — owner-only. */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const { id } = await params;

    const existing = await prisma.address.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      throw new AuthError(404, "Address not found.");
    }

    await prisma.address.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
