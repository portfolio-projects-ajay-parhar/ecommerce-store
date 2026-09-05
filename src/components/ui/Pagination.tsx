import Link from "next/link";

/** Cursor-based prev/next pagination for server-rendered listings. */
export function Pagination({
  basePath,
  nextCursor,
  prevCursor,
  params = {},
}: {
  basePath: string;
  nextCursor?: string | null;
  prevCursor?: string | null;
  params?: Record<string, string | undefined>;
}) {
  const buildHref = (cursor?: string | null) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (cursor) sp.set("cursor", cursor);
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  if (!nextCursor && !prevCursor) return null;

  return (
    <nav className="mt-8 flex items-center justify-between" aria-label="Pagination">
      {prevCursor ? (
        <Link
          href={buildHref(prevCursor)}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          ← Newer
        </Link>
      ) : (
        <span />
      )}
      {nextCursor ? (
        <Link
          href={buildHref(nextCursor)}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Older →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}