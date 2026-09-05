"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Stars } from "@/components/ui/Stars";
import { ReviewComposer } from "./ReviewComposer";
import { formatDate } from "@/lib/utils";

interface ReviewDTO {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  reviewerName: string;
  createdAt: string;
}

interface ReviewData {
  items: ReviewDTO[];
  nextCursor: string | null;
  avgRating: number;
  reviewCount: number;
}

export function ReviewSection(props: {
  productKey: string;
  purchased: boolean;
  hasReviewed: boolean;
}) {
  const { status } = useSession();
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/products/${props.productKey}/reviews`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [props.productKey]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="flex flex-col gap-6" id="reviews">
      <h2 className="text-xl font-semibold">Reviews</h2>

      {data && data.reviewCount > 0 && (
        <Stars rating={data.avgRating} size="md" showValue count={data.reviewCount} />
      )}

      {/* CTA states */}
      {status === "unauthenticated" ? (
        <p className="rounded-xl bg-neutral-100 p-4 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          Reviews are for verified buyers.{" "}
          <Link href="/signin" className="underline">
            Sign in
          </Link>{" "}
          after purchasing to leave a review.
        </p>
      ) : status === "authenticated" && props.purchased && !props.hasReviewed ? (
        <ReviewComposer productKey={props.productKey} onDone={load} />
      ) : status === "authenticated" && props.hasReviewed ? (
        <p className="rounded-xl bg-neutral-100 p-4 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          You already reviewed this product — thanks!
        </p>
      ) : null}

      {/* List */}
      {loading ? (
        <div className="h-24 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
      ) : !data || data.items.length === 0 ? (
        <p className="text-sm text-neutral-500">No reviews yet.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {data.items.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <div className="flex items-center justify-between gap-2">
                <Stars rating={r.rating} />
                <span className="text-xs text-neutral-400">{formatDate(r.createdAt)}</span>
              </div>
              {r.title && <h3 className="mt-2 font-medium">{r.title}</h3>}
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{r.body}</p>
              <p className="mt-2 text-xs text-neutral-400">— {r.reviewerName}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
