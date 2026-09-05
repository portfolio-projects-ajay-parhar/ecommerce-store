"use client";

import { useState } from "react";
import { http, getErrorMessage } from "@/lib/http";
import { useToast } from "@/components/providers/ToastProvider";

export interface InventoryRow {
  productId: string;
  sku: string;
  quantityOnHand: number;
  lowStockThreshold: number;
  productName: string;
  productSlug: string;
}

/** Editable stock table: absolute set or ±delta; SKU is display-only. */
export function InventoryTable({ items }: { items: InventoryRow[] }) {
  const toast = useToast();
  const [rows, setRows] = useState(items);
  const [busyId, setBusyId] = useState<string | null>(null);

  const adjust = async (productId: string, delta: number) => {
    setBusyId(productId);
    // Optimistic update
    setRows((prev) =>
      prev.map((r) =>
        r.productId === productId
          ? { ...r, quantityOnHand: Math.max(0, r.quantityOnHand + delta) }
          : r,
      ),
    );
    try {
      await http.patch(`/admin/inventory?productId=${productId}`, { delta });
    } catch (e) {
      toast.toast(getErrorMessage(e), "error");
      setRows((prev) =>
        prev.map((r) =>
          r.productId === productId
            ? { ...r, quantityOnHand: Math.max(0, r.quantityOnHand - delta) }
            : r,
        ),
      );
    } finally {
      setBusyId(null);
    }
  };

  const setAbsolute = async (productId: string, value: number) => {
    setBusyId(productId);
    try {
      const { data } = await http.patch(`/admin/inventory?productId=${productId}`, {
        quantityOnHand: Math.max(0, value),
      });
      setRows((prev) =>
        prev.map((r) =>
          r.productId === productId
            ? { ...r, quantityOnHand: data.inventory.quantityOnHand }
            : r,
        ),
      );
    } catch (e) {
      toast.toast(getErrorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left dark:bg-neutral-900">
          <tr>
            <th className="p-3 font-medium">Product</th>
            <th className="p-3 font-medium">SKU</th>
            <th className="p-3 font-medium">Stock</th>
            <th className="p-3 font-medium">Adjust</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {rows.map((r) => {
            const low = r.quantityOnHand <= r.lowStockThreshold;
            return (
              <tr
                key={r.productId}
                className={low ? "bg-amber-50 dark:bg-amber-950/40" : undefined}
              >
                <td className="p-3 font-medium">{r.productName}</td>
                <td className="p-3 font-mono text-xs text-neutral-500">{r.sku}</td>
                <td className="p-3">
                  <input
                    type="number"
                    min="0"
                    defaultValue={r.quantityOnHand}
                    key={`${r.productId}-${r.quantityOnHand}`}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v !== r.quantityOnHand && v >= 0) setAbsolute(r.productId, v);
                    }}
                    className={`w-20 rounded border px-2 py-1 ${
                      low
                        ? "border-amber-400 font-medium text-amber-700 dark:text-amber-300"
                        : "border-neutral-300 dark:border-neutral-700"
                    } bg-transparent`}
                    aria-label={`Stock for ${r.productName}`}
                  />
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => adjust(r.productId, -1)}
                      disabled={busyId === r.productId || r.quantityOnHand === 0}
                      className="rounded border border-neutral-300 px-2 py-0.5 disabled:opacity-40 dark:border-neutral-700"
                    >
                      −1
                    </button>
                    <button
                      onClick={() => adjust(r.productId, +1)}
                      disabled={busyId === r.productId}
                      className="rounded border border-neutral-300 px-2 py-0.5 disabled:opacity-40 dark:border-neutral-700"
                    >
                      +1
                    </button>
                    <button
                      onClick={() => adjust(r.productId, +10)}
                      disabled={busyId === r.productId}
                      className="rounded border border-neutral-300 px-2 py-0.5 disabled:opacity-40 dark:border-neutral-700"
                    >
                      +10
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
