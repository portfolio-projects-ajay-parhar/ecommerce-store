import { prisma } from "@/lib/prisma";
import { ReviewsModeration } from "@/components/admin/ReviewsModeration";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reviews" };

export default async function AdminReviewsPage() {
  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true } },
      product: { select: { name: true, slug: true } },
    },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Reviews moderation</h1>
        <p className="text-sm text-neutral-500">
          HIDDEN reviews are excluded from the public list and from rating aggregates.
        </p>
      </div>
      <ReviewsModeration
        reviews={reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          title: r.title,
          body: r.body,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
          reviewerName: r.user.name,
          productName: r.product.name,
          productSlug: r.product.slug,
        }))}
      />
    </div>
  );
}
