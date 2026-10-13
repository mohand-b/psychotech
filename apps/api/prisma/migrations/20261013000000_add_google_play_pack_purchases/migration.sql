-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'GOOGLE_PLAY');

-- AlterEnum
ALTER TYPE "EnergyLedgerReason" ADD VALUE 'PURCHASE_REVOKED';

-- AlterTable
ALTER TABLE "PackPurchase" RENAME COLUMN "checkoutSessionId" TO "paymentRef";
ALTER TABLE "PackPurchase" ADD COLUMN "provider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE';
ALTER TABLE "PackPurchase" ADD COLUMN "revokedAt" TIMESTAMP(3);

-- RenameIndex
ALTER INDEX "PackPurchase_checkoutSessionId_key" RENAME TO "PackPurchase_paymentRef_key";
