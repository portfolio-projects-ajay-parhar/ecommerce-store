import type { NextConfig } from "next";

// Allow the active storage host so <Image> can render provider-stored media.
// Honors S3_PUBLIC_BASE_URL (CDN/custom domain) when set, otherwise the
// virtual-hosted bucket endpoint derived from S3_BUCKET + S3_REGION.
const s3Host = (() => {
  try {
    if (process.env.S3_PUBLIC_BASE_URL) {
      return new URL(process.env.S3_PUBLIC_BASE_URL).hostname;
    }
    if (process.env.S3_BUCKET && process.env.S3_REGION) {
      return `${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com`;
    }
  } catch {
    // invalid URL — fall through, no pattern added
  }
  return null;
})();

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  { protocol: "https", hostname: "res.cloudinary.com" },
  { protocol: "https", hostname: "picsum.photos" },
  { protocol: "https", hostname: "fastly.picsum.photos" },
  { protocol: "https", hostname: "images.unsplash.com" },
];
if (s3Host) {
  remotePatterns.push({ protocol: "https", hostname: s3Host });
}

const nextConfig: NextConfig = {
  images: { remotePatterns },
};

export default nextConfig;
