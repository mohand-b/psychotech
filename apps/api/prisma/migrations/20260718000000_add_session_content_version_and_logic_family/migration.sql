-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "contentVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "logicFamily" TEXT;
