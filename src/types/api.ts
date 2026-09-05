import type { MediaItem } from "@prisma/client";

/** Cursor-paginated list response shape used by /api/* endpoints. */
export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

export type MediaItemDTO = Pick<
  MediaItem,
  "id" | "url" | "width" | "height" | "mimeType" | "createdAt"
>;
