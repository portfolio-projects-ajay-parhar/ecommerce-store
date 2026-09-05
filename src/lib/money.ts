/**
 * Money is stored as integer minor units ("cents"/paise) everywhere in the DB
 * and only formatted at the UI edge. All arithmetic stays in integers — never
 * floats. Razorpay uses the same convention (amount in paise), so DB amounts
 * map 1:1 onto payment requests.
 */
export const CURRENCY = "INR";

export const formatMoney = (paise: number, locale = "en-IN"): string =>
  new Intl.NumberFormat(locale, { style: "currency", currency: CURRENCY }).format(
    paise / 100,
  );

/** Parses a user-facing money string ("₹19.99", "19.99") into integer paise. */
export const parseMoneyToCents = (input: string): number => {
  if (/e/i.test(input) || input.trim().includes("-")) {
    throw new Error("Invalid amount");
  }
  const cleaned = input.replace(/[^0-9.]/g, "");
  const n = Number(cleaned);
  if (cleaned === "" || !Number.isFinite(n) || n < 0) {
    throw new Error("Invalid amount");
  }
  return Math.round(n * 100);
};

/** Flat shipping rule: free over ₹50.00, otherwise ₹5.99. */
export const FREE_SHIPPING_THRESHOLD_CENTS = 5_000;
export const FLAT_SHIPPING_CENTS = 599;

export const computeShippingCents = (subtotalCents: number): number =>
  subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : FLAT_SHIPPING_CENTS;
