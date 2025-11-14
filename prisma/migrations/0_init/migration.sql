-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."BoardType" AS ENUM ('NOTICE', 'EVENT', 'SUPPORT');

-- CreateEnum
CREATE TYPE "public"."BodyFormat" AS ENUM ('MARKDOWN', 'HTML');

-- CreateEnum
CREATE TYPE "public"."LevelJobStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCEEDED', 'DEAD');

-- CreateEnum
CREATE TYPE "public"."LevelRequirementKind" AS ENUM ('NODE_AMOUNT_MIN', 'DIRECT_REFERRAL_COUNT_MIN', 'GROUP_SALES_AMOUNT_MIN', 'DIRECT_DOWNLINE_LEVEL_COUNT_MIN');

-- CreateEnum
CREATE TYPE "public"."MiningRewardKind" AS ENUM ('SELF', 'COMPANY', 'MLM_REF', 'MLM_LEVEL');

-- CreateEnum
CREATE TYPE "public"."MiningRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."MiningScheduleKind" AS ENUM ('INTERVAL', 'DAILY');

-- CreateEnum
CREATE TYPE "public"."PostVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "public"."ReferralCommissionStatus" AS ENUM ('PENDING', 'ACCRUED', 'CANCELED');

-- CreateEnum
CREATE TYPE "public"."SupportCategory" AS ENUM ('QNA', 'ONE_TO_ONE');

-- CreateEnum
CREATE TYPE "public"."WalletTxStatus" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."WalletTxType" AS ENUM ('DEPOSIT', 'WITHDRAW');

-- CreateEnum
CREATE TYPE "public"."WorkerLogLevel" AS ENUM ('debug', 'info', 'warn', 'error');

-- CreateEnum
CREATE TYPE "public"."WorkerMode" AS ENUM ('once', 'loop');

