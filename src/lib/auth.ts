import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  // Adapter handles User/Account/Session tables; credentials + JWT strategy
  // is the required combination (sessions can't be DB-backed with credentials).
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id && token.role) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
};

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

/** Thrown by guards — API routes convert it to a JSON response via errorResponse(). */
export class AuthError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/** For API routes: throws AuthError(401) when unauthenticated. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError(401, "You must be signed in.");
  return user;
}

/** For server components: redirects to /signin when unauthenticated. */
export async function requirePageUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  return user;
}

/** For API routes + server components: 403 unless the user is an ADMIN. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new AuthError(403, "You do not have permission to do that.");
  }
  return user;
}

/**
 * Order ownership: the owner always passes; ADMIN passes; anyone else gets a
 * 404 (not 403 — we don't leak the existence of other users' order ids).
 */
export async function requireOrderOwner(orderId: string) {
  const user = await requireUser();
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AuthError(404, "Order not found.");
  if (order.userId !== user.id && user.role !== "ADMIN") {
    throw new AuthError(404, "Order not found.");
  }
  return { user, order };
}
