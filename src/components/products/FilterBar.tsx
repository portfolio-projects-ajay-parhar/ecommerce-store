import Link from "next/link";

interface SearchParams {
  q?: string;
  categoryId?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
}

interface Category {
  id: string;
  name: string;
}

/** Server-rendered filter bar; submits as GET to /products (shareable URLs). */
export function FilterBar({
  params,
  categories,
}: {
  params: SearchParams;
  categories: Category[];
}) {
  return (
    <form
      action="/products"
      className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
    >
      {params.q && <input type="hidden" name="q" value={params.q} />}
      <label className="flex flex-col gap-1 text-xs text-neutral-500">
        Category
        <select
          name="categoryId"
          defaultValue={params.categoryId ?? ""}
          className="rounded-lg border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700"
        >
          <option value="">All</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-neutral-500">
        Min price ($)
        <input
          name="minPrice"
          type="number"
          min="0"
          step="0.01"
          defaultValue={params.minPrice ? (Number(params.minPrice) / 100).toFixed(2) : ""}
          className="w-24 rounded-lg border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-neutral-500">
        Max price ($)
        <input
          name="maxPrice"
          type="number"
          min="0"
          step="0.01"
          defaultValue={params.maxPrice ? (Number(params.maxPrice) / 100).toFixed(2) : ""}
          className="w-24 rounded-lg border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-neutral-500">
        Sort
        <select
          name="sort"
          defaultValue={params.sort ?? "newest"}
          className="rounded-lg border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700"
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low → high</option>
          <option value="price_desc">Price: high → low</option>
          <option value="rating">Top rated</option>
        </select>
      </label>
      <button className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900">
        Apply
      </button>
      <Link href="/products" className="text-sm text-neutral-500 hover:underline">
        Reset
      </Link>
    </form>
  );
}
