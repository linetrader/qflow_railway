// scripts/create-admin.ts
/*
  Create or fix the root admin user directly via Prisma (no HTTP calls).

  Fixed credentials (per request):
    username:  admin
    password:  Hoon4621!@
    email:     admin@qflow.com
    name:      admin

  Behavior:
    - Idempotent:
      * If a user with username OR email exists:
        - Ensures self-reference: referrerId = id
        - Logs and exits.
      * Otherwise:
        - Creates User(with self-ref) + UserWallet + UserRewardSummary + UserReferralStats in one transaction.
    - referralCode ensures uniqueness with bounded retries.

  Run:
    npx tsx scripts/create-admin.ts
*/

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const ADMIN_USERNAME = "admin" as const;
const ADMIN_EMAIL = "admin@qflow.com" as const;
const ADMIN_NAME = "admin" as const;
const ADMIN_PASSWORD = "Qflow1234!@" as const;
const BCRYPT_COST = 12 as const;

function generateReferralCode(): string {
  const a = crypto.randomBytes(6).toString("hex");
  const b = Date.now().toString(36);
  return (a + b).toUpperCase();
}

async function ensureUniqueReferralCode(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = generateReferralCode();
    const exists = await prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
    if (!exists) return code;
  }
  throw new Error(
    "Failed to generate unique referralCode after multiple attempts"
  );
}

async function main(): Promise<void> {
  console.log("[INFO] Ensuring admin user (self-referenced) ...");

  // 1) admin 존재 여부 (username OR email)
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ username: ADMIN_USERNAME }, { email: ADMIN_EMAIL }],
    },
    select: { id: true, username: true, email: true, referrerId: true },
  });

  if (existing) {
    // 1-a) 존재하면 self-reference 보정
    if (existing.referrerId !== existing.id) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { referrerId: existing.id },
        select: { id: true },
      });
      console.log(
        `[FIXED] admin self-reference applied: referrerId = id (${existing.id})`
      );
    } else {
      console.log("[EXISTS] admin already self-referenced");
    }
    console.log(
      `[EXISTS] id=${existing.id} username=${ADMIN_USERNAME} email=${ADMIN_EMAIL}`
    );
    return;
  }

  // 2) 없으면 생성 시점부터 self-reference 로 생성
  const ADMIN_ID = crypto.randomUUID(); // 미리 id를 생성하여 referrerId에 동일 값 사용
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_COST);
  const referralCode = await ensureUniqueReferralCode();

  const result = await prisma.$transaction(async (tx) => {
    // 2-a) User 생성 (self-reference: referrerId = ADMIN_ID)
    const user = await tx.user.create({
      data: {
        id: ADMIN_ID,
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        passwordHash,
        referralCode,
        level: 21,
        referrerId: ADMIN_ID, // ✅ 생성 시점부터 자기 자신 참조
      },
      select: { id: true },
    });

    // 2-b) 종속 레코드 생성
    await tx.userWallet.create({ data: { userId: user.id } });
    await tx.userRewardSummary.create({ data: { userId: user.id } });
    await tx.userReferralStats.create({ data: { userId: user.id } });

    return user;
  });

  console.log(
    `[CREATED] admin user id=${result.id} username=${ADMIN_USERNAME} email=${ADMIN_EMAIL} (self-referenced)`
  );
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
