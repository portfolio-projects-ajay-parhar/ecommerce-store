import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const profileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
});

// ── Catalog ─────────────────────────────────────────────────────────────────

export const imageInputSchema = z.object({
  url: z.string().trim().url(),
  alt: z.string().trim().max(200).nullable().optional(),
  sortOrder: z.number().int().min(0).max(99).default(0),
});

export const inventoryInputSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/, "SKU: letters, numbers, hyphens, underscores only"),
  quantityOnHand: z.number().int().min(0).max(1_000_000),
  lowStockThreshold: z.number().int().min(0).max(10_000).default(5),
});

export const productCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(20_000).default(""),
  priceCents: z.number().int().min(1),
  compareAtPriceCents: z.number().int().min(1).nullable().optional(),
  categoryId: z.string().trim().nullable().optional().or(z.literal("")),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  featured: z.boolean().default(false),
  images: z.array(imageInputSchema).min(0).max(6),
  inventory: inventoryInputSchema,
});

export const productUpdateSchema = productCreateSchema
  .partial()
  .omit({ inventory: true })
  .extend({
    inventory: inventoryInputSchema.partial().optional(),
  });

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(300).nullable().optional(),
  imageUrl: z.string().trim().url().nullable().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

// ── Cart ────────────────────────────────────────────────────────────────────

export const cartItemInputSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.number().int().min(1).max(99),
});

export const cartItemUpdateSchema = z.object({
  quantity: z.number().int().min(0).max(99), // 0 = remove
});

export const cartMergeSchema = z.object({
  items: z
    .array(cartItemInputSchema)
    .max(50, "Guest cart is too large"),
});

// ── Addresses ───────────────────────────────────────────────────────────────

export const addressSchema = z.object({
  label: z.string().trim().max(50).nullable().optional(),
  fullName: z.string().trim().min(1).max(120),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).nullable().optional(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().max(100).nullable().optional(),
  postalCode: z.string().trim().min(1).max(20),
  country: z.string().trim().min(2).max(60),
  phone: z.string().trim().max(30).nullable().optional(),
  isDefault: z.boolean().default(false),
});

// ── Reviews ─────────────────────────────────────────────────────────────────

export const reviewCreateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).nullable().optional(),
  body: z.string().trim().min(10, "Review must be at least 10 characters").max(2000),
});

export const reviewUpdateSchema = reviewCreateSchema.partial().extend({
  status: z.enum(["PUBLISHED", "HIDDEN"]).optional(),
});

// ── Admin ───────────────────────────────────────────────────────────────────

export const adminInventoryPatchSchema = z
  .object({
    quantityOnHand: z.number().int().min(0).max(1_000_000).optional(),
    delta: z.number().int().min(-1_000_000).max(1_000_000).optional(),
    lowStockThreshold: z.number().int().min(0).max(10_000).optional(),
  })
  .refine((v) => v.quantityOnHand !== undefined || v.delta !== undefined || v.lowStockThreshold !== undefined, {
    message: "Provide quantityOnHand, delta, or lowStockThreshold",
  });

export const adminOrderPatchSchema = z.object({
  status: z.enum(["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
