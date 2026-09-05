import { prisma } from "@/lib/prisma";
import { ProductsTable } from "@/components/admin/ProductsTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Products" };

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      inventory: { select: { quantityOnHand: true } },
      category: { select: { name: true } },
    },
    take: 200,
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Products</h1>
      <ProductsTable
        products={products.map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          status: p.status,
          priceCents: p.priceCents,
          categoryName: p.category?.name ?? null,
          image: p.images[0]?.url ?? null,
          quantityOnHand: p.inventory?.quantityOnHand ?? 0,
        }))}
      />
    </div>
  );
}
