// prisma/seed.miningSchedule.ts
import { prisma } from "../src/lib/prisma"; // 경로 맞게 확인

async function getActivePolicyId(): Promise<string> {
  const p = await prisma.miningPolicy.findFirst({
    where: { isActive: true },
    select: { id: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!p) {
    throw new Error(
      "No active MiningPolicy found. Create one first (companyUser, mlmReferralPlan, levelBonusPlan 연결 필요)."
    );
  }
  return p.id;
}

async function main() {
  const policyId = await getActivePolicyId();

  // 1) 매 10분마다 (INTERVAL)
  await prisma.miningSchedule.upsert({
    where: { name: "interval_10m" },
    update: {
      isActive: true,
      kind: "INTERVAL",
      intervalMinutes: 10,
      policyId,
      // nextRunAt은 startRun()에서 다시 계산되므로 지금은 생략 가능
    },
    create: {
      name: "interval_10m",
      isActive: true,
      kind: "INTERVAL",
      intervalMinutes: 10,
      policyId,
      nextRunAt: new Date(), // 즉시 1회 실행 원하면 설정
    },
  });

  // 2) 매일 09:30 (DAILY, Asia/Seoul, 매일)
  await prisma.miningSchedule.upsert({
    where: { name: "daily_0930" },
    update: {
      isActive: true,
      kind: "DAILY",
      dailyAtMinutes: 9 * 60,
      timezone: "Asia/Seoul",
      daysOfWeekMask: 127, // 매일
      policyId,
    },
    create: {
      name: "daily_0930",
      isActive: true,
      kind: "DAILY",
      dailyAtMinutes: 9 * 60,
      timezone: "Asia/Seoul",
      daysOfWeekMask: 127,
      policyId,
      nextRunAt: new Date(),
    },
  });

  console.log("MiningSchedule seed completed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
