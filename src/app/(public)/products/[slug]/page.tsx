import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPurchased } from "@/lib/purchase";
import { sanitizeForRender } from "@/lib/sanitize-html";
import { formatMoney } from "@/lib/money";
import { Gallery } from "@/components/products/Gallery";
import { AddToCartButton, WishlistButton } from "@/components/products/ProductActions";
import { ReviewSection } from "@/components/products/ReviewSection";
import { ProductCard } from "@/components/products/ProductCard";
import { Stars } from "@/components/ui/Stars";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findFirst({
    where: { slug, status: "ACTIVE" },
    include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
  });
  if (!product) return { title: "Product not found" };
  const excerpt = product.description.replace(/<[^>]*>/g, "").slice(0, 155);
  return {
    title: product.name,
    description: excerpt,
    openGraph: {
      title: product.name,
      description: excerpt,
      images: product.images[0]?.url ? [product.images[0].url] : [],
    },
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const product = await prisma.product.findFirst({
    where: user?.role === "ADMIN" ? { slug } : { slug, status: "ACTIVE" },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      category: { select: { id: true, name: true, slug: true } },
      inventory: true,
    },
  });
  if (!product || product.status !== "ACTIVE") notFound();

  const stock = product.inventory?.quantityOnHand ?? 0;
  const threshold = product.inventory?.lowStockThreshold ?? 5;

  const [purchased, myReview, related] = await Promise.all([
    user ? hasPurchased(prisma, user.id, product.id) : Promise.resolve(false),
    user
      ? prisma.review.findUnique({
          where: { productId_userId: { productId: product.id, userId: user.id } },
        })
      : Promise.resolve(null),
    product.categoryId
      ? prisma.product.findMany({
          where: { categoryId: product.categoryId, status: "ACTIVE", id: { not: product.id } },
          orderBy: { createdAt: "desc" },
          take: 4,
          include: {
            images: { orderBy: { sortOrder: "asc" }, take: 1 },
            inventory: { select: { quantityOnHand: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const discounted =
    product.compareAtPriceCents && product.compareAtPriceCents > product.priceCents;

  const stockIndicator =
    stock === 0
      ? { label: "Out of stock", cls: "text-red-600 dark:text-red-400" }
      : stock <= threshold
        ? { label: `Only ${stock} left`, cls: "text-amber-600 dark:text-amber-400" }
        : { label: "In stock", cls: "text-green-600 dark:text-green-400" };

  return (
    <div className="flex flex-col gap-12">
      <div className="grid gap-8 lg:grid-cols-2">
        <Gallery images={product.images} name={product.name} />

        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold sm:text-3xl">{product.name}</h1>
          <Stars rating={product.avgRating} size="md" showValue count={product.reviewCount} />

          <p className="flex items-baseline gap-3">
            <span className="text-3xl font-bold">{formatMoney(product.priceCents)}</span>
            {discounted && (
              <span className="text-lg text-neutral-400 line-through">
                {formatMoney(product.compareAtPriceCents!)}
              </span>
            )}
          </p>

          <p className={`text-sm font-medium ${stockIndicator.cls}`}>{stockIndicator.label}</p>

          <div className="flex gap-3">
            <div className="flex-1">
              <AddToCartButton productId={product.id} stock={stock} />
            </div>
            <WishlistButton productId={product.id} />
          </div>

          {product.description && (
            <div
              className="product-description mt-4 border-t border-neutral-200 pt-6 dark:border-neutral-800"
              // Sanitized on write + re-sanitized at render (defense in depth)
              dangerouslySetInnerHTML={{ __html: sanitizeForRender(product.description) }}
            />
          )}
        </div>
      </div>

      <ReviewSection
        productKey={product.slug}
        purchased={purchased}
        hasReviewed={Boolean(myReview)}
      />

      {related.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold">Related products</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard
                key={p.id}
                product={{
                  id: p.id,
                  slug: p.slug,
                  name: p.name,
                  priceCents: p.priceCents,
                  compareAtPriceCents: p.compareAtPriceCents,
                  image: p.images[0]?.url ?? null,
                  avgRating: p.avgRating,
                  reviewCount: p.reviewCount,
                  quantityOnHand: p.inventory?.quantityOnHand ?? 0,
                }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
