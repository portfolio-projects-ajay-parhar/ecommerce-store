import { imageSize } from "image-size";
import type { StorageProviderId } from "./types";

export const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/** Shared validation for every provider — errors map to 415/413 in /api/media. */
export function assertValidImage(file: File): void {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("File too large (max 5 MB).");
  }
}

/** Server-side dimension extraction; undecodable images get unknown dims. */
export function imageDimensions(buffer: Buffer): {
  width?: number;
  height?: number;
} {
  try {
    const dim = imageSize(buffer);
    return { width: dim.width, height: dim.height };
  } catch {
    return {};
  }
}

/** Chooses an object-key extension from the mime type, falling back to the file name. */
export function extFromType(mimeType: string, fileName: string): string {
  const fromType = mimeType.split("/")[1]?.split(";")[0];
  if (fromType && /^[a-z0-9]{2,5}$/i.test(fromType)) return `.${fromType}`;
  const fromName = fileName.includes(".")
    ? `.${fileName.split(".").pop()}`
    : "";
  return fromName || ".bin";
}

/**
 * Configuration errors intentionally phrase as "not configured" — /api/media
 * maps that to HTTP 503 with a friendly message instead of a bare 500.
 */
export function notConfigured(provider: StorageProviderId, required: string[]) {
  const list = required.join(", ");
  return new Error(
    `${provider} storage is not configured. Set ${list} in your environment.`,
  );
}
