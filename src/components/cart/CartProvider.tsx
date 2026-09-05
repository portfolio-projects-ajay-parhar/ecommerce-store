"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { http, getErrorMessage } from "@/lib/http";
import { useToast } from "@/components/providers/ToastProvider";
import type { CartView } from "@/lib/cart";

/**
 * Cart state for both modes:
 * - Guest: persisted to localStorage["shop.guest-cart"] as {productId, quantity}[]
 * - Signed-in: server cart via /api/cart (source of truth)
 * A non-empty guest cart is merged into the DB cart once, on first sign-in.
 */

const GUEST_KEY = "shop.guest-cart";
const EMPTY: CartView = {
  id: null,
  items: [],
  count: 0,
  subtotalCents: 0,
  shippingCents: 0,
  totalCents: 0,
};

export interface GuestLine {
  productId: string;
  quantity: number;
}

interface CartContextValue {
  cart: CartView;
  isGuest: boolean;
  loading: boolean;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  updateQty: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  removeProduct: (productId: string) => Promise<void>;
  clear: () => Promise<void>;
  refresh: () => void;
  /** Guest-only quantity editing used by the cart page. */
  setGuestQuantity: (productId: string, quantity: number) => void;
  guestItems: GuestLine[];
}

const CartContext = createContext<CartContextValue>({
  cart: EMPTY,
  isGuest: true,
  loading: false,
  addItem: async () => {},
  updateQty: async () => {},
  removeItem: async () => {},
  removeProduct: async () => {},
  clear: async () => {},
  refresh: () => {},
  setGuestQuantity: () => {},
  guestItems: [],
});

export function useCartContext() {
  return useContext(CartContext);
}

function readGuestCart(): GuestLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    const parsed = raw ? (JSON.parse(raw) as GuestLine[]) : [];
    return Array.isArray(parsed)
      ? parsed.filter((l) => typeof l.productId === "string" && l.quantity > 0)
      : [];
  } catch {
    return [];
  }
}

function writeGuestCart(items: GuestLine[]) {
  localStorage.setItem(GUEST_KEY, JSON.stringify(items));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [guestItems, setGuestItems] = useState<GuestLine[]>([]);
  const [serverCart, setServerCart] = useState<CartView>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const mergeDone = useRef(false);
  const toast = useToast();
  const qc = useQueryClient();

  // Hydrate guest cart after mount (deferred to avoid hydration mismatches)
  useEffect(() => {
    const t = setTimeout(() => {
      setGuestItems(readGuestCart());
      setHydrated(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const signedIn = status === "authenticated";

  // Fetch the server cart when signed in
  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    const run = async () => {
      try {
        const { data } = await http.get<{ cart: CartView }>("/cart");
        if (!cancelled) setServerCart(data.cart);
      } catch {
        // leave the empty cart; mutations will refresh it
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  // Merge guest cart into the DB cart once, on first sign-in
  useEffect(() => {
    if (!signedIn || !hydrated || mergeDone.current) return;
    if (guestItems.length === 0) {
      mergeDone.current = true;
      return;
    }
    mergeDone.current = true;
    let cancelled = false;
    const run = async () => {
      try {
        const { data } = await http.post<{ cart: CartView }>("/cart/merge", {
          items: guestItems,
        });
        if (cancelled) return;
        setServerCart(data.cart);
        writeGuestCart([]);
        setGuestItems([]);
        toast.toast("Cart merged", "success");
      } catch (e) {
        if (!cancelled) toast.toast(getErrorMessage(e), "error");
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, hydrated, guestItems.length]);

  const addItem = useCallback(
    async (productId: string, quantity = 1) => {
      if (signedIn) {
        setLoading(true);
        try {
          const { data } = await http.post<{ cart: CartView }>("/cart/items", {
            productId,
            quantity,
          });
          setServerCart(data.cart);
          qc.invalidateQueries({ queryKey: ["cart"] });
        } finally {
          setLoading(false);
        }
      } else {
        setGuestItems((prev) => {
          const next = prev.some((l) => l.productId === productId)
            ? prev.map((l) =>
                l.productId === productId ? { ...l, quantity: l.quantity + quantity } : l,
              )
            : [...prev, { productId, quantity }];
          writeGuestCart(next);
          return next;
        });
      }
    },
    [signedIn, qc],
  );

  const updateQty = useCallback(
    async (itemId: string, quantity: number) => {
      if (!signedIn) return;
      setLoading(true);
      try {
        const { data } = await http.patch<{ cart: CartView }>(`/cart/items/${itemId}`, {
          quantity,
        });
        setServerCart(data.cart);
      } finally {
        setLoading(false);
      }
    },
    [signedIn],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      if (!signedIn) return;
      setLoading(true);
      try {
        const { data } = await http.delete<{ cart: CartView }>(`/cart/items/${itemId}`);
        setServerCart(data.cart);
      } finally {
        setLoading(false);
      }
    },
    [signedIn],
  );

  const removeProduct = useCallback(
    async (productId: string) => {
      if (signedIn) {
        const line = serverCart.items.find((l) => l.productId === productId);
        if (line) await removeItem(line.id);
      } else {
        setGuestItems((prev) => {
          const next = prev.filter((l) => l.productId !== productId);
          writeGuestCart(next);
          return next;
        });
      }
    },
    [signedIn, serverCart.items, removeItem],
  );

  const clear = useCallback(async () => {
    if (signedIn) {
      setLoading(true);
      try {
        const { data } = await http.delete<{ cart: CartView }>("/cart");
        setServerCart(data.cart);
      } finally {
        setLoading(false);
      }
    } else {
      writeGuestCart([]);
      setGuestItems([]);
    }
  }, [signedIn]);

  const setGuestQuantity = useCallback((productId: string, quantity: number) => {
    setGuestItems((prev) => {
      const next =
        quantity <= 0
          ? prev.filter((l) => l.productId !== productId)
          : prev.map((l) => (l.productId === productId ? { ...l, quantity } : l));
      writeGuestCart(next);
      return next;
    });
  }, []);

  const value = useMemo<CartContextValue>(() => {
    if (signedIn) {
      return {
        cart: serverCart,
        isGuest: false,
        loading,
        addItem,
        updateQty,
        removeItem,
        removeProduct,
        clear,
        refresh: () => qc.invalidateQueries({ queryKey: ["cart"] }),
        setGuestQuantity,
        guestItems: [],
      };
    }
    // Guest: counts only until the cart page hydrates product info
    const count = guestItems.reduce((s, l) => s + l.quantity, 0);
    return {
      cart: { ...EMPTY, count },
      isGuest: true,
      loading: !hydrated,
      addItem,
      updateQty: async () => {},
      removeItem: async () => {},
      removeProduct,
      clear,
      refresh: () => {},
      setGuestQuantity,
      guestItems,
    };
  }, [
    signedIn, serverCart, loading, guestItems, hydrated,
    addItem, updateQty, removeItem, removeProduct, clear, setGuestQuantity, qc,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
  // __PART2__
}
