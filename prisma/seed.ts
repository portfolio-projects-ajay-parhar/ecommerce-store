/**
 * Seed: 1 ADMIN + 5 CUSTOMERs (password Password123!), 6 categories,
 * products with real prices in cents, inventory per product
 * (one stock=1, two stock=0 — needed by the oversell / out-of-stock tests).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CATEGORIES, PRODUCTS } from "./seed-data";

const prisma = new PrismaClient();

const img = (seed: string, n = 1) =>
  Array.from({ length: n }, (_, i) => `https://picsum.photos/seed/${seed}-${i + 1}/800/800`);

async function main() {
  console.log("Seeding…");

  // Idempotent: wipe tables in FK-safe order
  await prisma.emailLog.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.review.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.address.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.mediaItem.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Password123!", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@shop.dev",
      name: "Avery Admin",
      passwordHash,
      role: "ADMIN",
    },
  });

  const customers = await Promise.all(
    [1, 2, 3, 4, 5].map((i) =>
      prisma.user.create({
        data: {
          email: `customer${i}@shop.dev`,
          name: `Casey Customer ${i}`,
          passwordHash,
          role: "CUSTOMER",
        },
      }),
    ),
  );

  const categories = new Map<string, string>();
  for (const c of CATEGORIES) {
    const row = await prisma.category.create({
      data: {
        ...c,
        imageUrl: `https://picsum.photos/seed/${c.slug}-cat/600/400`,
        isActive: true,
      },
    });
    categories.set(c.slug, row.id);
  }

  let created = 0;
  for (const p of PRODUCTS) {
    const slug = p.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    await prisma.product.create({
      data: {
        slug,
        name: p.name,
        description: p.description,
        priceCents: p.price,
        compareAtPriceCents: p.compareAt ?? null,
        status: "ACTIVE",
        featured: p.featured ?? false,
        categoryId: categories.get(p.category),
        images: {
          create: img(slug, Math.min(3, 1 + (created % 3))).map((url, i) => ({
            url,
            alt: `${p.name} view ${i + 1}`,
            sortOrder: i,
          })),
        },
        inventory: {
          create: {
            sku: `${slug.slice(0, 20).toUpperCase().replace(/-/g, "")}-${String(created + 1).padStart(3, "0")}`,
            quantityOnHand: p.stock,
            lowStockThreshold: 5,
          },
        },
      },
    });
    created++;
  }

  console.log(`✓ ${admin.email} (ADMIN) + ${customers.length} customers`);
  console.log(`✓ ${categories.size} categories, ${created} products`);
  console.log("✓ Password for all users: Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
