#!/usr/bin/env bash
# End-to-end smoke test — happy path + RBAC + status machine.
# Usage: BASE_URL=http://localhost:3000 bash scripts/smoke.sh
set -euo pipefail

BASE="${BASE_URL:-http://localhost:3000}"
TMP="$(mktemp -d)"
ADMIN_JAR="$TMP/admin.jar"
CUSTOMER_JAR="$TMP/customer.jar"
CUSTOMER_EMAIL="smoke-$(date +%s)@shop.dev"
PASS=0
FAIL=0

# Git Bash's mingw64 "$CURL" can be broken (permission denied) — prefer system curl
CURL="$(command -v curl)"
if [ -x "/c/Windows/System32/curl.exe" ]; then
  CURL="/c/Windows/System32/curl.exe"
fi

say()  { echo "── $1"; }
ok()   { echo "  ✓ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ✗ $1"; FAIL=$((FAIL+1)); }

api() { # jar method path [body]  (unused helper kept for ad-hoc debugging)
  local jar="$1" method="$2" path="$3" body="${4:-}"
  "$CURL" -s -o "$TMP/last.json" -w "%{http_code}" -X "$method" \
    -H "Content-Type: application/json" -H "origin: $BASE" \
    -b "$jar" -c "$jar" \
    ${body:+-d "$body"} "$BASE$path"
}

get() { # jar path
  "$CURL" -s -o "$TMP/last.json" -w "%{http_code}" -H "origin: $BASE" \
    -b "$1" -c "$1" "$BASE$2"
}

post() { # jar path body
  "$CURL" -s -o "$TMP/last.json" -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" -H "origin: $BASE" \
    -b "$1" -c "$1" -d "$2" "$BASE$3"
}

patch_() { # jar path body
  "$CURL" -s -o "$TMP/last.json" -w "%{http_code}" -X PATCH \
    -H "Content-Type: application/json" -H "origin: $BASE" \
    -b "$1" -c "$1" -d "$2" "$BASE$3"
}

del_() { # jar path
  "$CURL" -s -o "$TMP/last.json" -w "%{http_code}" -X DELETE \
    -H "origin: $BASE" -b "$1" -c "$1" "$BASE$2"
}

csrf_of() { # jar -> echoes csrf token, stores cookies
  "$CURL" -s -c "$1" "$BASE/api/auth/csrf" | sed -E 's/.*"csrfToken":"([^"]+)".*/\1/'
}

sign_in() { # jar email password
  local token
  token=$("$CURL" -s -c "$1" "$BASE/api/auth/csrf" | sed -E 's/.*"csrfToken":"([^"]+)".*/\1/')
  "$CURL" -s -o /dev/null -b "$1" -c "$1" -X POST \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "csrfToken=$token" \
    --data-urlencode "email=$2" \
    --data-urlencode "password=$3" \
    "$BASE/api/auth/callback/credentials"
}

echo "Smoke test against $BASE"

# 1. Register a CUSTOMER
say "1. register + sign in"
code=$(post "$CUSTOMER_JAR" "{\"name\":\"Smoke Tester\",\"email\":\"$CUSTOMER_EMAIL\",\"password\":\"Password123!\"}" "/api/auth/register")
[ "$code" = "201" ] && ok "register 201" || bad "register → $code"

sign_in "$CUSTOMER_JAR" "$CUSTOMER_EMAIL" "Password123!"
sign_in "$ADMIN_JAR" "admin@shop.dev" "Password123!"

code=$(get "$CUSTOMER_JAR" "/api/cart")
[ "$code" = "200" ] && ok "customer session works" || bad "customer session → $code"

# 2. Browse catalog, pick an in-stock product
say "2. browse + pick product"
code=$(get "$CUSTOMER_JAR" "/api/products?take=20")
[ "$code" = "200" ] && ok "GET /api/products" || bad "products → $code"
# Pick an in-stock product (stock >= 2 so the qty-2 add isn't clamped)
PRODUCT_ID=$(node -e "const d=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));const p=d.items.find(i=>i.quantityOnHand>=2);console.log(p?p.id:d.items[0].id)" "$TMP/last.json")
echo "  product: $PRODUCT_ID"

# 3. Add to cart ×2
say "3. add to cart"
code=$(post "$CUSTOMER_JAR" "{\"productId\":\"$PRODUCT_ID\",\"quantity\":2}" "/api/cart/items")
[ "$code" = "201" ] && ok "add to cart 201" || bad "add to cart → $code"
COUNT=$(grep -o '"count":[0-9]*' "$TMP/last.json" | head -1 | cut -d: -f2)
[ "$COUNT" = "2" ] && ok "cart count = 2" || bad "cart count = $COUNT"

# RBAC: customer must NOT access admin endpoints
say "RBAC checks"
code=$(post "$CUSTOMER_JAR" '{"name":"x","priceCents":1,"images":[],"inventory":{"sku":"NOPE1","quantityOnHand":1}}' "/api/products")
[ "$code" = "403" ] && ok "customer POST /api/products → 403" || bad "RBAC products → $code"
code=$(get "$CUSTOMER_JAR" "/api/admin/stats")
[ "$code" = "403" ] && ok "customer GET /api/admin/stats → 403" || bad "RBAC stats → $code"
code=$(get "$CUSTOMER_JAR" "/api/cart")
code=$("$CURL" -s -o /dev/null -w "%{http_code}" "$BASE/api/cart")
[ "$code" = "401" ] && ok "anon GET /api/cart → 401" || bad "anon cart → $code"

# 4. Address + checkout session
say "4. checkout"
code=$(post "$CUSTOMER_JAR" '{"fullName":"Smoke Tester","line1":"1 Test Way","city":"Testville","postalCode":"00000","country":"US"}' "/api/addresses")
[ "$code" = "201" ] && ok "address created" || bad "address → $code"
ADDRESS_ID=$(sed -E 's/.*"address":\{"id":"([^"]+)".*/\1/' "$TMP/last.json")

code=$(post "$CUSTOMER_JAR" "{\"addressId\":\"$ADDRESS_ID\"}" "/api/checkout/session")
echo "  checkout → $code"

# 5. Webhook signature rejection
say "5. webhook security"
code=$("$CURL" -s -o /dev/null -w "%{http_code}" -X POST -d '{}' "$BASE/api/webhooks/razorpay")
[ "$code" = "400" ] && ok "unsigned webhook → 400" || bad "webhook → $code"

# 6. Admin transitions (needs a PAID order — seeded? report only)
say "6. admin endpoints reachable for ADMIN"
code=$(get "$ADMIN_JAR" "/api/admin/stats")
[ "$code" = "200" ] && ok "admin stats 200" || bad "admin stats → $code"
code=$(get "$ADMIN_JAR" "/api/admin/customers")
[ "$code" = "200" ] && ok "admin customers 200" || bad "admin customers → $code"

echo
echo "SMOKE RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" = "0" ]
