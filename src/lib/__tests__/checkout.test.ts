import { describe, it, expect } from "vitest";
import {
  computeTotals,
  findOverstockLine,
} from "../checkout";

describe("computeTotals (server-side, client amounts never trusted)", () => {
  it("computes subtotal from DB prices", () => {
    const t = computeTotals([
      { unitPriceCents: 1999, quantity: 2 },
      { unitPriceCents: 500, quantity: 1 },
    ]);
    expect(t.subtotalCents).toBe(4498);
  });

  it("free shipping at/over $50, flat 599 below", () => {
    const below = computeTotals([{ unitPriceCents: 4999, quantity: 1 }]);
    expect(below.shippingCents).toBe(599);
    expect(below.totalCents).toBe(5598);

    const at = computeTotals([{ unitPriceCents: 5000, quantity: 1 }]);
    expect(at.shippingCents).toBe(0);
    expect(at.totalCents).toBe(5000);
  });

  it("empty cart totals to zero", () => {
    const t = computeTotals([]);
    expect(t).toEqual({ subtotalCents: 0, shippingCents: 0, totalCents: 0 });
  });

  it("handles large quantities without float drift", () => {
    const t = computeTotals([{ unitPriceCents: 333, quantity: 333 }]);
    expect(t.subtotalCents).toBe(110889);
  });
});

describe("findOverstockLine", () => {
  it("returns null when every quantity fits stock", () => {
    expect(
      findOverstockLine([
        { productId: "a", quantity: 2, stock: 5 },
        { productId: "b", quantity: 1, stock: 1 },
      ]),
    ).toBeNull();
  });

  it("flags the first over-quantity line (pre-checkout guard)", () => {
    expect(
      findOverstockLine([
        { productId: "a", quantity: 1, stock: 5 },
        { productId: "b", quantity: 3, stock: 2 },
      ]),
    ).toEqual({ productId: "b", quantity: 3, stock: 2 });
  });
});
