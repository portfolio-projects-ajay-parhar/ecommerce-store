"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  User,
  X,
} from "lucide-react";
import { useCartContext } from "@/components/cart/CartProvider";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SearchInput } from "@/components/ui/SearchInput";

/** Storefront navbar: logo, search, wishlist, cart badge, account menu. */
export function PublicNavbar() {
  const { status, data: session } = useSession();
  const { cart } = useCartContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold">
          <ShoppingCart className="h-5 w-5 text-neutral-900 dark:text-neutral-100" aria-hidden />
          <span>Meridian</span>
        </Link>

        <div className="hidden flex-1 md:block">
          <SearchInput placeholder="Search products…" />
        </div>

        <nav className="ml-auto flex items-center gap-1">
          <Link
            href="/wishlist"
            className="rounded-lg p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Wishlist"
          >
            <Heart className="h-5 w-5" />
          </Link>
          <Link
            href="/cart"
            className="relative rounded-lg p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label={`Cart (${cart.count} items)`}
          >
            <ShoppingCart className="h-5 w-5" />
            {cart.count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-900 px-1 text-[10px] font-bold text-white dark:bg-white dark:text-neutral-900">
                {cart.count > 99 ? "99+" : cart.count}
              </span>
            )}
          </Link>
          <ThemeToggle />

          {status === "loading" ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700" />
          ) : status === "authenticated" ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold text-white dark:bg-white dark:text-neutral-900"
                aria-label="Account menu"
              >
                {(session?.user?.name ?? session?.user?.email ?? "?")
                  .charAt(0)
                  .toUpperCase()}
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
                      <p className="truncate text-sm font-medium">{session?.user?.name}</p>
                      <p className="truncate text-xs text-neutral-500">{session?.user?.email}</p>
                    </div>
                    <MenuLink href="/account/profile" icon={<User className="h-4 w-4" />} onClick={() => setMenuOpen(false)}>
                      Profile
                    </MenuLink>
                    <MenuLink href="/account/orders" icon={<Package className="h-4 w-4" />} onClick={() => setMenuOpen(false)}>
                      Orders
                    </MenuLink>
                    {isAdmin && (
                      <MenuLink href="/admin" icon={<LayoutDashboard className="h-4 w-4" />} onClick={() => setMenuOpen(false)}>
                        Admin dashboard
                      </MenuLink>
                    )}
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href="/signin"
              className="rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Sign in
            </Link>
          )}

          <button
            className="rounded-lg p-2 md:hidden"
            onClick={() => setNavOpen((o) => !o)}
            aria-label="Menu"
          >
            {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>
      </div>

      {navOpen && (
        <div className="border-t border-neutral-200 px-4 py-3 md:hidden dark:border-neutral-800">
          <SearchInput placeholder="Search products…" />
        </div>
      )}
    </header>
  );
}

function MenuLink({
  href,
  icon,
  onClick,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
    >
      {icon}
      {children}
    </Link>
  );
}
