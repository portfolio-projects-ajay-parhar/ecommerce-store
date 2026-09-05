import { format, formatDistanceToNow } from "date-fns";

/** Tiny className joiner (no clsx dependency needed). */
export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "";
  return format(new Date(date), "MMM d, yyyy");
}

export function timeAgo(date: Date | string | null | undefined) {
  if (!date) return "";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export const SITE_NAME = "Meridian";

export function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  );
}
