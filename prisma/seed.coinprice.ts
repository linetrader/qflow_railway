// prisma/seed.coinprice.ts
import { prisma } from "../src/lib/prisma"; // 경로 맞게 수정

async function main() {
  // 1) 토큰 기본값 시드
  const tokens = [
    { code: "USDT", displayName: "USDT", isActive: true },
    { code: "QAI", displayName: "QAI", isActive: true },
    { code: "DFT", displayName: "DFT", isActive: true },
  ];

  await prisma.$transaction(
    tokens.map((t) =>
      prisma.token.upsert({
        where: { code: t.code },
        create: t,
        update: { displayName: t.displayName, isActive: t.isActive },
      })
    )
  );

  // 2) CoinPrice 초기 데이터
  // Decimal 컬럼은 string 입력을 권장
  await prisma.coinPrice.createMany({
    data: [
      {
        tokenCode: "USDT",
        price: "0",
        withdrawFee: "3",
        createdAt: new Date(),
      },
      {
        tokenCode: "QAI",
        price: "101",
        withdrawFee: "3",
        createdAt: new Date(),
      },
      {
        tokenCode: "DFT",
        price: "0.75",
        withdrawFee: "3",
        createdAt: new Date(),
      },
    ],
    skipDuplicates: true,
  });

  console.log("CoinPrice seed completed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
