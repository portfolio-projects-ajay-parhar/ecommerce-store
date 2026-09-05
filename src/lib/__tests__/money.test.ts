import { describe, it, expect } from "vitest";
import {
  formatMoney,
  parseMoneyToCents,
  computeShippingCents,
} from "../money";

describe("formatMoney", () => {
  it("formats integer paise as INR", () => {
    expect(formatMoney(1999)).toBe("₹19.99");
  });

  it("formats zero", () => {
    expect(formatMoney(0)).toBe("₹0.00");
  });

  it("formats thousands with separators", () => {
    expect(formatMoney(123456)).toBe("₹1,234.56");
  });

  it("formats free shipping (0) as ₹0.00", () => {
    expect(formatMoney(0)).toBe("₹0.00");
  });
});

describe("parseMoneyToCents", () => {
  it("parses plain decimals", () => {
    expect(parseMoneyToCents("19.99")).toBe(1999);
  });

  it("parses with currency symbol", () => {
    expect(parseMoneyToCents("$1,234.56")).toBe(123456);
  });

  it("rounds half cents correctly", () => {
    expect(parseMoneyToCents("10.005")).toBe(1001); // float-safe round
    expect(parseMoneyToCents("10.004")).toBe(1000);
  });

  it("parses integers", () => {
    expect(parseMoneyToCents("25")).toBe(2500);
  });

  it("rejects negatives", () => {
    expect(() => parseMoneyToCents("-5")).toThrow("Invalid amount");
  });

  it("rejects garbage / empty input", () => {
    expect(() => parseMoneyToCents("abc")).toThrow("Invalid amount");
    expect(() => parseMoneyToCents("")).toThrow("Invalid amount");
    expect(() => parseMoneyToCents("...")).toThrow("Invalid amount");
  });
});

describe("computeShippingCents", () => {
  it("charges flat rate below the free threshold", () => {
    expect(computeShippingCents(4999)).toBe(599);
  });

  it("is free at exactly ₹50", () => {
    expect(computeShippingCents(5000)).toBe(0);
  });

  it("is free above the threshold", () => {
    expect(computeShippingCents(25000)).toBe(0);
  });
});
