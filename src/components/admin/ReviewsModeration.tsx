"use client";

import { useState } from "react";
import { useToast } from "@/components/providers/ToastProvider";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";

export interface ModerationRow {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  status: string;
  createdAt: string;
  reviewerName: string | null;
  productName: string;
  productSlug: string;
}

/** Hide/restore/delete reviews; aggregates are recomputed server-side. */
export function ReviewsModeration({ reviews }: { reviews: ModerationRow[] }) {
  const toast = useToast();
  const [rows, setRows] = useState(reviews);

  const setStatus = async (id: string, status: "PUBLISHED" | "HIDDEN") => {
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed");
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      toast.toast(status === "HIDDEN" ? "Review hidden" : "Review restored", "success");
    } catch (e) {
      toast.toast(e instanceof Error ? e.message : "Failed", "error");
    }
  };

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.toast("Review deleted", "success");
    } catch {
      toast.toast("Could not delete review", "error");
    }
  };

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Stars rating={r.rating} />
              <StatusBadge status={r.status} />
            </div>
            <span className="text-xs text-neutral-400">{formatDate(r.createdAt)}</span>
          </div>
          <p className="mt-2 text-sm">
            <strong>{r.reviewerName}</strong>{" "}
            <span className="text-neutral-400">on</span> {r.productName}
          </p>
          {r.title && <p className="mt-1 font-medium">{r.title}</p>}
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{r.body}</p>
          <div className="mt-3 flex gap-3 text-sm">
            {r.status === "PUBLISHED" ? (
              <button onClick={() => setStatus(r.id, "HIDDEN")} className="hover:underline">
                Hide
              </button>
            ) : (
              <button onClick={() => setStatus(r.id, "PUBLISHED")} className="hover:underline">
                Restore
              </button>
            )}
            <button onClick={() => remove(r.id)} className="text-red-600 hover:underline">
              Delete
            </button>
          </div>
        </li>
      ))}
      {rows.length === 0 && <p className="text-sm text-neutral-500">No reviews yet.</p>}
    </ul>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500" aria-label={`${rating} out of 5`}>
      {"★".repeat(rating)}
      <span className="text-neutral-300 dark:text-neutral-600">{"★".repeat(5 - rating)}</span>
    </span>
  );
}
