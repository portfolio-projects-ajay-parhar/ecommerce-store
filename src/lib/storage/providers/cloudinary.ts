import { randomUUID } from "crypto";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { assertValidImage, imageDimensions, notConfigured } from "../shared";
import type { StorageProvider } from "../types";

/**
 * The Cloudinary SDK is used ONLY for media storage (upload/delete/public URLs).
 * The database is owned by Prisma; auth is owned by NextAuth.
 */

/** Configures the SDK from env or throws a "not configured" error (mapped to 503 by /api/media). */
function requireCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw notConfigured("cloudinary", [
      "CLOUDINARY_CLOUD_NAME",
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET",
    ]);
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export const cloudinaryProvider: StorageProvider = {
  id: "cloudinary",

  async upload(file, userId) {
    assertValidImage(file);
    const buffer = Buffer.from(await file.arrayBuffer());
    const { width, height } = imageDimensions(buffer);

    requireCloudinary();
    const publicId = `${userId}/${randomUUID()}`;
    const result = await new Promise<UploadApiResponse>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "products",
            public_id: publicId,
            resource_type: "image",
          },
          (error, res) => {
            if (error || !res) {
              reject(error ?? new Error("Cloudinary upload failed."));
            } else {
              resolve(res);
            }
          },
        );
        stream.end(buffer);
      },
    );

    return {
      url: result.secure_url,
      // Cloudinary has no explicit extension — the public_id is the handle.
      storagePath: result.public_id,
      width: width ?? result.width,
      height: height ?? result.height,
      sizeBytes: file.size,
      mimeType: file.type,
    };
  },

  async delete(storagePath) {
    requireCloudinary();
    const result = await cloudinary.uploader.destroy(storagePath, {
      resource_type: "image",
    });
    if (result.result !== "ok" && result.result !== "not found") {
      throw new Error(`Cloudinary delete failed: ${result.result}`);
    }
  },

  getUrl(storagePath) {
    requireCloudinary();
    return cloudinary.url(storagePath, { secure: true, type: "upload" });
  },
};