"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

/** Debounced search input that syncs to ?q= via router.replace. */
export function SearchInput({
  initialQuery = "",
  placeholder = "Search posts…",
  paramName = "q",
}: {
  initialQuery?: string;
  placeholder?: string;
  paramName?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const debounced = useDebounce(value, 350);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (debounced) params.set(paramName, debounced);
    else params.delete(paramName);
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, paramName]);

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label="Search"
        className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900"
      />
    </div>
  );
}