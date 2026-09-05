# Phase 4 — Shopping Cart

## Goals
1. One DB cart per signed-in user (`Cart` 1:1 `User`)
2. Guest cart in `localStorage`, **merged** into the DB cart on sign-in
3. Server-side validation of every quantity against live inventory
4. Cart APIs + cart page + header badge

## Steps

### 4.1 CartProvider (src/components/providers/cartprovider.tsx)
- Client context; state shape: `{ items: { productId, quantity }[], serverCart?: CartView }`
- Guest mode: persist to `localStorage["shop.guest-cart"]`
- Signed-in mode: source of truth is `GET /api/cart` via TanStack Query
- Exposes: `addItem(productId, qty)`, `updateQty`, `removeItem`, `clear`, `count`, `subtotalCents`
- On mount with a session + non-empty guest cart → `POST /api/cart/merge` once, then clear guest storage

### 4.2 Cart APIs (all signed-in)
- `GET /api/cart` — returns items joined with product (`name`, `slug`, `unitPriceCents`, `image`, `available`, `maxQuantity = Inventory.quantityOnHand`)
  - **mark lines whose quantity exceeds stock** rather than silently truncating
- `POST /api/cart/items` — body `{ productId, quantity }`
  - zod: quantity int 1–99
  - reject if product not ACTIVE → `404`
  - reject if `quantity > Inventory.quantityOnHand` → `409 OUT_OF_STOCK { productId }`
  - upsert on unique `(cartId, productId)` — adding again increments (clamped to stock)
- `PATCH /api/cart/items/[id]` — quantity change, same validations
- `DELETE /api/cart/items/[id]`, `DELETE /api/cart` (empty the cart)
- `POST /api/cart/merge` — body `{ items: [{ productId, quantity }] }` → upsert each, clamping to stock; return the merged cart

### 4.3 Hooks (src/hooks/usecart.ts)
- `useCart()` — query for signed-in, context for guest
- `useAddToCart()` / `useUpdateCartItem()` / `useRemoveCartItem()` mutations with optimistic updates + toast on 409

### 4.4 Cart page (src/app/(public)/cart/page.tsx)
- Line rows: image, name, unit price, qty stepper (max = stock), line total, remove
- Out-of-stock/over-quantity lines get a warning chip and disable checkout
- Summary card: subtotal, shipping estimate ("calculated at checkout"), Continue to checkout
- Empty state

### 4.5 Header integration
- Cart icon with badge = total quantity (from provider)
- "Add to cart" buttons wired on product cards + detail page (Phase 8 uses the same hook)

## Done When
- Signed-in add → appears in DB cart; reload persists
- Guest add → survives reload → sign in → merged into DB cart, guest storage cleared
- Adding beyond stock clamps to stock and surfaces a warning
- Adding a second time increments the same CartItem row (unique key verified in Prisma Studio)
- Anon `GET /api/cart` returns 401