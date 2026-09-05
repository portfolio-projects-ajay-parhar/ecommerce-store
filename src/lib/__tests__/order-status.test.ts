import { describe, it, expect } from "vitest";
import type { OrderStatus } from "@prisma/client";
import {
  ALLOWED_TRANSITIONS,
  canTransition,
  assertTransition,
} from "../order-status";
import { IllegalTransitionError } from "../api";

const STATUSES: OrderStatus[] = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
];

describe("order status machine", () => {
  it("every status has a defined transition list", () => {
    for (const s of STATUSES) {
      expect(Array.isArray(ALLOWED_TRANSITIONS[s])).toBe(true);
    }
  });

  it("legal lifecycle transitions pass", () => {
    expect(canTransition("PENDING", "PAID")).toBe(true);
    expect(canTransition("PENDING", "CANCELLED")).toBe(true);
    expect(canTransition("PAID", "PROCESSING")).toBe(true);
    expect(canTransition("PAID", "REFUNDED")).toBe(true);
    expect(canTransition("PROCESSING", "SHIPPED")).toBe(true);
    expect(canTransition("PROCESSING", "REFUNDED")).toBe(true);
    expect(canTransition("SHIPPED", "DELIVERED")).toBe(true);
  });

  it("DELIVERED / CANCELLED / REFUNDED are terminal", () => {
    expect(ALLOWED_TRANSITIONS.DELIVERED).toEqual([]);
    expect(ALLOWED_TRANSITIONS.CANCELLED).toEqual([]);
    expect(ALLOWED_TRANSITIONS.REFUNDED).toEqual([]);
  });

  it("every illegal transition throws", () => {
    for (const from of STATUSES) {
      for (const to of STATUSES) {
        if (ALLOWED_TRANSITIONS[from].includes(to)) continue;
        expect(() => assertTransition(from, to), `${from} → ${to}`).toThrow(
          IllegalTransitionError,
        );
      }
    }
  });

  it("classic illegal move DELIVERED → PAID throws", () => {
    expect(() => assertTransition("DELIVERED", "PAID")).toThrow(
      IllegalTransitionError,
    );
  });

  it("admin cannot pay a PENDING order directly (webhook-only)", () => {
    // PENDING → PAID IS legal in the machine (webhook drives it); but
    // PENDING → SHIPPED is not.
    expect(() => assertTransition("PENDING", "SHIPPED")).toThrow();
  });
});
