// src/worker/level-recalc/level-bonus-purchase.ts
import { Decimal } from "@prisma/client/runtime/library";
import type { Prisma } from "@/generated/prisma";
import { getUplineChainMonotonic } from "@/worker/mining/upline";

/* ─────────────────────────────────────────────────────────────
   PurchaseSplitPolicy 로더 & 계산 유틸
   (구매가 × basePct × levelPct → 레벨보너스 USD 풀)
   ───────────────────────────────────────────────────────────── */

type PurchaseSplit = {
  basePct: Decimal; // 구매가에서 분배 모수 비율(0~100)
  refPct: Decimal; // 참고용(본 파일 미사용)
  centerPct: Decimal; // 참고용(본 파일 미사용)
  levelPct: Decimal; // 레벨 보너스 비율(0~100)
  companyPct: Decimal; // 참고용(본 파일 미사용)
};

function toDec(v: unknown): Decimal {
  if (v instanceof Decimal) return v;
  const s =
    typeof v === "string"
      ? v
      : typeof v === "number"
      ? String(v)
      : (v as { toString: () => string }).toString();
  return new Decimal(s);
}

function inRange01(x: Decimal): boolean {
  return x.gte(0) && x.lte(100);
}

/** 활성 PurchaseSplitPolicy 1건 로딩 (트랜잭션 내 조회) */
async function loadActivePurchaseSplit(
  tx: Prisma.TransactionClient
): Promise<PurchaseSplit | null> {
  const row = await tx.purchaseSplitPolicy.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
    select: {
      basePct: true,
      refPct: true,
      centerPct: true,
      levelPct: true,
      companyPct: true,
    },
  });
  if (!row) return null;

  const split: PurchaseSplit = {
    basePct: toDec(row.basePct),
    refPct: toDec(row.refPct),
    centerPct: toDec(row.centerPct),
    levelPct: toDec(row.levelPct),
    companyPct: toDec(row.companyPct),
  };

  if (
    !inRange01(split.basePct) ||
    !inRange01(split.refPct) ||
    !inRange01(split.centerPct) ||
    !inRange01(split.levelPct) ||
    !inRange01(split.companyPct)
  ) {
    return null;
  }
  return split;
}

/** 구매가(USD) → baseUSD(구매가 × basePct) */
function computeBaseUSD(purchaseUSD: Decimal, split: PurchaseSplit): Decimal {
  if (purchaseUSD.lte(0)) return new Decimal(0);
  return purchaseUSD.mul(split.basePct).div(100);
}

/** baseUSD → level 보너스 풀 USD(baseUSD × levelPct)
 *  ⚠️ 여기서 산출된 levelPoolUSD를 '100%'로 간주하고 하위에서 분배함.
 */
function computeLevelUSD(baseUSD: Decimal, split: PurchaseSplit): Decimal {
  if (baseUSD.lte(0)) return new Decimal(0);
  return baseUSD.mul(split.levelPct).div(100);
}

/* ─────────────────────────────────────────────────────────────
   LevelBonusPlan cap% 로더
   ───────────────────────────────────────────────────────────── */

/** 활성 레벨 보너스 정책에서 cap%(레벨→퍼센트) 맵 로드 */
async function loadActiveLevelBonusThresholds(
  tx: Prisma.TransactionClient
): Promise<Map<number, Decimal>> {
  const plan = await tx.levelBonusPlan.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
    include: { items: true },
  });
  const m = new Map<number, Decimal>();
  if (!plan) return m;
  for (const it of plan.items) {
    const lvl = it.level;
    const pct = toDec(it.percent as unknown);
    m.set(lvl, pct);
  }
  return m;
}

/* ─────────────────────────────────────────────────────────────
   유틸들
   ───────────────────────────────────────────────────────────── */

/** 동일 레벨 연속 블록의 수령자(userId) 나열 */
function contiguousRecipientsAt(
  upline: Array<{ userId: string; level: number }>,
  i: number,
  sourceLevel: number,
  minEligibleLevel: number
): string[] {
  const lvl = upline[i]?.level ?? 0;
  if (lvl < minEligibleLevel || lvl < sourceLevel) return [];
  const recipients: string[] = [];
  for (let k = i; k < upline.length; k++) {
    const nk = upline[k];
    const lk = nk.level ?? 0;
    if (lk !== lvl) break;
    if (lk >= minEligibleLevel && lk >= sourceLevel) {
      recipients.push(nk.userId);
    }
  }
  return recipients;
}

/* ─────────────────────────────────────────────────────────────
   구매금액 기반 레벨 보너스(USDT) 분배 (UserLevelBonus 사용)
   - PurchaseSplitPolicy(basePct/levelPct)로 레벨풀 산출
   - LevelBonusPlan cap% Δ 워터폴 + 동일레벨 연속블록 균등
   - 자격: level >= 1 & level >= sourceLevel
   - **레벨 풀을 100%로 보고 capΔ%를 곱해 분배**
   - **UserWallet.balanceUSDT 증가 + WalletTx 기록 + UserLevelBonus 생성(중복 방지)**
   ───────────────────────────────────────────────────────────── */