-- CreateTable
CREATE TABLE "public"."AdminChainConfig" (
    "id" TEXT NOT NULL,
    "rpcUrl" TEXT NOT NULL,
    "usdtAddress" TEXT NOT NULL,
    "dftAddress" TEXT,
    "confirmations" INTEGER NOT NULL DEFAULT 15,
    "scanBatch" INTEGER NOT NULL DEFAULT 2000,
    "bnbMinForSweep" DECIMAL(38,18) NOT NULL DEFAULT 0.001,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "balanceConcurrency" INTEGER NOT NULL DEFAULT 25,
    "balanceLogEveryN" INTEGER NOT NULL DEFAULT 200,
    "sweepIfUsdtGtZero" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminChainConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Attachment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CenterCommission" (
    "id" TEXT NOT NULL,
    "centerUserId" TEXT NOT NULL,
    "sourceHistoryId" TEXT NOT NULL,
    "buyerUserId" TEXT NOT NULL,
    "percent" DECIMAL(5,2) NOT NULL,
    "baseAmount" DECIMAL(38,18) NOT NULL,
    "amount" DECIMAL(38,18) NOT NULL,
    "linkDistance" INTEGER,
    "linkRank" INTEGER,
    "status" "public"."ReferralCommissionStatus" NOT NULL,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CenterCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CenterManager" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "percent" DECIMAL(5,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CenterManager_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CoinPrice" (
    "id" TEXT NOT NULL,
    "tokenCode" TEXT NOT NULL,
    "price" DECIMAL(38,18) NOT NULL,
    "withdrawFee" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoinPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ContactLink" (
    "id" TEXT NOT NULL,
    "typeCode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ContactLinkType" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactLinkType_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "public"."Country" (
    "code" CHAR(2) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "public"."LevelBonusItem" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "percent" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LevelBonusItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LevelBonusPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LevelBonusPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LevelPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LevelPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LevelPolicyLevel" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LevelPolicyLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LevelRecalcJob" (
    "id" BIGSERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "policyId" TEXT,
    "payload" JSONB,
    "status" "public"."LevelJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 10,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "availableUntil" TIMESTAMP(3),
    "pickedAt" TIMESTAMP(3),
    "pickedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "dedupeKey" TEXT,

    CONSTRAINT "LevelRecalcJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LevelRequirement" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "kind" "public"."LevelRequirementKind" NOT NULL,
    "amount" DECIMAL(38,2),
    "count" INTEGER,
    "targetLevel" INTEGER,
    "referralRequireNodeOwned" BOOLEAN DEFAULT false,
    "referralNodeAmountMin" DECIMAL(38,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LevelRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LevelRequirementGroup" (
    "id" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LevelRequirementGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LevelWorkerConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'default',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mode" "public"."WorkerMode" NOT NULL DEFAULT 'loop',
    "workerId" TEXT NOT NULL DEFAULT 'level-worker:dev',
    "intervalMs" INTEGER NOT NULL DEFAULT 10000,
    "burstRuns" INTEGER NOT NULL DEFAULT 1,
    "batchSize" INTEGER NOT NULL DEFAULT 10,
    "fetchLimit" INTEGER NOT NULL DEFAULT 50,
    "stallMs" INTEGER NOT NULL DEFAULT 60000,
    "maxAgeMs" INTEGER NOT NULL DEFAULT 86400000,
    "logLevel" "public"."WorkerLogLevel" NOT NULL DEFAULT 'info',
    "maxChainDepth" INTEGER NOT NULL DEFAULT 200,
    "heartbeatEverySteps" INTEGER NOT NULL DEFAULT 10,
    "rescueGraceSec" INTEGER NOT NULL DEFAULT 300,
    "leaseExpiredError" TEXT NOT NULL DEFAULT 'lease_expired',
    "stopAtUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LevelWorkerConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MiningPayout" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "sourceUserId" TEXT NOT NULL,
    "beneficiaryUserId" TEXT NOT NULL,
    "kind" "public"."MiningRewardKind" NOT NULL,
    "amountDFT" DECIMAL(38,18) NOT NULL,
    "packageId" TEXT,
    "baseDailyDft" DECIMAL(38,18),
    "userNodeQuantity" INTEGER,
    "refLevel" INTEGER,
    "awardLevel" INTEGER,
    "splitCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MiningPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MiningPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyPct" DECIMAL(5,2) NOT NULL,
    "selfPct" DECIMAL(5,2) NOT NULL,
    "mlmPct" DECIMAL(5,2) NOT NULL,
    "companyUserId" TEXT NOT NULL,
    "mlmReferralPlanId" TEXT NOT NULL,
    "levelBonusPlanId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MiningPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MiningRun" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "snapCompanyPct" DECIMAL(5,2) NOT NULL,
    "snapSelfPct" DECIMAL(5,2) NOT NULL,
    "snapMlmPct" DECIMAL(5,2) NOT NULL,
    "snapMlmReferralPlanId" TEXT NOT NULL,
    "snapLevelBonusPlanId" TEXT NOT NULL,
    "status" "public"."MiningRunStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MiningRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MiningSchedule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "kind" "public"."MiningScheduleKind" NOT NULL DEFAULT 'INTERVAL',
    "intervalMinutes" INTEGER,
    "dailyAtMinutes" INTEGER,
    "timezone" TEXT DEFAULT 'Asia/Seoul',
    "daysOfWeekMask" INTEGER DEFAULT 127,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "policyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MiningSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MlmReferralPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MlmReferralPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MlmReferralPlanLevel" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "percent" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MlmReferralPlanLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Package" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(38,18) NOT NULL,
    "dailyDftAmount" DECIMAL(38,18) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PackageReferralPlan" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackageReferralPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Post" (
    "id" TEXT NOT NULL,
    "boardType" "public"."BoardType" NOT NULL,
    "supportCategory" "public"."SupportCategory",
    "authorId" TEXT NOT NULL,
    "visibility" "public"."PostVisibility" NOT NULL DEFAULT 'PUBLIC',
    "title" TEXT NOT NULL,
    "bodyFormat" "public"."BodyFormat" NOT NULL DEFAULT 'HTML',
    "bodyRaw" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "tags" TEXT[],
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "eventStartAt" TIMESTAMP(3),
    "eventEndAt" TIMESTAMP(3),
    "bannerUrl" TEXT,
    "ctaLinkUrl" TEXT,
    "sourceUrl" TEXT,
    "sourceTitle" TEXT,
    "sourceByline" TEXT,
    "sourcePublishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReferralCommission" (
    "id" TEXT NOT NULL,
    "buyerUserId" TEXT NOT NULL,
    "historyId" TEXT NOT NULL,
    "beneficiaryUserId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "percent" DECIMAL(5,2) NOT NULL,
    "baseAmount" DECIMAL(38,18) NOT NULL,
    "commissionUSDT" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "commissionDFT" DECIMAL(38,18) NOT NULL,
    "status" "public"."ReferralCommissionStatus" NOT NULL DEFAULT 'PENDING',
    "rewardHistoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "packageId" TEXT,

    CONSTRAINT "ReferralCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReferralEdge" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "groupNo" INTEGER,
    "position" INTEGER,
    "depth" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReferralGroupSummary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupNo" INTEGER NOT NULL,
    "salesVolume" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "dailyAllowanceDFT" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralGroupSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReferralPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReferralPlanLevel" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "percent" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralPlanLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SupportAssignment" (
    "postId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportAssignment_pkey" PRIMARY KEY ("postId")
);

-- CreateTable
CREATE TABLE "public"."SystemKV" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemKV_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."Token" (
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "countryCode" CHAR(2),
    "referrerId" TEXT NOT NULL,
    "sponsorId" TEXT,
    "referralCode" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "googleOtpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "googleOtpSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserCenterLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "centerUserId" TEXT NOT NULL,
    "distance" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCenterLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserPackage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserPackageHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPackageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserReferralStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalSalesVolume" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "totalDailyAllowanceDFT" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserReferralStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserRewardHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amountDFT" DECIMAL(38,18) NOT NULL,
    "note" TEXT,
    "miningPayoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRewardHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserRewardSummary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalDFT" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "todayDFT" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "yesterdayDFT" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRewardSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "depositAddress" TEXT,
    "withdrawAddress" TEXT,
    "balanceUSDT" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "balanceQAI" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "balanceDFT" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "depositPrivCipher" TEXT,
    "depositPrivIv" TEXT,
    "depositPrivTag" TEXT,
    "depositKeyAlg" TEXT DEFAULT 'aes-256-gcm',
    "depositKeyVersion" INTEGER DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WalletTx" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenCode" TEXT NOT NULL,
    "txType" "public"."WalletTxType" NOT NULL,
    "amount" DECIMAL(38,18) NOT NULL,
    "status" "public"."WalletTxStatus" NOT NULL,
    "memo" TEXT,
    "txHash" TEXT,
    "logIndex" INTEGER,
    "blockNumber" BIGINT,
    "fromAddress" TEXT,
    "toAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTx_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Attachment_postId_idx" ON "public"."Attachment"("postId" ASC);

-- CreateIndex
CREATE INDEX "CenterCommission_buyerUserId_createdAt_idx" ON "public"."CenterCommission"("buyerUserId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "CenterCommission_centerUserId_createdAt_idx" ON "public"."CenterCommission"("centerUserId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CenterCommission_centerUserId_sourceHistoryId_key" ON "public"."CenterCommission"("centerUserId" ASC, "sourceHistoryId" ASC);

-- CreateIndex
CREATE INDEX "CenterCommission_sourceHistoryId_idx" ON "public"."CenterCommission"("sourceHistoryId" ASC);

-- CreateIndex
CREATE INDEX "CenterCommission_status_createdAt_idx" ON "public"."CenterCommission"("status" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "CenterManager_createdAt_idx" ON "public"."CenterManager"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "CenterManager_isActive_effectiveTo_idx" ON "public"."CenterManager"("isActive" ASC, "effectiveTo" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CenterManager_userId_key" ON "public"."CenterManager"("userId" ASC);

-- CreateIndex
CREATE INDEX "CoinPrice_tokenCode_createdAt_idx" ON "public"."CoinPrice"("tokenCode" ASC, "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Comment_authorId_idx" ON "public"."Comment"("authorId" ASC);

-- CreateIndex
CREATE INDEX "Comment_isPrivate_idx" ON "public"."Comment"("isPrivate" ASC);

-- CreateIndex
CREATE INDEX "Comment_postId_createdAt_idx" ON "public"."Comment"("postId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "ContactLink_typeCode_isActive_sortOrder_idx" ON "public"."ContactLink"("typeCode" ASC, "isActive" ASC, "sortOrder" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ContactLink_typeCode_label_key" ON "public"."ContactLink"("typeCode" ASC, "label" ASC);

-- CreateIndex
CREATE INDEX "LevelBonusItem_planId_level_idx" ON "public"."LevelBonusItem"("planId" ASC, "level" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "LevelBonusItem_planId_level_key" ON "public"."LevelBonusItem"("planId" ASC, "level" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "LevelBonusPlan_name_key" ON "public"."LevelBonusPlan"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "LevelPolicy_name_key" ON "public"."LevelPolicy"("name" ASC);

-- CreateIndex
CREATE INDEX "LevelPolicyLevel_policyId_level_idx" ON "public"."LevelPolicyLevel"("policyId" ASC, "level" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "LevelPolicyLevel_policyId_level_key" ON "public"."LevelPolicyLevel"("policyId" ASC, "level" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "LevelRecalcJob_dedupeKey_key" ON "public"."LevelRecalcJob"("dedupeKey" ASC);

-- CreateIndex
CREATE INDEX "LevelRecalcJob_status_scheduledAt_id_idx" ON "public"."LevelRecalcJob"("status" ASC, "scheduledAt" ASC, "id" ASC);

-- CreateIndex
CREATE INDEX "LevelRequirement_groupId_kind_idx" ON "public"."LevelRequirement"("groupId" ASC, "kind" ASC);

-- CreateIndex
CREATE INDEX "LevelRequirementGroup_levelId_ordinal_idx" ON "public"."LevelRequirementGroup"("levelId" ASC, "ordinal" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "LevelWorkerConfig_key_key" ON "public"."LevelWorkerConfig"("key" ASC);

-- CreateIndex
CREATE INDEX "MiningPayout_beneficiaryUserId_createdAt_idx" ON "public"."MiningPayout"("beneficiaryUserId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "MiningPayout_kind_createdAt_idx" ON "public"."MiningPayout"("kind" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "MiningPayout_sourceUserId_createdAt_idx" ON "public"."MiningPayout"("sourceUserId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "MiningPolicy_isActive_effectiveFrom_idx" ON "public"."MiningPolicy"("isActive" ASC, "effectiveFrom" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "MiningPolicy_name_key" ON "public"."MiningPolicy"("name" ASC);

-- CreateIndex
CREATE INDEX "MiningRun_status_createdAt_idx" ON "public"."MiningRun"("status" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "MiningSchedule_isActive_kind_dailyAtMinutes_timezone_idx" ON "public"."MiningSchedule"("isActive" ASC, "kind" ASC, "dailyAtMinutes" ASC, "timezone" ASC);

-- CreateIndex
CREATE INDEX "MiningSchedule_isActive_kind_intervalMinutes_idx" ON "public"."MiningSchedule"("isActive" ASC, "kind" ASC, "intervalMinutes" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "MiningSchedule_name_key" ON "public"."MiningSchedule"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "MlmReferralPlan_name_key" ON "public"."MlmReferralPlan"("name" ASC);

-- CreateIndex
CREATE INDEX "MlmReferralPlanLevel_planId_level_idx" ON "public"."MlmReferralPlanLevel"("planId" ASC, "level" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "MlmReferralPlanLevel_planId_level_key" ON "public"."MlmReferralPlanLevel"("planId" ASC, "level" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Package_name_key" ON "public"."Package"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "PackageReferralPlan_packageId_key" ON "public"."PackageReferralPlan"("packageId" ASC);

-- CreateIndex
CREATE INDEX "PackageReferralPlan_planId_idx" ON "public"."PackageReferralPlan"("planId" ASC);

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "public"."Post"("authorId" ASC);

-- CreateIndex
CREATE INDEX "Post_boardType_isPublished_publishedAt_idx" ON "public"."Post"("boardType" ASC, "isPublished" ASC, "publishedAt" ASC);

-- CreateIndex
CREATE INDEX "Post_sourceUrl_idx" ON "public"."Post"("sourceUrl" ASC);

-- CreateIndex
CREATE INDEX "Post_supportCategory_idx" ON "public"."Post"("supportCategory" ASC);

-- CreateIndex
CREATE INDEX "Post_visibility_idx" ON "public"."Post"("visibility" ASC);

-- CreateIndex
CREATE INDEX "ReferralCommission_beneficiaryUserId_createdAt_idx" ON "public"."ReferralCommission"("beneficiaryUserId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "ReferralCommission_buyerUserId_createdAt_idx" ON "public"."ReferralCommission"("buyerUserId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "ReferralCommission_historyId_idx" ON "public"."ReferralCommission"("historyId" ASC);

-- CreateIndex
CREATE INDEX "ReferralCommission_status_createdAt_idx" ON "public"."ReferralCommission"("status" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "ReferralEdge_childId_idx" ON "public"."ReferralEdge"("childId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ReferralEdge_childId_key" ON "public"."ReferralEdge"("childId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ReferralEdge_parentId_childId_key" ON "public"."ReferralEdge"("parentId" ASC, "childId" ASC);

-- CreateIndex
CREATE INDEX "ReferralEdge_parentId_groupNo_position_idx" ON "public"."ReferralEdge"("parentId" ASC, "groupNo" ASC, "position" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ReferralEdge_parentId_groupNo_position_key" ON "public"."ReferralEdge"("parentId" ASC, "groupNo" ASC, "position" ASC);

-- CreateIndex
CREATE INDEX "ReferralGroupSummary_userId_groupNo_idx" ON "public"."ReferralGroupSummary"("userId" ASC, "groupNo" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ReferralGroupSummary_userId_groupNo_key" ON "public"."ReferralGroupSummary"("userId" ASC, "groupNo" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ReferralPlan_name_key" ON "public"."ReferralPlan"("name" ASC);

-- CreateIndex
CREATE INDEX "ReferralPlanLevel_planId_level_idx" ON "public"."ReferralPlanLevel"("planId" ASC, "level" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ReferralPlanLevel_planId_level_key" ON "public"."ReferralPlanLevel"("planId" ASC, "level" ASC);

-- CreateIndex
CREATE INDEX "SupportAssignment_assigneeId_idx" ON "public"."SupportAssignment"("assigneeId" ASC);

-- CreateIndex
CREATE INDEX "User_countryCode_idx" ON "public"."User"("countryCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "public"."User"("referralCode" ASC);

-- CreateIndex
CREATE INDEX "User_referrerId_idx" ON "public"."User"("referrerId" ASC);

-- CreateIndex
CREATE INDEX "User_sponsorId_idx" ON "public"."User"("sponsorId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username" ASC);

-- CreateIndex
CREATE INDEX "UserCenterLink_centerUserId_idx" ON "public"."UserCenterLink"("centerUserId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserCenterLink_userId_centerUserId_key" ON "public"."UserCenterLink"("userId" ASC, "centerUserId" ASC);

-- CreateIndex
CREATE INDEX "UserCenterLink_userId_distance_rank_idx" ON "public"."UserCenterLink"("userId" ASC, "distance" ASC, "rank" ASC);

-- CreateIndex
CREATE INDEX "UserCenterLink_userId_rank_idx" ON "public"."UserCenterLink"("userId" ASC, "rank" ASC);

-- CreateIndex
CREATE INDEX "UserPackage_packageId_idx" ON "public"."UserPackage"("packageId" ASC);

-- CreateIndex
CREATE INDEX "UserPackage_userId_idx" ON "public"."UserPackage"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserPackage_userId_packageId_key" ON "public"."UserPackage"("userId" ASC, "packageId" ASC);

-- CreateIndex
CREATE INDEX "UserPackageHistory_packageId_createdAt_idx" ON "public"."UserPackageHistory"("packageId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "UserPackageHistory_userId_createdAt_idx" ON "public"."UserPackageHistory"("userId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserReferralStats_userId_key" ON "public"."UserReferralStats"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserRewardHistory_miningPayoutId_key" ON "public"."UserRewardHistory"("miningPayoutId" ASC);

-- CreateIndex
CREATE INDEX "UserRewardHistory_userId_createdAt_idx" ON "public"."UserRewardHistory"("userId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "UserRewardHistory_userId_name_createdAt_idx" ON "public"."UserRewardHistory"("userId" ASC, "name" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserRewardSummary_userId_key" ON "public"."UserRewardSummary"("userId" ASC);

-- CreateIndex
CREATE INDEX "UserWallet_depositAddress_idx" ON "public"."UserWallet"("depositAddress" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserWallet_userId_key" ON "public"."UserWallet"("userId" ASC);

-- CreateIndex
CREATE INDEX "UserWallet_withdrawAddress_idx" ON "public"."UserWallet"("withdrawAddress" ASC);

-- CreateIndex
CREATE INDEX "WalletTx_status_createdAt_idx" ON "public"."WalletTx"("status" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "WalletTx_txHash_logIndex_key" ON "public"."WalletTx"("txHash" ASC, "logIndex" ASC);

-- CreateIndex
CREATE INDEX "WalletTx_userId_createdAt_idx" ON "public"."WalletTx"("userId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "WalletTx_userId_tokenCode_createdAt_idx" ON "public"."WalletTx"("userId" ASC, "tokenCode" ASC, "createdAt" ASC);

-- AddForeignKey
ALTER TABLE "public"."Attachment" ADD CONSTRAINT "Attachment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CenterCommission" ADD CONSTRAINT "CenterCommission_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CenterCommission" ADD CONSTRAINT "CenterCommission_centerUserId_fkey" FOREIGN KEY ("centerUserId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CenterCommission" ADD CONSTRAINT "CenterCommission_sourceHistoryId_fkey" FOREIGN KEY ("sourceHistoryId") REFERENCES "public"."UserPackageHistory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CenterManager" ADD CONSTRAINT "CenterManager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CoinPrice" ADD CONSTRAINT "CoinPrice_tokenCode_fkey" FOREIGN KEY ("tokenCode") REFERENCES "public"."Token"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContactLink" ADD CONSTRAINT "ContactLink_typeCode_fkey" FOREIGN KEY ("typeCode") REFERENCES "public"."ContactLinkType"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LevelBonusItem" ADD CONSTRAINT "LevelBonusItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."LevelBonusPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LevelPolicyLevel" ADD CONSTRAINT "LevelPolicyLevel_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "public"."LevelPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LevelRequirement" ADD CONSTRAINT "LevelRequirement_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."LevelRequirementGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LevelRequirementGroup" ADD CONSTRAINT "LevelRequirementGroup_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "public"."LevelPolicyLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MiningPayout" ADD CONSTRAINT "MiningPayout_beneficiaryUserId_fkey" FOREIGN KEY ("beneficiaryUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MiningPayout" ADD CONSTRAINT "MiningPayout_runId_fkey" FOREIGN KEY ("runId") REFERENCES "public"."MiningRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MiningPayout" ADD CONSTRAINT "MiningPayout_sourceUserId_fkey" FOREIGN KEY ("sourceUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MiningPolicy" ADD CONSTRAINT "MiningPolicy_companyUserId_fkey" FOREIGN KEY ("companyUserId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MiningPolicy" ADD CONSTRAINT "MiningPolicy_levelBonusPlanId_fkey" FOREIGN KEY ("levelBonusPlanId") REFERENCES "public"."LevelBonusPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MiningPolicy" ADD CONSTRAINT "MiningPolicy_mlmReferralPlanId_fkey" FOREIGN KEY ("mlmReferralPlanId") REFERENCES "public"."MlmReferralPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MiningRun" ADD CONSTRAINT "MiningRun_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "public"."MiningPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MiningRun" ADD CONSTRAINT "MiningRun_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."MiningSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MiningSchedule" ADD CONSTRAINT "MiningSchedule_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "public"."MiningPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MlmReferralPlanLevel" ADD CONSTRAINT "MlmReferralPlanLevel_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."MlmReferralPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PackageReferralPlan" ADD CONSTRAINT "PackageReferralPlan_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "public"."Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PackageReferralPlan" ADD CONSTRAINT "PackageReferralPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."ReferralPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReferralCommission" ADD CONSTRAINT "ReferralCommission_beneficiaryUserId_fkey" FOREIGN KEY ("beneficiaryUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReferralCommission" ADD CONSTRAINT "ReferralCommission_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReferralCommission" ADD CONSTRAINT "ReferralCommission_historyId_fkey" FOREIGN KEY ("historyId") REFERENCES "public"."UserPackageHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReferralCommission" ADD CONSTRAINT "ReferralCommission_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "public"."Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReferralCommission" ADD CONSTRAINT "ReferralCommission_rewardHistoryId_fkey" FOREIGN KEY ("rewardHistoryId") REFERENCES "public"."UserRewardHistory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReferralEdge" ADD CONSTRAINT "ReferralEdge_childId_fkey" FOREIGN KEY ("childId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReferralEdge" ADD CONSTRAINT "ReferralEdge_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReferralGroupSummary" ADD CONSTRAINT "ReferralGroupSummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReferralPlanLevel" ADD CONSTRAINT "ReferralPlanLevel_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."ReferralPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SupportAssignment" ADD CONSTRAINT "SupportAssignment_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SupportAssignment" ADD CONSTRAINT "SupportAssignment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "public"."Country"("code") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserCenterLink" ADD CONSTRAINT "UserCenterLink_centerUserId_fkey" FOREIGN KEY ("centerUserId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserCenterLink" ADD CONSTRAINT "UserCenterLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserPackage" ADD CONSTRAINT "UserPackage_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "public"."Package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserPackage" ADD CONSTRAINT "UserPackage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserPackageHistory" ADD CONSTRAINT "UserPackageHistory_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "public"."Package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserPackageHistory" ADD CONSTRAINT "UserPackageHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserReferralStats" ADD CONSTRAINT "UserReferralStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserRewardHistory" ADD CONSTRAINT "UserRewardHistory_miningPayoutId_fkey" FOREIGN KEY ("miningPayoutId") REFERENCES "public"."MiningPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserRewardHistory" ADD CONSTRAINT "UserRewardHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserRewardSummary" ADD CONSTRAINT "UserRewardSummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserWallet" ADD CONSTRAINT "UserWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WalletTx" ADD CONSTRAINT "WalletTx_tokenCode_fkey" FOREIGN KEY ("tokenCode") REFERENCES "public"."Token"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WalletTx" ADD CONSTRAINT "WalletTx_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

