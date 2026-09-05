import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, errorResponse } from "@/lib/api";
import { addressSchema } from "@/lib/validators";

/** GET — the user's addresses (default first). */
export async function GET() {
  try {
    const user = await requireUser();
    const addresses = await prisma.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ items: addresses });
  } catch (e) {
    return errorResponse(e);
  }
}

/** POST — create address; isDefault clears the previous default atomically. */
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const body = addressSchema.parse(await req.json());

    const address = await prisma.$transaction(async (tx) => {
      if (body.isDefault) {
        await tx.address.updateMany({
          where: { userId: user.id, isDefault: true },
          data: { isDefault: false },
        });
      }
      // First address is always the default
      const count = await tx.address.count({ where: { userId: user.id } });
      return tx.address.create({
        data: {
          userId: user.id,
          label: body.label ?? null,
          fullName: body.fullName,
          line1: body.line1,
          line2: body.line2 ?? null,
          city: body.city,
          state: body.state ?? null,
          postalCode: body.postalCode,
          country: body.country,
          phone: body.phone ?? null,
          isDefault: body.isDefault || count === 0,
        },
      });
    });

    return NextResponse.json({ address }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
