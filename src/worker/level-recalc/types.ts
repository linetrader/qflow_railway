// src/worker/level-recalc/types.ts
import type { Prisma, PrismaClient } from "@prisma/client";

export type Tx =
  | Omit<
      PrismaClient,
      "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
    >
  | Prisma.TransactionClient;

export enum LevelRequirementKind {
  NODE_AMOUNT_MIN = "NODE_AMOUNT_MIN",
  DIRECT_REFERRAL_COUNT_MIN = "DIRECT_REFERRAL_COUNT_MIN",
  GROUP_SALES_AMOUNT_MIN = "GROUP_SALES_AMOUNT_MIN",
  DIRECT_DOWNLINE_LEVEL_COUNT_MIN = "DIRECT_DOWNLINE_LEVEL_COUNT_MIN",
}
