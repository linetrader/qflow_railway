// prisma/seed.referral.ts
import { prisma } from "../src/lib/prisma"; // 경로 맞게 수정

async function main() {
  // 1) 기본 플랜 upsert
  const plan = await prisma.referralPlan.upsert({
    where: { name: "Default Plan" },
    update: { isActive: true },
    create: {
      name: "Default Plan",
      isActive: true,
    },
    select: { id: true, name: true },
  });

  // 2) 레벨 정의(idempotent): 1=5.00%, 2=3.00%, 3=2.00%
  const levels = [
    { level: 1, percent: "5.00" },
    { level: 2, percent: "3.00" },
    { level: 3, percent: "2.00" },
  ];

  for (const lv of levels) {
    await prisma.referralPlanLevel.upsert({
      where: { planId_level: { planId: plan.id, level: lv.level } },
      update: { percent: lv.percent as any },
      create: { planId: plan.id, level: lv.level, percent: lv.percent as any },
    });
  }

  // 3) 모든 패키지 조회 후, 패키지별 플랜 매핑(중복 방지 upsert)
  const packages = await prisma.package.findMany({
    select: { id: true, name: true },
  });
  for (const p of packages) {
    await prisma.packageReferralPlan.upsert({
      where: { packageId: p.id },
      update: { planId: plan.id },
      create: { packageId: p.id, planId: plan.id },
    });
  }

  console.log(
    `Referral plan '${plan.name}' seeded with ${levels.length} levels and mapped to ${packages.length} packages.`
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
