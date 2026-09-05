import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, errorResponse } from "@/lib/api";
import { profileSchema } from "@/lib/validators";

/** GET — current profile. */
export async function GET() {
  try {
    const user = await requireUser();
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    });
    return NextResponse.json({ profile });
  } catch (e) {
    return errorResponse(e);
  }
}

/** PATCH — name/phone only (role, email, passwordHash are not patchable here). */
export async function PATCH(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const body = profileSchema.parse(await req.json());

    const profile = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.phone !== undefined ? { phone: body.phone ?? null } : {}),
      },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    });
    return NextResponse.json({ profile });
  } catch (e) {
    return errorResponse(e);
  }
}
