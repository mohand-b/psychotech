-- CreateEnum
CREATE TYPE "Sector" AS ENUM ('RAILWAY', 'AVIATION', 'SECURITY', 'INDUSTRY', 'HEALTHCARE');

-- CreateEnum
CREATE TYPE "AxisType" AS ENUM ('LOGIC', 'MEMORY', 'VISUAL_DISCRIMINATION', 'REACTIVITY', 'MOTOR_SKILLS');

-- CreateEnum
CREATE TYPE "SessionMode" AS ENUM ('FULL', 'TARGETED', 'TUTORIAL');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('IN_PROGRESS', 'SUSPENDED', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('EASY', 'NORMAL', 'HARD');

-- CreateEnum
CREATE TYPE "ScoreBand" AS ENUM ('EXCELLENT', 'ACCEPTABLE', 'FRAGILE', 'INSUFFICIENT');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'ESSENTIAL', 'UNLIMITED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELED', 'EXPIRED', 'PAST_DUE');

-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "EnergyLedgerReason" AS ENUM ('DAILY_RESET', 'SESSION_SPENT', 'AXIS_SPENT', 'REFUND', 'ADMIN_GRANT');

-- CreateEnum
CREATE TYPE "RecommendationPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "BadgeCategory" AS ENUM ('STREAK', 'PERFORMANCE', 'VOLUME', 'MASTERY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "currentSector" "Sector" NOT NULL DEFAULT 'RAILWAY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "billingPeriod" "BillingPeriod",
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "externalCustomerId" TEXT,
    "externalSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnergyWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 5,
    "capacity" INTEGER NOT NULL DEFAULT 5,
    "lastResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnergyWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnergyLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "EnergyLedgerReason" NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnergyLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "SessionMode" NOT NULL,
    "sector" "Sector" NOT NULL,
    "difficulty" "DifficultyLevel" NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "seed" TEXT NOT NULL,
    "energyCost" INTEGER NOT NULL,
    "currentAxisIndex" INTEGER NOT NULL DEFAULT 0,
    "globalScore" DOUBLE PRECISION,
    "globalBand" "ScoreBand",
    "isAdmissible" BOOLEAN,
    "isEliminated" BOOLEAN,
    "sectorThreshold" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "abandonedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionAxis" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "axis" "AxisType" NOT NULL,
    "order" INTEGER NOT NULL,
    "normalizedScore" DOUBLE PRECISION,
    "band" "ScoreBand",
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "metrics" JSONB,

    CONSTRAINT "SessionAxis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AxisBest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "axis" "AxisType" NOT NULL,
    "bestScore" DOUBLE PRECISION NOT NULL,
    "band" "ScoreBand" NOT NULL,
    "achievedAt" TIMESTAMP(3) NOT NULL,
    "sessionAxisId" TEXT,

    CONSTRAINT "AxisBest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "axis" "AxisType" NOT NULL,
    "priority" "RecommendationPriority" NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Streak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 0,
    "longest" INTEGER NOT NULL DEFAULT 0,
    "lastActivityDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Streak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "BadgeCategory" NOT NULL,
    "icon" TEXT NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectorConfig" (
    "sector" "Sector" NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "admissibilityThreshold" INTEGER NOT NULL,
    "vigilanceThreshold" INTEGER NOT NULL DEFAULT 65,
    "eliminatoryThreshold" INTEGER NOT NULL DEFAULT 55,

    CONSTRAINT "SectorConfig_pkey" PRIMARY KEY ("sector")
);

-- CreateTable
CREATE TABLE "SectorAxisWeight" (
    "id" TEXT NOT NULL,
    "sector" "Sector" NOT NULL,
    "axis" "AxisType" NOT NULL,
    "coefficient" DOUBLE PRECISION NOT NULL,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SectorAxisWeight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EnergyWallet_userId_key" ON "EnergyWallet"("userId");

-- CreateIndex
CREATE INDEX "EnergyLedger_userId_createdAt_idx" ON "EnergyLedger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Session_userId_startedAt_idx" ON "Session"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "Session_userId_status_idx" ON "Session"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SessionAxis_sessionId_axis_key" ON "SessionAxis"("sessionId", "axis");

-- CreateIndex
CREATE UNIQUE INDEX "AxisBest_userId_axis_key" ON "AxisBest"("userId", "axis");

-- CreateIndex
CREATE UNIQUE INDEX "Streak_userId_key" ON "Streak"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_code_key" ON "Badge"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "SectorAxisWeight_sector_axis_key" ON "SectorAxisWeight"("sector", "axis");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyWallet" ADD CONSTRAINT "EnergyWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyLedger" ADD CONSTRAINT "EnergyLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionAxis" ADD CONSTRAINT "SessionAxis_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AxisBest" ADD CONSTRAINT "AxisBest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Streak" ADD CONSTRAINT "Streak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectorAxisWeight" ADD CONSTRAINT "SectorAxisWeight_sector_fkey" FOREIGN KEY ("sector") REFERENCES "SectorConfig"("sector") ON DELETE CASCADE ON UPDATE CASCADE;
