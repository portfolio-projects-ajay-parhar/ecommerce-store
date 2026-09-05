"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, UploadCloud } from "lucide-react";
import { useMyMedia, useUploadMedia } from "@/hooks/useMedia";
import { useToast } from "@/components/providers/ToastProvider";
import { getErrorMessage } from "@/lib/http";

/**
 * Modal media picker: Upload (drag-drop / file picker) + Library tabs.
 * Calls onSelect(publicUrl) when the user picks or uploads an image.
 */
export function MediaPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}) {
  const { toast } = useToast();
  const upload = useUploadMedia();
  const media = useMyMedia();
  const [tab, setTab] = useState<"upload" | "library">("upload");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleFiles = async (files: FileList | File[] | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const item = await upload.mutateAsync(file);
      toast("Image uploaded.", "success");
      onSelect(item.url);
    } catch (e) {
      toast(getErrorMessage(e), "error");
    }
  };

  const items = media.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Media picker"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-xl bg-white p-5 shadow-xl dark:bg-neutral-900"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Media</h2>
          <button onClick={onClose} aria-label="Close" className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
            ✕
          </button>
        </div>

        <div className="mb-4 flex gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
          {(["upload", "library"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                tab === t
                  ? "flex-1 rounded-md bg-white px-3 py-1.5 text-sm font-medium shadow-sm dark:bg-neutral-700"
                  : "flex-1 rounded-md px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-300"
              }
            >
              {t === "upload" ? "Upload" : "Library"}
            </button>
          ))}
        </div>

        {tab === "upload" ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              void handleFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition " +
              (dragOver
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950"
                : "border-neutral-300 hover:border-indigo-400 dark:border-neutral-700")
            }
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleFiles(e.target.files)}
            />
            {upload.isPending ? (
              <Loader2 className="mb-2 h-8 w-8 animate-spin text-indigo-500" />
            ) : (
              <UploadCloud className="mb-2 h-8 w-8 text-neutral-400" />
            )}
            <p className="text-sm font-medium">
              {upload.isPending ? "Uploading…" : "Drop an image here or click to browse"}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              PNG, JPG, WebP, GIF — max 5 MB
            </p>
          </div>
        ) : (
          <div>
            {media.isLoading ? (
              <p className="py-8 text-center text-sm text-neutral-500">Loading…</p>
            ) : items.length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-500">
                No uploads yet — upload your first image.
              </p>
            ) : (
              <div className="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSelect(item.url)}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-neutral-200 transition hover:ring-2 hover:ring-indigo-500 dark:border-neutral-700"
                    title="Insert image"
                  >
                    <Image
                      src={item.url}
                      alt={item.url}
                      fill
                      sizes="200px"
                      className="object-cover"
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}