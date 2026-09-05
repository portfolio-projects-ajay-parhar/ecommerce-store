import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { assertSameOrigin, errorResponse } from "@/lib/api";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);

    const ip = getClientIp(req);
    const rl = checkRateLimit(`register:${ip}`, 5, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Try again shortly." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
      );
    }

    const body = registerSchema.parse(await req.json());

    const emailTaken = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (emailTaken) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      // Role is ALWAYS CUSTOMER here — never trust client-supplied role.
      data: {
        name: body.name,
        email: body.email,
        passwordHash,
        role: "CUSTOMER",
      },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
