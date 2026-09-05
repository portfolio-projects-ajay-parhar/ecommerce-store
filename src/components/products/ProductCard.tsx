import Image from "next/image";
import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { Stars } from "@/components/ui/Stars";

export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  compareAtPriceCents?: number | null;
  image?: string | null;
  avgRating?: number;
  reviewCount?: number;
  quantityOnHand?: number;
  categoryName?: string | null;
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const stock = product.quantityOnHand ?? 0;
  const discounted =
    product.compareAtPriceCents && product.compareAtPriceCents > product.priceCents;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="relative aspect-square overflow-hidden bg-neutral-100 dark:bg-neutral-800">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🛍️</div>
        )}
        {stock === 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-neutral-900/80 px-2 py-0.5 text-[11px] font-medium text-white">
            Out of stock
          </span>
        )}
        {stock > 0 && stock <= 3 && (
          <span className="absolute left-2 top-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-[11px] font-medium text-white">
            Only {stock} left
          </span>
        )}
        {discounted && (
          <span className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white">
            Sale
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {product.categoryName && (
          <span className="text-[11px] uppercase tracking-wide text-neutral-400">
            {product.categoryName}
          </span>
        )}
        <h3 className="line-clamp-2 text-sm font-medium">{product.name}</h3>
        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="flex items-baseline gap-1.5">
            <span className="font-semibold">{formatMoney(product.priceCents)}</span>
            {discounted && (
              <span className="text-xs text-neutral-400 line-through">
                {formatMoney(product.compareAtPriceCents!)}
              </span>
            )}
          </span>
        </div>
        <Stars rating={product.avgRating ?? 0} showValue count={product.reviewCount} />
      </div>
    </Link>
  );
}
