// prisma/seed-level-policy.ts
import { PrismaClient } from "../src/generated/prisma"; // 프로젝트 경로에 맞춰 조정
const prisma = new PrismaClient();

async function main() {
  const policyName = "Default Level-Up v1";

  // 기존 정책 제거(선택)
  await prisma.levelPolicy.deleteMany({ where: { name: policyName } });

  const policy = await prisma.levelPolicy.create({
    data: {
      name: policyName,
      isActive: true,
      levels: {
        create: [
          // L1: 개인 $100  OR  그룹 $0
          {
            level: 1,
            groups: {
              create: [
                // Group A: 개인매출
                {
                  ordinal: 1,
                  requirements: {
                    create: [{ kind: "NODE_AMOUNT_MIN", amount: "100" }],
                  },
                },
              ],
            },
          },

          // L2: 개인 $1,000  OR  그룹 $10,000
          {
            level: 2,
            groups: {
              create: [
                {
                  ordinal: 1,
                  requirements: {
                    create: [{ kind: "NODE_AMOUNT_MIN", amount: "1000" }],
                  },
                },
                {
                  ordinal: 2,
                  requirements: {
                    create: [
                      { kind: "GROUP_SALES_AMOUNT_MIN", amount: "10000" },
                    ],
                  },
                },
              ],
            },
          },

          // L3: 개인 $5,000  OR  그룹 $100,000
          {
            level: 3,
            groups: {
              create: [
                {
                  ordinal: 1,
                  requirements: {
                    create: [{ kind: "NODE_AMOUNT_MIN", amount: "5000" }],
                  },
                },
                {
                  ordinal: 2,
                  requirements: {
                    create: [
                      { kind: "GROUP_SALES_AMOUNT_MIN", amount: "100000" },
                    ],
                  },
                },
              ],
            },
          },

          // L4: 개인 $10,000  OR  그룹 $300,000
          {
            level: 4,
            groups: {
              create: [
                {
                  ordinal: 1,
                  requirements: {
                    create: [{ kind: "NODE_AMOUNT_MIN", amount: "10000" }],
                  },
                },
                {
                  ordinal: 2,
                  requirements: {
                    create: [
                      { kind: "GROUP_SALES_AMOUNT_MIN", amount: "300000" },
                    ],
                  },
                },
              ],
            },
          },

          // L5: 개인 $100,000  OR  (그룹 $1,000,000 + 직접추천 8 + 직접 하위 L4 2명)
          {
            level: 5,
            groups: {
              create: [
                {
                  ordinal: 1,
                  requirements: {
                    create: [{ kind: "NODE_AMOUNT_MIN", amount: "100000" }],
                  },
                },
                {
                  ordinal: 2,
                  requirements: {
                    create: [
                      { kind: "GROUP_SALES_AMOUNT_MIN", amount: "1000000" },
                      { kind: "DIRECT_REFERRAL_COUNT_MIN", count: 8 },
                      {
                        kind: "DIRECT_DOWNLINE_LEVEL_COUNT_MIN",
                        targetLevel: 4,
                        count: 2,
                      },
                    ],
                  },
                },
              ],
            },
          },

          // L6: 개인 $300,000  OR  (그룹 $5,000,000 + 직접추천 8 + 직접 하위 L5 2명)
          {
            level: 6,
            groups: {
              create: [
                {
                  ordinal: 1,
                  requirements: {
                    create: [{ kind: "NODE_AMOUNT_MIN", amount: "300000" }],
                  },
                },
                {
                  ordinal: 2,
                  requirements: {
                    create: [
                      { kind: "GROUP_SALES_AMOUNT_MIN", amount: "5000000" },
                      { kind: "DIRECT_REFERRAL_COUNT_MIN", count: 8 },
                      {
                        kind: "DIRECT_DOWNLINE_LEVEL_COUNT_MIN",
                        targetLevel: 5,
                        count: 2,
                      },
                    ],
                  },
                },
              ],
            },
          },

          // L7: 개인 $1,000,000  OR  (그룹 $10,000,000 + 직접추천 8 + 직접 하위 L6 2명)
          {
            level: 7,
            groups: {
              create: [
                {
                  ordinal: 1,
                  requirements: {
                    create: [{ kind: "NODE_AMOUNT_MIN", amount: "1000000" }],
                  },
                },
                {
                  ordinal: 2,
                  requirements: {
                    create: [
                      { kind: "GROUP_SALES_AMOUNT_MIN", amount: "10000000" },
                      { kind: "DIRECT_REFERRAL_COUNT_MIN", count: 8 },
                      {
                        kind: "DIRECT_DOWNLINE_LEVEL_COUNT_MIN",
                        targetLevel: 6,
                        count: 2,
                      },
                    ],
                  },
                },
              ],
            },
          },

          // L8: 개인 $5,000,000  OR  (그룹 $50,000,000 + 직접추천 10 + 직접 하위 L7 2명)
          {
            level: 8,
            groups: {
              create: [
                {
                  ordinal: 1,
                  requirements: {
                    create: [{ kind: "NODE_AMOUNT_MIN", amount: "5000000" }],
                  },
                },
                {
                  ordinal: 2,
                  requirements: {
                    create: [
                      { kind: "GROUP_SALES_AMOUNT_MIN", amount: "50000000" },
                      { kind: "DIRECT_REFERRAL_COUNT_MIN", count: 10 },
                      {
                        kind: "DIRECT_DOWNLINE_LEVEL_COUNT_MIN",
                        targetLevel: 7,
                        count: 2,
                      },
                    ],
                  },
                },
              ],
            },
          },

          // L9: 개인 $10,000,000  OR  (그룹 $100,000,000 + 직접추천 15 + 직접 하위 L8 2명)
          {
            level: 9,
            groups: {
              create: [
                {
                  ordinal: 1,
                  requirements: {
                    create: [{ kind: "NODE_AMOUNT_MIN", amount: "10000000" }],
                  },
                },
                {
                  ordinal: 2,
                  requirements: {
                    create: [
                      { kind: "GROUP_SALES_AMOUNT_MIN", amount: "100000000" },
                      { kind: "DIRECT_REFERRAL_COUNT_MIN", count: 15 },
                      {
                        kind: "DIRECT_DOWNLINE_LEVEL_COUNT_MIN",
                        targetLevel: 8,
                        count: 2,
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log("Level policy seeded:", policy.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
