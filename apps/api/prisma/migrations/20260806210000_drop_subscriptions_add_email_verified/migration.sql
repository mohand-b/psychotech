ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

UPDATE "User" SET "emailVerifiedAt" = "createdAt";

DROP TABLE "Subscription";

DROP TYPE "SubscriptionTier";

DROP TYPE "SubscriptionStatus";

DROP TYPE "BillingPeriod";
