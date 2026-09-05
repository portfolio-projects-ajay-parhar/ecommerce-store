"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const STATUSES = ["ALL", "PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

/** Status filter that updates the URL (server re-renders with the filter). */
export function OrdersFilter({ current }: { current: string }) {
  const params = useSearchParams();
  const pathname = usePathname();

  const href = (s: string) => {
    if (s === "ALL") return pathname;
    const sp = new URLSearchParams(params.toString());
    sp.set("status", s);
    return `${pathname}?${sp.toString()}`;
  };

  return (
    <div className="flex flex-wrap gap-2 text-sm">
      {STATUSES.map((s) => (
        <Link
          key={s}
          href={href(s)}
          className={`rounded-full px-3 py-1 transition ${
            current === s
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              : "border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          }`}
        >
          {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
        </Link>
      ))}
    </div>
  );
}
