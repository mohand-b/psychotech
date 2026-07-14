-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "trainingOptions" TEXT[] DEFAULT ARRAY[]::TEXT[];
