/** Result of a successful media upload — persisted as a MediaItem row. */
export interface UploadResult {
  url: string;
  storagePath: string;
  width?: number;
  height?: number;
  sizeBytes: number;
  mimeType: string;
}

export type StorageProviderId = "cloudinary" | "s3";

/**
 * Contract every storage backend implements. The dispatcher in `index.ts`
 * picks the active provider from the STORAGE_PROVIDER env var.
 */
export interface StorageProvider {
  readonly id: StorageProviderId;
  /** Validates + uploads an image, scoped to the user's folder. */
  upload(file: File, userId: string): Promise<UploadResult>;
  /** Removes the object behind `storagePath` ("not found" is not an error). */
  delete(storagePath: string): Promise<void>;
  /** Public URL for a stored object. */
  getUrl(storagePath: string): string;
}
