"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { http, getErrorMessage } from "@/lib/http";
import { useToast } from "@/components/providers/ToastProvider";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMoney } from "@/lib/money";

export interface AdminProductRow {
  id: string;
  slug: string;
  name: string;
  status: string;
  priceCents: number;
  categoryName: string | null;
  image: string | null;
  quantityOnHand: number;
}

export function ProductsTable({ products }: { products: AdminProductRow[] }) {
  const toast = useToast();
  const [rows, setRows] = useState(products);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filtered = rows.filter(
    (r) =>
      (statusFilter === "ALL" || r.status === statusFilter) &&
      r.name.toLowerCase().includes(q.toLowerCase()),
  );

  const archive = async (id: string) => {
    try {
      const res = await http.delete(`/products/${id}`);
      setRows((prev) =>
        res.data.archived
          ? prev.map((p) => (p.id === id ? { ...p, status: "ARCHIVED" } : p))
          : prev.filter((p) => p.id !== id),
      );
      toast.toast(res.data.archived ? "Product archived" : "Product deleted", "success");
    } catch (e) {
      toast.toast(getErrorMessage(e), "error");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
          className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-transparent px-2 py-2 text-sm dark:border-neutral-700"
        >
          {["ALL", "ACTIVE", "DRAFT", "ARCHIVED"].map((s) => (
            <option key={s} value={s}>
              {s === "ALL" ? "All statuses" : s}
            </option>
          ))}
        </select>
        <Link
          href="/admin/products/new"
          className="ml-auto rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          New product
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left dark:bg-neutral-900">
            <tr>
              <th className="p-3 font-medium">Product</th>
              <th className="p-3 font-medium">Price</th>
              <th className="p-3 font-medium">Category</th>
              <th className="p-3 font-medium">Stock</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {filtered.map((p) => (
              <tr key={p.id}>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {p.image && (
                      <Image
                        src={p.image}
                        alt=""
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded object-cover"
                      />
                    )}
                    <span className="font-medium">{p.name}</span>
                  </div>
                </td>
                <td className="p-3">{formatMoney(p.priceCents)}</td>
                <td className="p-3 text-neutral-500">{p.categoryName ?? "—"}</td>
                <td className={`p-3 ${p.quantityOnHand <= 5 ? "font-medium text-amber-600" : ""}`}>
                  {p.quantityOnHand}
                </td>
                <td className="p-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-3">
                    <Link href={`/admin/products/${p.id}/edit`} className="hover:underline">
                      Edit
                    </Link>
                    {p.status !== "ARCHIVED" && (
                      <button
                        onClick={() => archive(p.id)}
                        className="text-red-600 hover:underline"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-neutral-500">
                  No products match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
