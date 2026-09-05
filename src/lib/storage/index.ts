import { cloudinaryProvider } from "./providers/cloudinary";
import { s3Provider } from "./providers/s3";
import type { StorageProvider, StorageProviderId, UploadResult } from "./types";

export type { StorageProviderId, UploadResult } from "./types";

const PROVIDERS: Record<StorageProviderId, StorageProvider> = {
  cloudinary: cloudinaryProvider,
  s3: s3Provider,
};

/**
 * The active storage backend. "cloudinary" is the default so existing
 * deployments keep working without a STORAGE_PROVIDER value.
 * Configuration errors surface lazily, when a storage operation actually runs.
 */
export function getStorageProviderId(): StorageProviderId {
  const raw = process.env.STORAGE_PROVIDER?.trim().toLowerCase();
  if (!raw) return "cloudinary";
  if (raw in PROVIDERS) return raw as StorageProviderId;
  throw new Error(
    `Storage is not configured: unknown STORAGE_PROVIDER "${raw}". Supported providers: ${Object.keys(PROVIDERS).join(", ")}.`,
  );
}

function getProvider(): StorageProvider {
  return PROVIDERS[getStorageProviderId()];
}

/** Uploads an image via the active storage provider. */
export async function uploadMedia(
  file: File,
  userId: string,
): Promise<UploadResult> {
  return getProvider().upload(file, userId);
}

/** Deletes an object via the active storage provider. */
export async function deleteMedia(storagePath: string): Promise<void> {
  return getProvider().delete(storagePath);
}

/** Public URL for an object stored with the active provider. */
export function getMediaUrl(storagePath: string): string {
  return getProvider().getUrl(storagePath);
}
