import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";

/** Read-only star rating; renders halves for fractional averages. */
export function Stars({
  rating,
  size = "sm",
  showValue = false,
  count,
}: {
  rating: number;
  size?: "sm" | "md";
  showValue?: boolean;
  count?: number;
}) {
  const px = size === "md" ? "h-5 w-5" : "h-3.5 w-3.5";
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <span className="inline-flex items-center gap-1" aria-label={`Rated ${rating} out of 5`}>
      <span className="inline-flex text-amber-500">
        {Array.from({ length: full }, (_, i) => (
          <Star key={`f${i}`} className={cn(px, "fill-amber-500")} />
        ))}
        {half && <StarHalf className={cn(px, "fill-amber-500")} />}
        {Array.from({ length: Math.max(0, empty) }, (_, i) => (
          <Star key={`e${i}`} className={cn(px, "text-neutral-300 dark:text-neutral-600")} />
        ))}
      </span>
      {showValue && (
        <span className={cn("text-neutral-500 dark:text-neutral-400", size === "md" ? "text-sm" : "text-xs")}>
          {rating > 0 ? rating.toFixed(1) : "No reviews"}
          {typeof count === "number" && count > 0 ? ` (${count})` : ""}
        </span>
      )}
    </span>
  );
}
