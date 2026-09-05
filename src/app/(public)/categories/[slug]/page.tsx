import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/products/ProductCard";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

async function getCategory(slug: string) {
  return prisma.category.findFirst({ where: { slug, isActive: true } });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  return {
    title: category?.name ?? "Category not found",
    description: category?.description ?? undefined,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Params["params"];
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { slug } = await params;
  const { cursor } = await searchParams;
  const category = await getCategory(slug);
  if (!category) notFound();

  const take = 12;
  const products = await prisma.product.findMany({
    where: { categoryId: category.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      inventory: { select: { quantityOnHand: true } },
    },
  });

  const hasMore = products.length > take;
  const page = hasMore ? products.slice(0, take) : products;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">{category.name}</h1>
        {category.description && (
          <p className="mt-1 text-neutral-500">{category.description}</p>
        )}
      </header>

      {page.length === 0 ? (
        <EmptyState title="Nothing here yet" description="Check back soon." />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {page.map((p) => (
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
      )}

      <Pagination
        basePath={`/categories/${category.slug}`}
        nextCursor={hasMore ? page[page.length - 1].id : null}
      />
    </div>
  );
}
