"use client";

import { useState } from "react";
import { useToast } from "@/components/providers/ToastProvider";

/** Review composer (verified buyers only — gating is server-side too). */
export function ReviewComposer({
  productKey,
  onDone,
}: {
  productKey: string;
  onDone: () => void;
}) {
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${productKey}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, title: title || null, body }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.toast(json.error ?? "Could not submit review", "error");
        return;
      }
      toast.toast("Review published — thank you!", "success");
      onDone();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
    >
      <h3 className="font-medium">Write a review</h3>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            onClick={() => setRating(n)}
            className={`text-2xl leading-none transition ${n <= rating ? "text-amber-500" : "text-neutral-300 dark:text-neutral-600"}`}
            aria-label={`${n} stars`}
          >
            ★
          </button>
        ))}
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (optional)"
        maxLength={120}
        className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What did you think? (10–2000 characters)"
        required
        minLength={10}
        maxLength={2000}
        rows={4}
        className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
      />
      <button
        disabled={submitting}
        className="self-start rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900"
      >
        {submitting ? "Publishing…" : "Publish review"}
      </button>
    </form>
  );
}
