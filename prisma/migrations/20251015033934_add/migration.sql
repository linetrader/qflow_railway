-- CreateTable
CREATE TABLE "public"."PurchaseSplitPolicy" (
    "id" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "basePct" DECIMAL(5,2) NOT NULL,
    "refPct" DECIMAL(5,2) NOT NULL,
    "centerPct" DECIMAL(5,2) NOT NULL,
    "levelPct" DECIMAL(5,2) NOT NULL,
    "companyPct" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseSplitPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseSplitPolicy_isActive_updatedAt_idx" ON "public"."PurchaseSplitPolicy"("isActive", "updatedAt");
