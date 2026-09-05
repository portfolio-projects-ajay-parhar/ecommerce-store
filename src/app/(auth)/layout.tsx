import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
      <Link href="/" className="flex items-center gap-2 text-xl font-bold">
        <ShoppingCartIcon /> Meridian
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
        {children}
      </div>
      <Link href="/products" className="text-sm text-neutral-500 hover:underline">
        ← Back to the store
      </Link>
    </div>
  );
}

function ShoppingCartIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}
