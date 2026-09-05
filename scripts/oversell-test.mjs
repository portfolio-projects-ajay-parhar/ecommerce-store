/**
 * Oversell concurrency test — proves the conditional-update guard.
 *
 * Usage: node scripts/oversell-test.mjs [baseUrl]
 * Requires: a signed-in CUSTOMER and an ADMIN (cookie jars via fetch).
 *
 * Steps:
 *  1. Register/sign in two fresh customers.
 *  2. ADMIN creates a product with stock = 1.
 *  3. Both users add it to their carts and fire POST /api/checkout/session
 *     in parallel.
 *  4. Assert: exactly one 2xx, one 409 OUT_OF_STOCK; inventory is exactly 0.
 *
 * NOTE: register is rate-limited (5/min/IP) — waiting ~1 minute between runs
 * lets you re-run this test repeatedly.
 */
const BASE = process.argv[2] ?? "http://localhost:3000";

function cookieJar() {
  return { cookie: "" };
}

async function api(jar, path, { method = "GET", body, formData, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body && !formData ? { "Content-Type": "application/json" } : {}),
      ...(jar.cookie ? { cookie: jar.cookie } : {}),
      origin: BASE,
      ...headers,
    },
    body: formData ? formData : body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  for (const c of setCookie) {
    const pair = c.split(";")[0];
    jar.cookie = jar.cookie ? `${jar.cookie}; ${pair}` : pair;
  }
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* 204s etc. */
  }
  return { status: res.status, json };
}

const rand = Math.random().toString(36).slice(2, 8);

async function registerAndSignIn(email) {
  const jar = cookieJar();
  await api(jar, "/api/auth/register", {
    method: "POST",
    body: { name: `Oversell ${rand}`, email, password: "Password123!" },
  });
  // Sign in via NextAuth credentials endpoint (csrf cookie must be forwarded)
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  absorbCookie(jar, csrfRes);
  const signInRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      origin: BASE,
      cookie: jar.cookie,
    },
    body: new URLSearchParams({
      csrfToken,
      email,
      password: "Password123!",
      json: "true",
    }),
    redirect: "manual",
  });
  absorbCookie(jar, signInRes);
  return jar;
}

function absorbCookie(jar, res) {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const pair = c.split(";")[0];
    jar.cookie = jar.cookie ? `${jar.cookie}; ${pair}` : pair;
  }
}

async function main() {
  console.log(`Oversell test against ${BASE}`);

  // Sign in as the seeded ADMIN (product writes are ADMIN-only)
  const adminJar = cookieJar();
  {
    const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
    const { csrfToken } = await csrfRes.json();
    absorbCookie(adminJar, csrfRes);
    const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        origin: BASE,
        cookie: adminJar.cookie,
      },
      body: new URLSearchParams({
        csrfToken,
        email: "admin@shop.dev",
        password: "Password123!",
        json: "true",
      }),
      redirect: "manual",
    });
    absorbCookie(adminJar, res);
  }

  // 1. ADMIN creates a stock=1 product
  const create = await api(adminJar, "/api/products", {
    method: "POST",
    body: {
      name: `Oversell Probe ${rand}`,
      description: "<p>probe</p>",
      priceCents: 100,
      status: "ACTIVE",
      images: [],
      inventory: { sku: `OS-${rand.toUpperCase()}`, quantityOnHand: 1 },
    },
  });
  if (create.status !== 201) {
    throw new Error(
      `product create failed: ${create.status} ${JSON.stringify(create.json)}`,
    );
  }
  const productId = create.json.product.id;

  // 2. Two customers, both add to cart
  const jars = [
    await registerAndSignIn(`oversell-a-${rand}@shop.dev`),
    await registerAndSignIn(`oversell-b-${rand}@shop.dev`),
  ];
  for (const jar of jars) {
    // address required for checkout
    const addr = await api(jar, "/api/addresses", {
      method: "POST",
      body: {
        fullName: "Probe Buyer",
        line1: "1 Test Way",
        city: "Testville",
        postalCode: "00000",
        country: "US",
      },
    });
    await api(jar, "/api/cart/items", {
      method: "POST",
      body: { productId, quantity: 1 },
    });
    jar.addressId = addr.json.address.id;
  }

  // 3. Parallel checkout
  const [r1, r2] = await Promise.all(
    jars.map((jar) =>
      api(jar, "/api/checkout/session", {
        method: "POST",
        body: { addressId: jar.addressId },
      }),
    ),
  );


  console.log("checkout statuses:", r1.status, r2.status);
  const winners = [r1, r2].filter((r) => r.status === 200 || r.status === 503);
  const losers = [r1, r2].filter((r) => r.status === 409);

  // With Razorpay unconfigured, the winner gets 503 — still exactly one winner.
  const ok =
    winners.length === 1 &&
    losers.length === 1 &&
    losers[0].json?.error === "OUT_OF_STOCK";

  // 4. Verify inventory is exactly 0 (never -1)
  const detail = await api(adminJar, `/api/products/${productId}`);
  const stock = detail.json?.product?.inventory?.quantityOnHand ?? -999;

  console.log("winner stock:", stock);
  if (!ok) {
    console.error("FAIL: expected exactly one winner + one 409 OUT_OF_STOCK");
    process.exit(1);
  }
  if (stock !== 0) {
    console.error(`FAIL: inventory must be exactly 0, got ${stock}`);
    process.exit(1);
  }

  // Cleanup: archive the probe product
  await api(adminJar, `/api/products/${productId}`, { method: "DELETE" });

  console.log("PASS — exactly one checkout won, stock is exactly 0 (no oversell)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
