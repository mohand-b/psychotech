-- AlterTable
ALTER TABLE "UserBadge" ADD COLUMN     "sessionId" TEXT;

-- CreateIndex
CREATE INDEX "UserBadge_sessionId_idx" ON "UserBadge"("sessionId");
