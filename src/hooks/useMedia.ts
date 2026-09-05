"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { http, getErrorMessage } from "@/lib/http";
import type { MediaItemDTO, Paginated } from "@/types/api";

/** Uploads a file to /api/media (multipart). */
export function useUploadMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const { data } = await http.post<{ media: MediaItemDTO }>("/media", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data.media;
    },
    onSuccess: (media) => {
      qc.invalidateQueries({ queryKey: ["media"] });
      return media;
    },
    onError: (e) => {
      throw new Error(getErrorMessage(e));
    },
  });
}

/** My uploads, paginated. */
export function useMyMedia() {
  return useInfiniteQuery({
    queryKey: ["media"],
    queryFn: async ({ pageParam }) => {
      const { data } = await http.get<Paginated<MediaItemDTO>>("/media", {
        params: { cursor: pageParam || undefined, take: 20 },
      });
      return data;
    },
    initialPageParam: "",
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useDeleteMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await http.delete(`/media/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["media"] }),
  });
}