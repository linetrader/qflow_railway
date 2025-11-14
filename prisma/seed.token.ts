// prisma/seed.token.ts
import { prisma } from "../src/lib/prisma"; // 경로 맞게 수정

/**
 * 기본 토큰 시드 세트
 * 필요 시 ENV(TOKENS_JSON) 또는 CLI 인자(--tokens='[{"code":"ABC","displayName":"ABC","isActive":true}]')로 덮어쓸 수 있습니다.
 */
const DEFAULT_TOKENS = [
  { code: "USDT", displayName: "USDT", isActive: true },
  { code: "QAI", displayName: "QAI", isActive: true },
  { code: "DFT", displayName: "DFT", isActive: true },
] as const;

type TokenSeed = { code: string; displayName: string; isActive: boolean };

function parseTokensFromArgsOrEnv(): TokenSeed[] {
  // 1) CLI 인자: --tokens='[{"code":"ABC","displayName":"ABC","isActive":true}]'
  const arg = process.argv.find((s) => s.startsWith("--tokens="));
  if (arg) {
    const json = arg.replace(/^--tokens=/, "");
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) return parsed as TokenSeed[];
    } catch (e) {
      console.warn("Invalid --tokens JSON. Fallback to env/default.", e);
    }
  }

  // 2) ENV: TOKENS_JSON='[{"code":"ABC","displayName":"ABC","isActive":true}]'
  const envJson = process.env.TOKENS_JSON;
  if (envJson) {
    try {
      const parsed = JSON.parse(envJson);
      if (Array.isArray(parsed)) return parsed as TokenSeed[];
    } catch (e) {
      console.warn("Invalid TOKENS_JSON. Fallback to default.", e);
    }
  }

  // 3) 기본값
  return DEFAULT_TOKENS.slice();
}

/**
 * Token 테이블을 idempotent하게 업서트합니다.
 * - 이미 존재하면 displayName/isActive만 갱신
 * - 없으면 생성
 */
export async function seedTokens(custom?: TokenSeed[]) {
  const tokens = custom && custom.length ? custom : parseTokensFromArgsOrEnv();

  await prisma.$transaction(
    tokens.map((t) =>
      prisma.token.upsert({
        where: { code: t.code },
        create: {
          code: t.code,
          displayName: t.displayName,
          isActive: t.isActive,
        },
        update: { displayName: t.displayName, isActive: t.isActive },
      })
    )
  );
  return tokens.map((t) => t.code);
}

// 단독 실행 지원: `tsx prisma/seed.token.ts` 또는
// `tsx prisma/seed.token.ts --tokens='[{"code":"BTC","displayName":"Bitcoin","isActive":true}]'`
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTokens()
    .then((codes) => {
      console.log(`Token seed done for: ${codes.join(", ")}`);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
