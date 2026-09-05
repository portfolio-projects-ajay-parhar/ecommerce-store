import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth";
import { assertSameOrigin, errorResponse } from "@/lib/api";
import { deleteMedia } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

/** DELETE — owner or ADMIN; removes the Storage object best-effort. */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(req);
    const { id } = await params;
    const user = await requireUser();

    const item = await prisma.mediaItem.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (item.uploadedById !== user.id && user.role !== "ADMIN") {
      throw new AuthError(403, "You can only delete your own uploads.");
    }

    await prisma.mediaItem.delete({ where: { id } });
    try {
      await deleteMedia(item.storagePath);
    } catch {
      // storage not configured or object already gone
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}