import Link from "next/link";
import { SITE_NAME } from "@/lib/utils";

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 py-8 dark:border-neutral-800">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-neutral-500 sm:flex-row dark:text-neutral-400">
        <p>
          © {new Date().getFullYear()} {SITE_NAME} — a portfolio e-commerce build
        </p>
        <nav className="flex gap-4">
          <Link href="/products" className="hover:underline">
            All products
          </Link>
          <Link href="/wishlist" className="hover:underline">
            Wishlist
          </Link>
          <Link href="/account/orders" className="hover:underline">
            My orders
          </Link>
        </nav>
      </div>
    </footer>
  );
}
