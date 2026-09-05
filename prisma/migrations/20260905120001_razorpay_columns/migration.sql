-- Migrate existing rows to the new provider (added in the previous migration)
UPDATE "Payment" SET "provider" = 'RAZORPAY' WHERE "provider" = 'STRIPE';

-- New default provider
ALTER TABLE "Payment" ALTER COLUMN "provider" SET DEFAULT 'RAZORPAY';

-- Rename Stripe columns to their Razorpay equivalents
ALTER TABLE "Order" RENAME COLUMN "stripeSessionId" TO "razorpayOrderId";
ALTER TABLE "Order" RENAME COLUMN "stripePaymentIntentId" TO "razorpayPaymentId";
