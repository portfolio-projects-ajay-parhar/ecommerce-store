import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit product" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        inventory: true,
      },
    }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);
  if (!product) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Edit product</h1>
      <ProductForm
        categories={categories}
        initial={{
          id: product.id,
          name: product.name,
          description: product.description,
          priceCents: product.priceCents,
          compareAtPriceCents: product.compareAtPriceCents,
          categoryId: product.categoryId,
          status: product.status,
          featured: product.featured,
          images: product.images.map((i) => ({ url: i.url, alt: i.alt, sortOrder: i.sortOrder })),
          inventory: {
            sku: product.inventory?.sku ?? "",
            quantityOnHand: product.inventory?.quantityOnHand ?? 0,
            lowStockThreshold: product.inventory?.lowStockThreshold ?? 5,
          },
        }}
      />
    </div>
  );
}
