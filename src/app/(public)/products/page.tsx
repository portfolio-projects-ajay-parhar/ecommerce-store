import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/products/ProductCard";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/products/FilterBar";

export const dynamic = "force-dynamic";

export const metadata = { title: "All products" };

interface SearchParams {
  q?: string;
  categoryId?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  cursor?: string;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const take = 12;

  const [categories, products] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: {
        status: "ACTIVE",
        ...(sp.q
          ? {
              OR: [
                { name: { contains: sp.q, mode: "insensitive" } },
                { description: { contains: sp.q, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(sp.categoryId ? { categoryId: sp.categoryId } : {}),
        ...(sp.minPrice || sp.maxPrice
          ? {
              priceCents: {
                ...(sp.minPrice ? { gte: Number(sp.minPrice) } : {}),
                ...(sp.maxPrice ? { lte: Number(sp.maxPrice) } : {}),
              },
            }
          : {}),
      },
      orderBy:
        sp.sort === "price_asc"
          ? [{ priceCents: "asc" }]
          : sp.sort === "price_desc"
            ? [{ priceCents: "desc" }]
            : sp.sort === "rating"
              ? [{ avgRating: "desc" }, { reviewCount: "desc" }]
              : [{ createdAt: "desc" }],
      take: take + 1,
      ...(sp.cursor ? { cursor: { id: sp.cursor }, skip: 1 } : {}),
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        inventory: { select: { quantityOnHand: true } },
        category: { select: { name: true } },
      },
    }),
  ]);

  const hasMore = products.length > take;
  const page = hasMore ? products.slice(0, take) : products;
  const prevCursor = sp.cursor ? page[0]?.id : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">All products</h1>
        <SearchInput initialQuery={sp.q ?? ""} placeholder="Search products…" />
      </div>

      <FilterBar params={sp} categories={categories} />

      {page.length === 0 ? (
        <EmptyState
          title="No products found"
          description="Try adjusting your search or filters."
        />
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
                categoryName: p.category?.name ?? null,
              }}
            />
          ))}
        </div>
      )}

      <Pagination
        basePath="/products"
        nextCursor={hasMore ? page[page.length - 1].id : null}
        prevCursor={prevCursor}
        params={{
          q: sp.q,
          categoryId: sp.categoryId,
          minPrice: sp.minPrice,
          maxPrice: sp.maxPrice,
          sort: sp.sort,
        }}
      />
    </div>
  );
}
