import { randomUUID } from "crypto";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { assertValidImage, extFromType, imageDimensions, notConfigured } from "../shared";
import type { StorageProvider } from "../types";

interface S3Config {
  client: S3Client;
  bucket: string;
  region: string;
  /** Custom domain / CloudFront in front of the bucket (optional). */
  publicBaseUrl?: string;
}

let cachedClient: S3Client | null = null;

function requireConfig(): S3Config {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    throw notConfigured("s3", [
      "S3_BUCKET",
      "S3_REGION",
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
    ]);
  }

  const endpoint = process.env.S3_ENDPOINT;
  if (!cachedClient) {
    cachedClient = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
      // S3-compatible stores (MinIO, R2, …) need path-style addressing
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    });
  }
  return {
    client: cachedClient,
    bucket,
    region,
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL?.replace(/\/+$/, ""),
  };
}

function publicUrl(config: S3Config, key: string): string {
  if (config.publicBaseUrl) return `${config.publicBaseUrl}/${key}`;
  return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;
}

export const s3Provider: StorageProvider = {
  id: "s3",

  async upload(file, userId) {
    assertValidImage(file);
    const buffer = Buffer.from(await file.arrayBuffer());
    const { width, height } = imageDimensions(buffer);

    const config = requireConfig();
    const key = `products/${userId}/${randomUUID()}${extFromType(file.type, file.name)}`;
    await config.client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    return {
      url: publicUrl(config, key),
      // The full object key is the handle for later deletes/URL rebuilds.
      storagePath: key,
      width,
      height,
      sizeBytes: file.size,
      mimeType: file.type,
    };
  },

  async delete(storagePath) {
    const config = requireConfig();
    // Deleting a nonexistent key succeeds in S3 — safe for best-effort cleanup.
    await config.client.send(
      new DeleteObjectCommand({ Bucket: config.bucket, Key: storagePath }),
    );
  },

  getUrl(storagePath) {
    return publicUrl(requireConfig(), storagePath);
  },
};