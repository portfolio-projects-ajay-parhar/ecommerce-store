"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Trash2, UploadCloud } from "lucide-react";
import { http, getErrorMessage } from "@/lib/http";
import { useToast } from "@/components/providers/ToastProvider";
import { MediaPicker } from "@/components/media/MediaPicker";
import { parseMoneyToCents } from "@/lib/money";

interface ImageRow {
  url: string;
  alt: string | null;
  sortOrder: number;
}

export interface ProductFormData {
  id?: string;
  name: string;
  description: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  categoryId: string | null;
  status: string;
  featured: boolean;
  images: ImageRow[];
  inventory: { sku: string; quantityOnHand: number; lowStockThreshold: number };
}

export function ProductForm({
  categories,
  initial,
}: {
  categories: { id: string; name: string }[];
  initial?: ProductFormData;
}) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial ? (initial.priceCents / 100).toFixed(2) : "");
  const [compareAt, setCompareAt] = useState(
    initial?.compareAtPriceCents ? (initial.compareAtPriceCents / 100).toFixed(2) : "",
  );
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [status, setStatus] = useState(initial?.status ?? "DRAFT");
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [images, setImages] = useState<ImageRow[]>(initial?.images ?? []);
  const [sku, setSku] = useState(initial?.inventory.sku ?? "");
  const [qty, setQty] = useState(String(initial?.inventory.quantityOnHand ?? 0));
  const [threshold, setThreshold] = useState(String(initial?.inventory.lowStockThreshold ?? 5));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        name,
        description,
        priceCents: parseMoneyToCents(price),
        compareAtPriceCents: compareAt ? parseMoneyToCents(compareAt) : null,
        categoryId: categoryId || null,
        status,
        featured,
        images: images.map((img, i) => ({ ...img, sortOrder: i })),
        inventory: {
          sku,
          quantityOnHand: Number(qty) || 0,
          lowStockThreshold: Number(threshold) || 0,
        },
      };
      if (initial?.id) {
        await http.patch(`/products/${initial.id}`, body);
        toast.toast("Product updated", "success");
      } else {
        await http.post("/products", body);
        toast.toast("Product created", "success");
      }
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      toast.toast(getErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const addImage = (url: string) => {
    if (!images.some((i) => i.url === url)) {
      setImages((prev) => [...prev, { url, alt: null, sortOrder: prev.length }]);
    }
    setPickerOpen(false);
  };

  const inputCls =
    "rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700";

  return (
    <form onSubmit={save} className="flex max-w-2xl flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Description (basic HTML allowed — sanitized server-side)
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          className={inputCls}
        />
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Price ($)
          <input
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="19.99"
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Compare-at ($, optional)
          <input
            value={compareAt}
            onChange={(e) => setCompareAt(e.target.value)}
            placeholder="29.99"
            className={inputCls}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Category
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-transparent px-2 py-2 dark:border-neutral-700"
          >
            <option value="">— none —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-transparent px-2 py-2 dark:border-neutral-700"
          >
            {["DRAFT", "ACTIVE", "ARCHIVED"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
        Featured on the home page
      </label>

      <fieldset className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <legend className="px-1 text-sm font-medium">Inventory</legend>
        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            SKU
            <input
              required
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              disabled={Boolean(initial?.id)}
              className={`${inputCls} disabled:opacity-50`}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Quantity
            <input
              required
              type="number"
              min="0"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Low-stock at
            <input
              type="number"
              min="0"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className={inputCls}
            />
          </label>
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Images ({images.length}/6)</span>
        <div className="flex flex-wrap gap-3">
          {images.map((img, i) => (
            <div
              key={img.url}
              className="group relative h-20 w-20 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700"
            >
              <Image src={img.url} alt={img.alt ?? ""} fill sizes="80px" className="object-cover" />
              <button
                type="button"
                onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                aria-label="Remove image"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {images.length < 6 && (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              <UploadCloud className="h-4 w-4" />
              Add
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          disabled={saving}
          className="rounded-lg bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {saving ? "Saving…" : initial?.id ? "Save changes" : "Create product"}
        </button>
        <button type="button" onClick={() => router.back()} className="text-sm text-neutral-500 hover:underline">
          Cancel
        </button>
      </div>

      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={addImage} />
    </form>
  );
}
