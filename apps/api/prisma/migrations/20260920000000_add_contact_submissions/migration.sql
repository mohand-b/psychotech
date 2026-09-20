-- CreateEnum
CREATE TYPE "ContactReason" AS ENUM ('QUESTION', 'SUGGESTION', 'BUG_REPORT', 'PAYMENT_ISSUE');

-- CreateEnum
CREATE TYPE "ContactDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "ContactSubmission" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "reason" "ContactReason" NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "subject" TEXT,
    "area" TEXT,
    "location" TEXT,
    "message" TEXT NOT NULL,
    "context" JSONB,
    "sessionId" TEXT,
    "hasScreenshot" BOOLEAN NOT NULL DEFAULT false,
    "supportStatus" "ContactDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "acknowledgementStatus" "ContactDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContactSubmission_number_key" ON "ContactSubmission"("number");

-- CreateIndex
CREATE INDEX "ContactSubmission_createdAt_idx" ON "ContactSubmission"("createdAt");

-- CreateIndex
CREATE INDEX "ContactSubmission_email_idx" ON "ContactSubmission"("email");

-- AddForeignKey
ALTER TABLE "ContactSubmission" ADD CONSTRAINT "ContactSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

