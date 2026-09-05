import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, errorResponse } from "@/lib/api";
import { uploadMedia } from "@/lib/storage";
import { checkRateLimit } from "@/lib/rate-limit";

/** GET — current user's uploads (paginated). */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const sp = req.nextUrl.searchParams;
    const take = Math.min(Number(sp.get("take") ?? 20) || 20, 50);
    const cursor = sp.get("cursor") ?? undefined;

    const items = await prisma.mediaItem.findMany({
      where: { uploadedById: user.id },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = items.length > take;
    const page = hasMore ? items.slice(0, take) : items;

    return NextResponse.json({
      items: page,
      nextCursor: hasMore ? page[page.length - 1].id : null,
    });
  } catch (e) {
    return errorResponse(e);
  }
}

/** POST — multipart image upload → Supabase Storage → MediaItem row. */
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();

    const rl = checkRateLimit(`media:upload:${user.id}`, 20, 60_000);
    if (!rl.ok) {
      return NextResponse.json({ error: "Upload rate limit reached." }, { status: 429 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    let result;
    try {
      result = await uploadMedia(file, user.id);
    } catch (e) {
      // Client-fixable storage errors get clear statuses (not 500)
      if (e instanceof Error) {
        if (/not configured/i.test(e.message)) {
          return NextResponse.json(
            { error: "Image uploads are not available yet — storage isn't configured on the server." },
            { status: 503 },
          );
        }
        if (/only image/i.test(e.message)) {
          return NextResponse.json({ error: e.message }, { status: 415 });
        }
        if (/too large/i.test(e.message)) {
          return NextResponse.json({ error: e.message }, { status: 413 });
        }
      }
      throw e;
    }

    const item = await prisma.mediaItem.create({
      data: { ...result, uploadedById: user.id },
    });

    return NextResponse.json({ media: item }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}