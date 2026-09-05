import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AuthError } from "./auth";

/** Thrown inside the checkout transaction when stock ran out — aborts everything. */
export class OutOfStockError extends Error {
  constructor(
    public productId: string,
    message = "Out of stock",
  ) {
    super(message);
    this.name = "OutOfStockError";
  }
}

/** Thrown by the admin order status machine on illegal transitions. */
export class IllegalTransitionError extends Error {
  constructor(
    public from: string,
    public to: string,
  ) {
    super(`Illegal order status transition: ${from} → ${to}`);
    this.name = "IllegalTransitionError";
  }
}

/** Converts thrown errors into consistent JSON error responses. */
export function errorResponse(e: unknown) {
  if (e instanceof AuthError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  if (e instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", issues: e.flatten() },
      { status: 422 },
    );
  }
  if (e instanceof OutOfStockError) {
    return NextResponse.json(
      { error: "OUT_OF_STOCK", productId: e.productId, message: e.message },
      { status: 409 },
    );
  }
  if (e instanceof IllegalTransitionError) {
    return NextResponse.json({ error: e.message }, { status: 422 });
  }
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") {
      return NextResponse.json(
        { error: "That value is already taken." },
        { status: 409 },
      );
    }
    if (e.code === "P2025") {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
  }
  console.error("[api]", e);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

/** Blocks cross-origin mutating requests (CSRF defense for /api/*). */
export function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return; // non-browser clients (curl, server-to-server)
  let host: string | null = null;
  try {
    host = new URL(origin).host;
  } catch {
    throw new AuthError(403, "Invalid origin.");
  }
  if (host !== req.headers.get("host")) {
    throw new AuthError(403, "Cross-origin request blocked.");
  }
}
