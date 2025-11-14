// prisma/seed.level-worker-config.ts
import { prisma } from "../src/lib/prisma"; // 경로 맞게 유지

async function main() {
  await prisma.levelWorkerConfig.upsert({
    where: { key: "default" },
    update: {
      isActive: true,
      mode: "loop", // enum WorkerMode
      workerId: "level-worker:dev",
      intervalMs: 10_000,
      burstRuns: 1,
      batchSize: 10,
      fetchLimit: 50,
      stallMs: 60_000,
      maxAgeMs: 86_400_000,
      logLevel: "info", // enum WorkerLogLevel

      // ▼ 신규 추가된 런타임 상수들
      maxChainDepth: 200,
      heartbeatEverySteps: 10,
      rescueGraceSec: 300,
      leaseExpiredError: "lease_expired",
    },
    create: {
      key: "default",
      isActive: true,
      mode: "loop",
      workerId: "level-worker:dev",
      intervalMs: 10_000,
      burstRuns: 1,
      batchSize: 10,
      fetchLimit: 50,
      stallMs: 60_000,
      maxAgeMs: 86_400_000,
      logLevel: "info",

      // ▼ 신규 추가된 런타임 상수들
      maxChainDepth: 200,
      heartbeatEverySteps: 10,
      rescueGraceSec: 300,
      leaseExpiredError: "lease_expired",
    },
  });

  console.log("Seeded LevelWorkerConfig (key=default)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
