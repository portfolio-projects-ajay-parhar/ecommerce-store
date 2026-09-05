"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "./ThemeProvider";
import { SessionProviderWrapper } from "./SessionProvider";
import { QueryProvider } from "./QueryProvider";
import { ToastProvider } from "./ToastProvider";
import { CartProvider } from "@/components/cart/CartProvider";

/** Client provider stack: theme → session → query → toasts → cart. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProviderWrapper>
        <QueryProvider>
          <ToastProvider>
            <CartProvider>{children}</CartProvider>
          </ToastProvider>
        </QueryProvider>
      </SessionProviderWrapper>
    </ThemeProvider>
  );
}
