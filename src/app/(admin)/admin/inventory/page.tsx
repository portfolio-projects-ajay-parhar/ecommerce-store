import { prisma } from "@/lib/prisma";
import { InventoryTable } from "@/components/admin/InventoryTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inventory" };

export default async function AdminInventoryPage() {
  const rows = await prisma.inventory.findMany({
    where: { product: { status: { in: ["ACTIVE", "DRAFT"] } } },
    include: { product: { select: { name: true, slug: true } } },
    orderBy: { quantityOnHand: "asc" },
    take: 200,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Inventory</h1>
        <p className="text-sm text-neutral-500">
          Low-stock rows are highlighted. SKU is immutable once created.
        </p>
      </div>
      <InventoryTable
        items={rows.map((r) => ({
          productId: r.productId,
          sku: r.sku,
          quantityOnHand: r.quantityOnHand,
          lowStockThreshold: r.lowStockThreshold,
          productName: r.product.name,
          productSlug: r.product.slug,
        }))}
      />
    </div>
  );
}
