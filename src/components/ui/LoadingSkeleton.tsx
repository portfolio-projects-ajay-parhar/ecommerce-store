import { cn } from "@/lib/utils";

/** PostCard-shaped placeholder for loading grids. */
export function PostCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="mb-4 h-40 w-full rounded-lg bg-neutral-200 dark:bg-neutral-800" />
      <div className="mb-2 h-5 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="mb-4 h-3 w-full rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="mb-4 h-3 w-2/3 rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-3 w-24 rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>
    </div>
  );
}

export function PostsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Full-detail placeholder for the post detail page. */
export function PostDetailSkeleton() {
  return (
    <div className={cn("animate-pulse space-y-4")}>
      <div className="h-4 w-40 rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="h-10 w-full rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="h-10 w-2/3 rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="h-64 w-full rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-3 w-full rounded bg-neutral-200 dark:bg-neutral-800" />
        ))}
      </div>
    </div>
  );
}

/** Dashboard-style placeholder: heading + KPI/toolbar block + table rows. */
export function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-56 rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900"
          />
        ))}
      </div>
      <div className="space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-3 flex-1 rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-3 w-16 rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-6 w-20 rounded-full bg-neutral-200 dark:bg-neutral-800" />
          </div>
        ))}
      </div>
    </div>
  );
}