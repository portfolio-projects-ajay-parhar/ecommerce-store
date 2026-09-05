import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/products/ProductCard";
import type { ProductCardData } from "@/components/products/ProductCard";
import { SearchInput } from "@/components/ui/SearchInput";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, newArrivals, categories] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE", featured: true },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        inventory: { select: { quantityOnHand: true } },
        category: { select: { name: true } },
      },
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        inventory: { select: { quantityOnHand: true } },
        category: { select: { name: true } },
      },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: { _count: { select: { products: { where: { status: "ACTIVE" } } } } },
    }),
  ]);

  return (
    <div className="flex flex-col gap-12">
      {/* Hero */}
      <section className="rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-700 px-6 py-16 text-center text-white dark:from-neutral-800 dark:to-neutral-950">
        <h1 className="text-3xl font-bold sm:text-5xl">
          Everyday goods, thoughtfully made
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-neutral-300">
          Browse the catalog, add to your cart, and check out with Razorpay —
          real inventory, real orders, real reviews.
        </p>
        <div className="mx-auto mt-8 max-w-md [&_form]:flex [&_input]:w-full [&_input]:rounded-xl [&_input]:border-0 [&_input]:bg-white [&_input]:px-4 [&_input]:py-3 [&_input]:text-neutral-900 [&_svg]:hidden">
          <SearchInput placeholder="Search the store…" />
        </div>
        <Link
          href="/products"
          className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-medium text-neutral-900 transition hover:bg-neutral-200"
        >
          Shop all products
        </Link>
      </section>

      {/* Categories */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">Shop by category</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/categories/${c.slug}`}
              className="group overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800"
            >
              <div className="relative aspect-[4/3] bg-neutral-100 dark:bg-neutral-800">
                {c.imageUrl && (
                  <Image
                    src={c.imageUrl}
                    alt={c.name}
                    fill
                    sizes="200px"
                    className="object-cover transition group-hover:scale-105"
                  />
                )}
              </div>
              <div className="p-2 text-center text-sm font-medium">{c.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Featured</h2>
          <Link href="/products" className="text-sm text-neutral-500 hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={toCard(p)} />
          ))}
        </div>
      </section>

      {/* New arrivals */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">New arrivals</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {newArrivals.map((p) => (
            <ProductCard key={p.id} product={toCard(p)} />
          ))}
        </div>
      </section>
    </div>
  );
}

type ProductWithRelations = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  avgRating: number;
  reviewCount: number;
  images: { url: string }[];
  inventory: { quantityOnHand: number } | null;
  category: { name: string } | null;
};

function toCard(p: ProductWithRelations): ProductCardData {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    priceCents: p.priceCents,
    compareAtPriceCents: p.compareAtPriceCents,
    image: p.images[0]?.url ?? null,
    avgRating: p.avgRating,
    reviewCount: p.reviewCount,
    quantityOnHand: p.inventory?.quantityOnHand ?? 0,
    categoryName: p.category?.name ?? null,
  };
}
