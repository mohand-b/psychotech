-- AlterEnum
ALTER TYPE "EnergyLedgerReason" ADD VALUE 'PURCHASE';

-- AlterTable
ALTER TABLE "EnergyLedger" ADD COLUMN "ref" TEXT;
