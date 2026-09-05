import type { Prisma, Product, ProductImage, Inventory } from "@prisma/client";
import { prisma } from "./prisma";
import { computeShippingCents } from "./money";

// ── Cart view shape shared by APIs and the CartProvider ─────────────────────

export interface CartLineView {
  id: string;
  productId: string;
  name: string;
  slug: string;
  unitPriceCents: number;
  imageUrl: string | null;
  quantity: number;
  lineTotalCents: number;
  /** Max purchasable quantity (current stock). */
  maxQuantity: number;
  available: boolean;
  /** True when the requested quantity exceeds available stock. */
  overStock: boolean;
}

export interface CartView {
  id: string | null;
  items: CartLineView[];
  count: number;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
}

export const EMPTY_CART: CartView = {
  id: null,
  items: [],
  count: 0,
  subtotalCents: 0,
  shippingCents: 0,
  totalCents: 0,
};

type CartItemWithProduct = {
  id: string;
  productId: string;
  quantity: number;
  product: Product & {
    images: ProductImage[];
    inventory: Inventory | null;
  };
};

/**
 * Pure serializer: DB cart items → the view the UI renders. Flags lines whose
 * quantity exceeds stock rather than silently truncating them.
 */
export function serializeCart(
  items: CartItemWithProduct[],
  cartId: string | null = null,
): CartView {
  const lines: CartLineView[] = items.map((item) => {
    const stock = item.product.inventory?.quantityOnHand ?? 0;
    const qty = item.quantity;
    return {
      id: item.id,
      productId: item.productId,
      name: item.product.name,
      slug: item.product.slug,
      unitPriceCents: item.product.priceCents,
      imageUrl: item.product.images[0]?.url ?? null,
      quantity: qty,
      lineTotalCents: item.product.priceCents * qty,
      maxQuantity: stock,
      available: item.product.status === "ACTIVE" && stock > 0,
      overStock: qty > stock,
    };
  });

  const subtotalCents = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);
  const shippingCents = lines.length === 0 ? 0 : computeShippingCents(subtotalCents);

  return {
    id: cartId,
    items: lines,
    count: lines.reduce((sum, l) => sum + l.quantity, 0),
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
  };
}

/** Returns the user's cart, creating it on first use. */
export async function getOrCreateCart(userId: string) {
  const existing = await prisma.cart.findUnique({
    where: { userId },
    include: { items: false },
  });
  if (existing) return existing;
  return prisma.cart.create({ data: { userId } });
}

/** Loads a cart with product/inventory/image data for serialization. */
export async function loadCartWithItems(cartId: string) {
  return prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        orderBy: { addedAt: "asc" },
        include: {
          product: {
            include: {
              images: { orderBy: { sortOrder: "asc" } },
              inventory: true,
            },
          },
        },
      },
    },
  });
}

export async function cartViewForUser(userId: string): Promise<CartView> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        orderBy: { addedAt: "asc" },
        include: {
          product: {
            include: {
              images: { orderBy: { sortOrder: "asc" } },
              inventory: true,
            },
          },
        },
      },
    },
  });
  if (!cart) return EMPTY_CART;
  return serializeCart(cart.items, cart.id);
}

/**
 * Clamp-to-stock upsert used by add + merge. Returns null when the product
 * is unavailable (not ACTIVE or zero stock).
 */
export async function upsertCartItem(
  cartId: string,
  productId: string,
  quantity: number,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<{ ok: boolean; maxQuantity: number }> {
  const product = await tx.product.findUnique({
    where: { id: productId },
    include: { inventory: true },
  });
  if (!product || product.status !== "ACTIVE") return { ok: false, maxQuantity: 0 };

  const stock = product.inventory?.quantityOnHand ?? 0;
  if (stock < 1) return { ok: false, maxQuantity: 0 };

  const existing = await tx.cartItem.findUnique({
    where: { cartId_productId: { cartId, productId } },
  });

  const desired = Math.min((existing?.quantity ?? 0) + quantity, stock);

  await tx.cartItem.upsert({
    where: { cartId_productId: { cartId, productId } },
    create: { cartId, productId, quantity: desired },
    update: { quantity: desired },
  });

  return { ok: true, maxQuantity: stock };
}

export async function clearCartItems(
  cartId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  await tx.cartItem.deleteMany({ where: { cartId } });
}
