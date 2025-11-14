// prisma/seed.mining.ts
import { prisma } from "../src/lib/prisma"; // 경로에 맞게 조정
import { Decimal } from "@prisma/client/runtime/library";

// 회사(=정책의 회사 수령자)로 사용할 계정명: 환경변수 우선 → 없으면 "admin"
const COMPANY_USERNAME = process.env.MINING_COMPANY_USERNAME ?? "admin";

async function main() {
  // 1) 회사 계정 = 기존 admin(또는 지정 계정) 반드시 존재해야 함
  const companyUser = await prisma.user.findUnique({
    where: { username: COMPANY_USERNAME },
  });
  if (!companyUser) {
    throw new Error(
      `Company user not found: "${COMPANY_USERNAME}". 먼저 해당 계정을 생성하세요.`
    );
  }

  // 2) MLM 추천수익 플랜 (7/5/3)
  const mlmPlan = await prisma.mlmReferralPlan.upsert({
    where: { name: "Default-MLM-Referral-7-5-3" },
    update: {
      isActive: true,
      levels: {
        deleteMany: {}, // 재시드 시 초기화
        create: [
          { level: 1, percent: new Decimal("5.00") },
          { level: 2, percent: new Decimal("3.00") },
          { level: 3, percent: new Decimal("2.00") },
        ],
      },
    },
    create: {
      name: "Default-MLM-Referral-7-5-3",
      isActive: true,
      levels: {
        create: [
          { level: 1, percent: new Decimal("5.00") },
          { level: 2, percent: new Decimal("3.00") },
          { level: 3, percent: new Decimal("2.00") },
        ],
      },
    },
    include: { levels: true },
  });

  // 3) 레벨 보너스 플랜
  const levelPercents = [0, 30, 50, 65, 75, 83, 90, 96, 100]; // L1..L9
  const levelPlan = await prisma.levelBonusPlan.upsert({
    where: { name: "Default-Level-Bonus-L1-L9" },
    update: {
      isActive: true,
      items: {
        deleteMany: {},
        create: levelPercents.map((p, i) => ({
          level: i + 1,
          percent: new Decimal(p.toFixed(2)),
        })),
      },
    },
    create: {
      name: "Default-Level-Bonus-L1-L9",
      isActive: true,
      items: {
        create: levelPercents.map((p, i) => ({
          level: i + 1,
          percent: new Decimal(p.toFixed(2)),
        })),
      },
    },
    include: { items: true },
  });

  // 4) 마이닝 정책 (회사 10 / 본인 45 / MLM 45) — 회사 계정은 admin 사용
  await prisma.miningPolicy.upsert({
    where: { name: "Default-Policy-10-45-45" },
    update: {
      isActive: true,
      companyPct: new Decimal("10.00"),
      selfPct: new Decimal("45.00"),
      mlmPct: new Decimal("45.00"),
      companyUserId: companyUser.id,
      mlmReferralPlanId: mlmPlan.id,
      levelBonusPlanId: levelPlan.id,
      effectiveTo: null,
    },
    create: {
      name: "Default-Policy-10-45-45",
      isActive: true,
      companyPct: new Decimal("10.00"),
      selfPct: new Decimal("45.00"),
      mlmPct: new Decimal("45.00"),
      companyUserId: companyUser.id,
      mlmReferralPlanId: mlmPlan.id,
      levelBonusPlanId: levelPlan.id,
    },
  });

  // 5) 스케줄 (예: 1분)
  await prisma.miningSchedule.upsert({
    where: { name: "Every-1min" },
    update: {
      isActive: true,
      intervalMinutes: 1,
    },
    create: {
      name: "Every-1min",
      isActive: true,
      intervalMinutes: 1,
      policy: { connect: { name: "Default-Policy-10-45-45" } },
    },
  });

  console.log(
    `Seed complete. Company user: "${COMPANY_USERNAME}" (id=${companyUser.id})`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