export async function distributeLevelBonusForPurchaseUSDT(args: {
  tx: Prisma.TransactionClient;
  sourceUserId: string;
  sourceLevel: number;
  amountUSD: Decimal; // 소스 유저의 구매 총액(USD)
  sourceHistoryId: string; // 단건이면 historyId, 다건이면 agg:<jobId>
  minEligibleLevel?: number; // 기본 1
  runLabel?: string; // 메모 라벨(선택)
}): Promise<void> {
  if (args.amountUSD.lte(0)) return;

  const MIN_LEVEL = args.minEligibleLevel ?? 1;

  // 1) PurchaseSplitPolicy → 레벨 보너스용 USD 풀 계산
  const split = await loadActivePurchaseSplit(args.tx);
  if (!split) return;
  const baseUSD = computeBaseUSD(args.amountUSD, split);
  const levelPoolUSD = computeLevelUSD(baseUSD, split);
  if (levelPoolUSD.lte(0)) return;

  // 2) cap% 테이블 로드
  const thresholds = await loadActiveLevelBonusThresholds(args.tx);
  if (thresholds.size === 0) return;

  // 3) 체인(단조) 로드: child → parent
  const upline = await getUplineChainMonotonic(args.sourceUserId);

  // 4) 워터폴 분배: capΔ% × (레벨 풀)
  let maxCapSoFar = new Decimal(0);

  for (let i = 0; i < upline.length; ) {
    const node = upline[i];
    const lvl = node.level ?? 0;

    if (lvl < MIN_LEVEL || lvl < args.sourceLevel) {
      i++;
      continue;
    }

    const cap = thresholds.get(lvl) ?? new Decimal(0);
    const delta = cap.sub(maxCapSoFar);

    if (delta.gt(0)) {
      const recipients = contiguousRecipientsAt(
        upline,
        i,
        args.sourceLevel,
        MIN_LEVEL
      );
      if (recipients.length > 0) {
        // "레벨 풀"을 100% 기준으로 delta% 만큼 분배
        const portion = levelPoolUSD.mul(delta).div(100);
        if (portion.gt(0)) {
          const each = portion.div(recipients.length);
          if (each.gt(0)) {
            for (const uid of recipients) {
              // 중복지급 방지: 동일 구매(sourceHistoryId)+동일 capLevel+동일 수령자
              const exists = await args.tx.userLevelBonus.findUnique({
                where: {
                  sourceHistoryId_userId_capLevel: {
                    sourceHistoryId: args.sourceHistoryId,
                    userId: uid,
                    capLevel: lvl,
                  },
                },
                select: { id: true },
              });
              if (exists) continue;

              // 메모 구성
              const memo =
                args.runLabel ??
                `LEVEL BONUS (lvl=${lvl}, capΔ=${delta.toString()}%, pool=${levelPoolUSD.toString()}, each=${each.toString()}) [hist=${
                  args.sourceHistoryId
                }]`;

              // 1) 지갑 잔액 증가 (없으면 생성)
              await args.tx.userWallet.upsert({
                where: { userId: uid },
                create: {
                  userId: uid,
                  balanceUSDT: each,
                  balanceQAI: new Decimal(0),
                  balanceDFT: new Decimal(0),
                },
                update: { balanceUSDT: { increment: each } },
              });

              // 2) WalletTx 생성 (DEPOSIT)
              const txRow = await args.tx.walletTx.create({
                data: {
                  userId: uid,
                  tokenCode: "USDT",
                  txType: "DEPOSIT",
                  status: "COMPLETED",
                  amount: each,
                  memo,
                },
                select: { id: true, createdAt: true },
              });

              // 3) UserLevelBonus 생성 (PAID)
              await args.tx.userLevelBonus.create({
                data: {
                  userId: uid,
                  sourceUserId: args.sourceUserId,
                  sourceHistoryId: args.sourceHistoryId,
                  capLevel: lvl,
                  amountUSD: each,
                  status: "PAID",
                  paidWalletTxId: txRow.id,
                  paidAt: txRow.createdAt,
                },
              });
            }
          }
        }
      }
      maxCapSoFar = Decimal.max(maxCapSoFar, cap);
    } else {
      maxCapSoFar = Decimal.max(maxCapSoFar, cap);
    }

    // 같은 레벨 연속 블록 스킵
    let j = i + 1;
    while (j < upline.length && (upline[j].level ?? 0) === lvl) j++;
    i = j;

    if (maxCapSoFar.gte(100)) break;
  }
}
