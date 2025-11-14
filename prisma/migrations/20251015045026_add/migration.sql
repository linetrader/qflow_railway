-- CreateEnum
CREATE TYPE "public"."UserLevelBonusStatus" AS ENUM ('PAID');

-- CreateTable
CREATE TABLE "public"."UserLevelBonus" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceUserId" TEXT NOT NULL,
    "sourceHistoryId" TEXT NOT NULL,
    "capLevel" INTEGER NOT NULL,
    "amountUSD" DECIMAL(38,18) NOT NULL,
    "status" "public"."UserLevelBonusStatus" NOT NULL DEFAULT 'PAID',
    "paidWalletTxId" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLevelBonus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ulb_user_ts_id_desc" ON "public"."UserLevelBonus"("userId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ulb_hist_user_level_uk" ON "public"."UserLevelBonus"("sourceHistoryId", "userId", "capLevel");
