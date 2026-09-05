import { cn } from "@/lib/utils";

type BadgeStatus =
  | "PENDING" | "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED"
  | "CANCELLED" | "REFUNDED"
  | "DRAFT" | "ACTIVE" | "ARCHIVED"
  | "SUCCEEDED" | "FAILED" | "PUBLISHED" | "HIDDEN";

const STATUS_STYLES: Record<BadgeStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  PAID: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  PROCESSING: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  SHIPPED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  DELIVERED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  CANCELLED: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
  REFUNDED: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  DRAFT: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  ARCHIVED: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
  SUCCEEDED: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  FAILED: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  PUBLISHED: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  HIDDEN: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status as BadgeStatus] ?? STATUS_STYLES.CANCELLED;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        style,
      )}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
