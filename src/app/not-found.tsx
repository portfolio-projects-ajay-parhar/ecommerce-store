import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl">🧭</p>
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-neutral-500">
        The page you&apos;re looking for doesn&apos;t exist or was moved.
      </p>
      <Link
        href="/"
        className="rounded-xl bg-neutral-900 px-6 py-3 font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900"
      >
        Back to the store
      </Link>
    </div>
  );
}
