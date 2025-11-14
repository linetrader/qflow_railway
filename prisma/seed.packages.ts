// prisma/seed.packages.ts
import { prisma } from "../src/lib/prisma"; // 경로 맞게 조정

async function main() {
  // 1) 예시 패키지 upsert
  const defs = [
    { name: "A 패키지 - 100", price: "100.00", dailyDftAmount: "0.0" },
    { name: "B 패키지 - 500", price: "500.00", dailyDftAmount: "5.0" },
    { name: "C 패키지 - 1000", price: "1000.00", dailyDftAmount: "10.0" },
  ];

  for (const d of defs) {
    await prisma.package.upsert({
      where: { name: d.name },
      update: {
        price: d.price as any,
        dailyDftAmount: d.dailyDftAmount as any,
      },
      create: {
        name: d.name,
        price: d.price as any,
        dailyDftAmount: d.dailyDftAmount as any,
      },
    });
  }

  // 2) Default Plan 조회
  const plan = await prisma.referralPlan.findUnique({
    where: { name: "Default Plan" },
    select: { id: true },
  });
  if (!plan) {
    throw new Error(
      "Default Plan 이 없습니다. 먼저 seed.referral.ts 를 실행하세요."
    );
  }

  // 3) 모든 패키지 → Default Plan 매핑
  const pkgs = await prisma.package.findMany({
    select: { id: true, name: true },
  });
  for (const p of pkgs) {
    await prisma.packageReferralPlan.upsert({
      where: { packageId: p.id },
      update: { planId: plan.id },
      create: { packageId: p.id, planId: plan.id },
    });
  }

  console.log(`Seeded ${pkgs.length} packages and mapped to Default Plan.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
