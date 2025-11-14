// prisma/seed.guard.ts
import { prisma } from "@/lib/prisma";

const ADMIN_USERNAME: string = "admin";
const ADMIN_EMAIL: string = "admin@qflow.com";

/**
 * Exit codes
 * 0: 시드 필요 (admin 미존재) → seed-all.sh 실행
 * 1: 시드 불필요 (admin 존재) → 시드 스킵
 * 2: 가드 실행 오류
 */
async function main(): Promise<void> {
  // create-admin.ts와 동일 기준: username OR email
  const exists = await prisma.user.findFirst({
    where: {
      OR: [{ username: ADMIN_USERNAME }, { email: ADMIN_EMAIL }],
    },
    select: { id: true, username: true, email: true },
  });

  if (exists !== null) {
    console.log(
      `[seed:guard] Admin exists → id=${exists.id}, username=${exists.username}, email=${exists.email}. Skip seeding.`
    );
    await prisma.$disconnect();
    process.exit(1);
    return;
  }

  console.log(
    `[seed:guard] Admin not found (username=${ADMIN_USERNAME}, email=${ADMIN_EMAIL}). Run seeding.`
  );
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (err: unknown): Promise<void> => {
  console.error("[seed:guard] Error:", err);
  await prisma.$disconnect();
  process.exit(2);
});
