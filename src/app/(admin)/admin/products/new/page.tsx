import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">New product</h1>
      <ProductForm categories={categories} />
    </div>
  );
}
